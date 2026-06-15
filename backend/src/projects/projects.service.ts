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

  /** A'zolar (members[].userId) haqiqatan mavjudligini tekshiradi (noto'g'ri ID → FK 500 oldini olish). */
  private async assertMembersExist(members?: { userId: number }[]) {
    await this.assertUsersExist(members?.map((m) => m.userId));
  }

  /** Berilgan foydalanuvchi ID lari mavjudligini tekshiradi (sinovchilar/a'zolar uchun). */
  private async assertUsersExist(userIds?: number[]) {
    if (!userIds?.length) return;
    const ids = [...new Set(userIds.map((x) => Number(x)))];
    const cnt = await this.prisma.user.count({ where: { id: { in: ids } } });
    if (cnt !== ids.length) throw new NotFoundException('Ba\'zi foydalanuvchilar topilmadi');
  }

  /** Visibility: superadmin/admin see all; manager/employee only their team's projects. */
  private visibilityWhere(user: AuthUser) {
    if (['superadmin', 'admin', 'accountant', 'auditor'].includes(user.role)) return {};
    return { members: { some: { userId: user.id } } };
  }

  async findAll(user: AuthUser, q: any) {
    // Member bo'yicha shartlar AND massivida — ko'rinish cheklovi + filtr to'qnashmasligi uchun.
    const and: any[] = [];
    const vis = this.visibilityWhere(user);
    if (vis.members) and.push({ members: vis.members });

    const where: any = { deletedAt: null };
    if (q.search) where.name = { contains: q.search, mode: 'insensitive' };
    if (q.status) where.status = q.status;
    if (q.clientId) where.clientId = Number(q.clientId);
    if (q.typeId) where.typeId = Number(q.typeId);
    // Filtr: menejer / xodim (a'zolik orqali)
    if (q.managerId) and.push({ members: { some: { userId: Number(q.managerId), roleInProject: 'manager' } } });
    if (q.employeeId) and.push({ members: { some: { userId: Number(q.employeeId) } } });
    // Filtr: boshlanish sanasi (createdAt) va muddat (deadline) oralig'i
    if (q.startFrom || q.startTo) {
      where.createdAt = { ...(q.startFrom ? { gte: new Date(q.startFrom) } : {}), ...(q.startTo ? { lte: new Date(q.startTo) } : {}) };
    }
    if (q.deadlineFrom || q.deadlineTo) {
      where.deadline = { ...(q.deadlineFrom ? { gte: new Date(q.deadlineFrom) } : {}), ...(q.deadlineTo ? { lte: new Date(q.deadlineTo) } : {}) };
    }
    if (and.length) where.AND = and;

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
          // Ro'yxat/karta uchun menejer (rol=manager bo'lgan a'zo)
          members: {
            where: { roleInProject: 'manager' },
            take: 1,
            include: { user: { select: { id: true, fullName: true, avatar: true } } },
          },
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
        testers: { include: { user: { select: { id: true, fullName: true, avatar: true } } } },
        documents: true,
        _count: { select: { tasks: true } },
      },
    });
    if (!project) throw new NotFoundException('Loyiha topilmadi');

    const isMember = project.members.some((m) => m.userId === user.id);
    const privileged = ['superadmin', 'admin', 'accountant', 'auditor'].includes(user.role);
    if (!privileged && !isMember) {
      throw new ForbiddenException('Bu loyihani ko\'rishga ruxsatingiz yo\'q');
    }
    return project;
  }

  async create(dto: CreateProjectDto, user: AuthUser, ip?: string) {
    const { members, testerIds, documents, ...rest } = dto;
    await this.assertMembersExist(members);
    await this.assertUsersExist(testerIds);
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
        testers: testerIds?.length
          ? { create: [...new Set(testerIds)].map((id) => ({ userId: Number(id) })) }
          : undefined,
        documents: documents?.length
          ? { create: documents.map((d) => ({ name: d.name, url: d.url })) }
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

    // Muzlatish himoyasi: muzlatilgan loyiha tahrirlanmaydi — faqat muzlatishni yechishga (isFrozen=false) ruxsat.
    if (before.isFrozen && dto.isFrozen !== false) {
      throw new ForbiddenException('Loyiha muzlatilgan — avval muzlatishni yeching');
    }

    const { members, testerIds, documents, ...rest } = dto;
    await this.assertMembersExist(members);
    await this.assertUsersExist(testerIds);
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
    // Replace testers if provided
    if (testerIds) {
      await this.prisma.projectTester.deleteMany({ where: { projectId: id } });
      data.testers = { create: [...new Set(testerIds)].map((uid) => ({ userId: Number(uid) })) };
    }
    // Replace documents if provided
    if (documents) {
      await this.prisma.projectDocument.deleteMany({ where: { projectId: id } });
      data.documents = { create: documents.map((d) => ({ name: d.name, url: d.url })) };
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

    // Loyiha holati o'zgarsa — barcha a'zolarni xabardor qilamiz (masalan "Loyiha to'xtatildi").
    if (dto.status && dto.status !== before.status) {
      for (const m of project.members) {
        if (m.userId === user.id) continue;
        await this.notifications.notify(m.userId, 'project_status', { projectId: id, projectName: project.name, status: project.status });
      }
    }

    await this.audit.record({ userId: user.id, entity: 'Project', entityId: id, action: 'UPDATE', ip, oldValue: { status: before.status, price: before.price }, newValue: { status: project.status, price: project.price } });
    return project;
  }

  /** Payroll rule: completed project -> add share to member balance + ledger (once). Cancelled -> nothing. */
  private async creditSharesOnCompletion(projectId: number, actorId: number) {
    const members = await this.prisma.projectMember.findMany({
      where: { projectId, paidToBalance: false, roleInProject: { not: 'auditor' } }, // Nazoratchi ulush olmaydi
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
    const before = await this.prisma.project.findFirst({ where: { id, deletedAt: null } });
    if (!before) throw new NotFoundException('Loyiha topilmadi');
    // Faqat hali boshlanmagan (rejalashtirilgan) loyihani o'chirish mumkin.
    // Faolga o'tgan loyiha o'chirilmaydi (ish boshlangan — doimiy yozuv).
    if (before.status !== 'planning') {
      throw new ForbiddenException('Faqat rejalashtirilgan loyihani o\'chirish mumkin — faol loyiha o\'chirilmaydi');
    }
    // Soft delete (loyiha konvensiyasi: hard delete yo'q — trash/restore uchun).
    await this.prisma.project.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.record({ userId: user.id, entity: 'Project', entityId: id, action: 'DELETE', ip, oldValue: { name: before.name } });
    return { message: 'Loyiha o\'chirildi' };
  }

  /** O'chirilgan (trash) loyihalar — Chiqindi qutisi jadvali uchun (menejer, sanalar). */
  async trash() {
    const projects = await this.prisma.project.findMany({
      where: { deletedAt: { not: null } },
      include: {
        members: { include: { user: { select: { fullName: true } } } },
        _count: { select: { tasks: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    return projects.map((p) => {
      const mgr = p.members.find((m) => m.roleInProject === 'manager');
      return {
        id: p.id,
        name: p.name,
        manager: mgr?.user?.fullName || '—',
        status: p.status,
        startDate: p.createdAt,
        deadline: p.deadline,
        tasksCount: p._count.tasks,
        deletedAt: p.deletedAt,
      };
    });
  }

  /** Trashdagi loyihani BUTUNLAY o'chirish (qaytarib bo'lmaydi). */
  async hardDelete(id: number, user: AuthUser, ip?: string) {
    if (!['superadmin', 'admin'].includes(user.role)) throw new ForbiddenException('Faqat administrator butunlay o\'chira oladi');
    const project = await this.prisma.project.findFirst({ where: { id, deletedAt: { not: null } } });
    if (!project) throw new NotFoundException('Avval loyihani chiqindiga (trash) o\'tkazing');
    // Cascade'siz ixtiyoriy bog'lanishlarni uzamiz, so'ng RAW DELETE bilan o'chiramiz.
    // ⚠️ prisma.project.delete soft-delete middleware tomonidan update(deletedAt)'ga aylantiriladi —
    // shuning uchun $executeRaw kerak (DB-darajadagi ON DELETE CASCADE tasks/members/testers'ni o'chiradi).
    await this.prisma.$transaction([
      this.prisma.meeting.updateMany({ where: { projectId: id }, data: { projectId: null } }),
      this.prisma.financeRequest.updateMany({ where: { projectId: id }, data: { projectId: null } }),
      this.prisma.clientPayment.updateMany({ where: { projectId: id }, data: { projectId: null } }),
      this.prisma.expense.updateMany({ where: { projectId: id }, data: { projectId: null } }),
      this.prisma.$executeRaw`DELETE FROM projects WHERE id = ${id}`,
    ]);
    await this.audit.record({ userId: user.id, entity: 'Project', entityId: id, action: 'HARD_DELETE', ip, oldValue: { name: project.name } });
    return { message: 'Loyiha butunlay o\'chirildi' };
  }

  /** Trashdagi loyihani tiklash. */
  async restore(id: number, user: AuthUser, ip?: string) {
    const before = await this.prisma.project.findFirst({ where: { id, deletedAt: { not: null } } });
    if (!before) throw new NotFoundException('O\'chirilgan loyiha topilmadi');
    const restored = await this.prisma.project.update({ where: { id }, data: { deletedAt: null } });
    await this.audit.record({ userId: user.id, entity: 'Project', entityId: id, action: 'RESTORE', ip, newValue: { name: before.name } });
    return restored;
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
