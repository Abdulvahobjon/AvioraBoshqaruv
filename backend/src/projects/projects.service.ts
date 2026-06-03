import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CurrenciesService } from '../currencies/currencies.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AuthUser } from '../common/decorators/current-user.decorator';

@Injectable()
export class ProjectsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private currencies: CurrenciesService,
    private notifications: NotificationsService,
  ) {}

  /** Visibility: superadmin/admin see all; manager/employee only their team's projects. */
  private visibilityWhere(user: AuthUser) {
    if (user.role === 'superadmin' || user.role === 'admin' || user.role === 'accountant') return {};
    return { members: { some: { userId: user.id } } };
  }

  async findAll(user: AuthUser, q: any) {
    const where: any = { ...this.visibilityWhere(user) };
    if (q.search) where.name = { contains: q.search, mode: 'insensitive' };
    if (q.status) where.status = q.status;
    if (q.clientId) where.clientId = Number(q.clientId);
    if (q.typeId) where.typeId = Number(q.typeId);

    const page = Number(q.page) || 1;
    const limit = Number(q.limit) || 20;
    // Faqat ruxsat etilgan ustunlar bo'yicha saralash (noto'g'ri ustun Prisma 500 beradi).
    const sortCol = ['name', 'createdAt', 'price', 'deadline', 'status', 'progressPercent'].includes(q.sortBy) ? q.sortBy : 'createdAt';
    const sortDir = q.sortOrder === 'asc' ? 'asc' : 'desc';

    const [items, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        include: {
          type: { select: { id: true, name: true } },
          client: { select: { id: true, name: true } },
          _count: { select: { tasks: true, members: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortCol]: sortDir },
      }),
      this.prisma.project.count({ where }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: number, user: AuthUser) {
    const project = await this.prisma.project.findFirst({
      where: { id },
      include: {
        type: true,
        client: { select: { id: true, name: true, phone: true } },
        creator: { select: { id: true, fullName: true } },
        members: { include: { user: { select: { id: true, fullName: true, avatar: true } } } },
        _count: { select: { tasks: true } },
      },
    });
    if (!project) throw new NotFoundException('Loyiha topilmadi');

    const isMember = project.members.some((m) => m.userId === user.id);
    const privileged = ['superadmin', 'admin', 'accountant'].includes(user.role);
    if (!privileged && !isMember) {
      throw new ForbiddenException('Bu loyihani ko\'rishga ruxsatingiz yo\'q');
    }
    return project;
  }

  async create(dto: CreateProjectDto, user: AuthUser, ip?: string) {
    const { members, ...rest } = dto;
    const project = await this.prisma.project.create({
      data: {
        ...rest,
        price: BigInt(dto.price),
        deadline: dto.deadline ? new Date(dto.deadline) : null,
        createdBy: user.id,
        members: members?.length
          ? {
              create: members.map((m) => ({
                userId: m.userId,
                roleInProject: m.roleInProject,
                shareAmount: BigInt(m.shareAmount),
                shareCurrency: m.shareCurrency || 'UZS',
              })),
            }
          : undefined,
      },
      include: { members: true },
    });
    await this.audit.record({ userId: user.id, entity: 'Project', entityId: project.id, action: 'CREATE', ip, newValue: { name: project.name, price: project.price } });
    // Notify each member they were added to the project
    for (const m of project.members) {
      if (m.userId !== user.id) {
        await this.notifications.notify(m.userId, 'project_added', { projectId: project.id, projectName: project.name });
      }
    }
    return project;
  }

  async update(id: number, dto: UpdateProjectDto, user: AuthUser, ip?: string) {
    const before = await this.prisma.project.findFirst({ where: { id }, include: { members: true } });
    if (!before) throw new NotFoundException('Loyiha topilmadi');

    const { members, ...rest } = dto;
    const data: any = { ...rest };
    if (dto.price !== undefined) data.price = BigInt(dto.price);
    if (dto.deadline !== undefined) data.deadline = dto.deadline ? new Date(dto.deadline) : null;

    // Replace members if provided
    if (members) {
      await this.prisma.projectMember.deleteMany({ where: { projectId: id } });
      data.members = {
        create: members.map((m) => ({
          userId: m.userId,
          roleInProject: m.roleInProject,
          shareAmount: BigInt(m.shareAmount),
          shareCurrency: m.shareCurrency || 'UZS',
        })),
      };
    }

    const project = await this.prisma.project.update({ where: { id }, data, include: { members: true } });

    // When project is completed -> credit each member's share to balance (once).
    if (dto.status === 'completed' && before.status !== 'completed') {
      await this.creditSharesOnCompletion(id, user.id);
    }

    // Notify members newly added in this update
    if (members) {
      const beforeIds = new Set(before.members.map((m) => m.userId));
      for (const m of project.members) {
        if (!beforeIds.has(m.userId) && m.userId !== user.id) {
          await this.notifications.notify(m.userId, 'project_added', { projectId: id, projectName: project.name });
        }
      }
    }

    await this.audit.record({ userId: user.id, entity: 'Project', entityId: id, action: 'UPDATE', ip, oldValue: { status: before.status, price: before.price }, newValue: { status: project.status, price: project.price } });
    return project;
  }

  /** Payroll rule: completed project -> add share to member balance + ledger (once). Cancelled -> nothing. */
  private async creditSharesOnCompletion(projectId: number, actorId: number) {
    const members = await this.prisma.projectMember.findMany({
      where: { projectId, paidToBalance: false },
    });
    for (const m of members) {
      const uzs = await this.currencies.toUzs(m.shareAmount, m.shareCurrency);
      await this.prisma.$transaction(async (tx) => {
        // Atomik "claim": ulushni faqat hali to'lanmagan bo'lsagina belgilab olamiz.
        // Parallel ikkita "completed" o'tkazish bir a'zoni ikki marta kreditlamasligini kafolatlaydi.
        const claim = await tx.projectMember.updateMany({
          where: { id: m.id, paidToBalance: false },
          data: { paidToBalance: true },
        });
        if (claim.count === 0) return; // boshqa so'rov allaqachon kreditlagan
        await tx.user.update({ where: { id: m.userId }, data: { balance: { increment: uzs } } });
        await tx.ledgerEntry.create({
          data: {
            userId: m.userId,
            amount: uzs,
            type: 'project_share',
            direction: 'credit',
            note: `Loyiha ulushi (project #${projectId})`,
          },
        });
      });
    }
  }

  async remove(id: number, user: AuthUser, ip?: string) {
    const before = await this.prisma.project.findFirst({ where: { id } });
    if (!before) throw new NotFoundException('Loyiha topilmadi');
    await this.prisma.project.delete({ where: { id } });
    await this.audit.record({ userId: user.id, entity: 'Project', entityId: id, action: 'DELETE', ip, oldValue: { name: before.name } });
    return { message: 'Loyiha o\'chirildi' };
  }

  /** Recompute progress from task completion (called by tasks module). */
  async recomputeProgress(projectId: number) {
    const tasks = await this.prisma.task.findMany({ where: { projectId }, select: { status: true } });
    if (!tasks.length) return;
    const doneStatuses = ['done', 'checked', 'production'];
    const done = tasks.filter((t) => doneStatuses.includes(t.status)).length;
    const percent = Math.round((done / tasks.length) * 100);
    await this.prisma.project.update({ where: { id: projectId }, data: { progressPercent: percent } });
  }
}
