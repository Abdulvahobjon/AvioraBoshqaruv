import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ProjectsService } from '../projects/projects.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { ChangeStatusDto, ReviewTaskDto, CreateCommentDto } from './dto/task-actions.dto';

const PRIVILEGED = ['superadmin', 'admin', 'manager'];
// Hamma loyiha/vazifani ko'ra oladigan rollar (read-only nazorat).
const ALL_VISIBLE = ['superadmin', 'admin', 'accountant', 'auditor'];

@Injectable()
export class TasksService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private projects: ProjectsService,
    private notifications: NotificationsService,
  ) {}

  private taskInclude = {
    assignee: { select: { id: true, fullName: true, avatar: true, position: { select: { name: true } } } },
    creator: { select: { id: true, fullName: true } },
    position: { select: { id: true, name: true } },
    project: { select: { id: true, name: true, code: true } },
    _count: { select: { comments: true, files: true } },
  };

  /** Ensure the user can access this project (member or privileged). Returns membership info. */
  private async assertProjectAccess(projectId: number, user: AuthUser) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId },
      include: { members: { select: { userId: true } } },
    });
    if (!project) throw new NotFoundException('Loyiha topilmadi');
    const isMember = project.members.some((m) => m.userId === user.id);
    const privileged = ALL_VISIBLE.includes(user.role);
    if (!privileged && !isMember) throw new ForbiddenException('Loyihaga ruxsatingiz yo\'q');
    return { project, isMember };
  }

  /**
   * Tekshiruv (Ishga tushirilgan → Tekshirilgan/Rad etilgan) ruxsati:
   * admin/superadmin YOKI loyihaga 'tekshiruvchi' (auditor) sifatida biriktirilgan a'zo.
   * Loyiha menejeri tekshira olmaydi.
   */
  private async assertReviewer(projectId: number, user: AuthUser) {
    if (['superadmin', 'admin'].includes(user.role)) return;
    const member = await this.prisma.projectMember.findFirst({
      where: { projectId, userId: user.id, roleInProject: 'auditor' },
    });
    if (!member) {
      throw new ForbiddenException('Tekshiruvni faqat loyihaning tekshiruvchisi yoki admin bajaradi');
    }
  }

  /** Joriy foydalanuvchi shu vazifani tekshira oladimi? (frontend tugmalari uchun) */
  private async canReview(task: { projectId: number; status: string }, user: AuthUser) {
    if (user.role === 'superadmin') return true; // hammasi ochiq
    if (task.status !== 'production') return false;
    if (user.role === 'admin') return true;
    const member = await this.prisma.projectMember.findFirst({
      where: { projectId: task.projectId, userId: user.id, roleInProject: 'auditor' },
      select: { id: true },
    });
    return !!member;
  }

  /** Visibility filter: employees see only their own; managers see their projects' tasks; admins all. */
  private visibilityWhere(user: AuthUser) {
    if (ALL_VISIBLE.includes(user.role)) return {};
    if (user.role === 'manager') return { project: { members: { some: { userId: user.id } } } };
    return { assigneeId: user.id }; // employee
  }

  /** Build a where clause from query filters (shared by board + table). */
  private buildWhere(user: AuthUser, q: any) {
    const where: any = { ...this.visibilityWhere(user) };
    if (q.projectId) where.projectId = Number(q.projectId);
    if (q.assigneeId) where.assigneeId = Number(q.assigneeId);
    if (q.createdBy) where.createdBy = Number(q.createdBy);
    if (q.status) where.status = q.status;
    if (q.priority) where.priority = q.priority;
    if (q.type) where.type = q.type;
    if (q.mine === 'true' || q.mine === true) where.assigneeId = user.id;
    if (q.search) {
      where.OR = [
        { title: { contains: q.search, mode: 'insensitive' } },
        { uid: { contains: q.search, mode: 'insensitive' } },
      ];
    }
    if (q.from || q.to) {
      where.deadline = {};
      if (q.from) where.deadline.gte = new Date(q.from);
      if (q.to) where.deadline.lte = new Date(q.to);
    }
    return where;
  }

  /**
   * actualMinutes hisoblash: 'in_progress' ga o'tganda inProgressAt belgilanadi;
   * 'in_progress' dan chiqqanda o'tgan vaqt actualMinutes'ga qo'shiladi (TZ — backendda hisoblanadi).
   */
  private trackTime(task: { status: string; inProgressAt: Date | null; actualMinutes: number | null }, newStatus: string) {
    const data: any = {};
    if (newStatus === task.status) return data;
    const now = new Date();
    if (newStatus === 'in_progress') {
      data.inProgressAt = now;
    } else if (task.status === 'in_progress') {
      if (task.inProgressAt) {
        const mins = Math.round((now.getTime() - new Date(task.inProgressAt).getTime()) / 60000);
        data.actualMinutes = (task.actualMinutes || 0) + Math.max(0, mins);
      }
      data.inProgressAt = null;
    }
    return data;
  }

  private withOverdue(tasks: any[]) {
    const now = Date.now();
    return tasks.map((t) => ({
      ...t,
      isOverdue: !!t.deadline && new Date(t.deadline).getTime() < now && !['done', 'checked', 'production'].includes(t.status),
    }));
  }

  /** Kanban board: all visible tasks (optionally filtered), grouped on the client by status. */
  async board(user: AuthUser, q: any = {}) {
    const where = this.buildWhere(user, q);
    const tasks = await this.prisma.task.findMany({
      where,
      include: this.taskInclude,
      orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }],
    });
    return this.withOverdue(tasks);
  }

  /** Table view: paginated list with filters. */
  async findAll(user: AuthUser, q: any = {}) {
    const where = this.buildWhere(user, q);
    const page = Number(q.page) || 1;
    const limit = Number(q.limit) || 20;
    const [items, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        include: this.taskInclude,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.task.count({ where }),
    ]);
    return { items: this.withOverdue(items), total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: number, user: AuthUser) {
    const task = await this.prisma.task.findFirst({
      where: { id },
      include: {
        ...this.taskInclude,
        project: { select: { id: true, name: true } },
        comments: { include: { user: { select: { id: true, fullName: true, avatar: true } } }, orderBy: { createdAt: 'asc' } },
        files: { include: { uploader: { select: { id: true, fullName: true } } }, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!task) throw new NotFoundException('Vazifa topilmadi');
    await this.assertProjectAccess(task.projectId, user);
    if (user.role === 'employee' && task.assigneeId !== user.id) {
      throw new ForbiddenException('Bu vazifa sizga biriktirilmagan');
    }
    // Joriy foydalanuvchi shu vazifani tekshira oladimi (Ishga tushirilgan + tekshiruvchi/admin).
    const canReview = await this.canReview(task, user);
    return { ...task, canReview };
  }

  /** Generate a task UID like "CRM-T-0001" from the project code (or derived prefix). */
  private async generateUid(projectId: number): Promise<string> {
    const project = await this.prisma.project.findFirst({ where: { id: projectId }, select: { code: true, name: true } });
    let prefix = 'GEN';
    if (project?.code) prefix = project.code.toUpperCase();
    else if (project?.name) prefix = project.name.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'GEN';
    const count = await this.prisma.task.count({ where: { uid: { startsWith: `${prefix}-T-` } } });
    return `${prefix}-T-${String(count + 1).padStart(4, '0')}`;
  }

  async create(dto: CreateTaskDto, user: AuthUser, ip?: string) {
    if (!PRIVILEGED.includes(user.role)) throw new ForbiddenException('Vazifa yaratishga ruxsatingiz yo\'q');
    const { project } = await this.assertProjectAccess(dto.projectId, user);
    if (project.isFrozen) throw new ForbiddenException('Loyiha muzlatilgan — yangi vazifa qo\'shib bo\'lmaydi');
    // Faqat faol (yoki kechikkan — davom etayotgan) loyihaga vazifa qo'shiladi.
    // Rejalashtirilgan loyiha avval faolga o'tkazilishi kerak.
    if (!['active', 'overdue'].includes(project.status)) {
      throw new ForbiddenException('Faqat faol loyihaga vazifa qo\'shiladi — avval loyihani "Faol" holatiga o\'tkazing');
    }

    const baseData = {
      projectId: dto.projectId,
      title: dto.title,
      description: dto.description,
      assigneeId: dto.assigneeId ?? null,
      createdBy: user.id,
      status: dto.status ?? 'todo',
      priority: dto.priority ?? 'medium',
      type: dto.type ?? 'feature',
      positionId: dto.positionId ?? null,
      sprint: dto.sprint ?? null,
      price: BigInt(dto.price ?? 0),
      penaltyPercent: dto.penaltyPercent ?? null,
      deadline: dto.deadline ? new Date(dto.deadline) : null,
      estimatedMinutes: dto.estimatedMinutes ?? null,
    };

    // UID `count+1` asosida — parallel yaratishda to'qnashuv bo'lishi mumkin.
    // Unique buzilsa (P2002) UID qayta hisoblanib qayta urinamiz.
    let task;
    for (let attempt = 0; ; attempt++) {
      try {
        const uid = await this.generateUid(dto.projectId);
        task = await this.prisma.task.create({ data: { uid, ...baseData }, include: this.taskInclude });
        break;
      } catch (e: any) {
        if (e?.code === 'P2002' && attempt < 5) continue;
        throw e;
      }
    }

    await this.projects.recomputeProgress(dto.projectId);
    await this.audit.record({ userId: user.id, entity: 'Task', entityId: task.id, action: 'CREATE', ip, newValue: { title: task.title } });
    if (task.assigneeId) {
      await this.notifications.notify(task.assigneeId, 'task_assigned', { taskId: task.id, title: task.title });
    }
    return task;
  }

  async update(id: number, dto: UpdateTaskDto, user: AuthUser, ip?: string) {
    const existing = await this.prisma.task.findFirst({ where: { id } });
    if (!existing) throw new NotFoundException('Vazifa topilmadi');
    if (!PRIVILEGED.includes(user.role)) throw new ForbiddenException('Tahrirlashga ruxsatingiz yo\'q');
    await this.assertProjectAccess(existing.projectId, user);

    const prevAssignee = existing.assigneeId;
    // Faqat ruxsat etilgan maydonlar (projectId/uid/createdBy kabilar yozilmaydi).
    const data: any = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.assigneeId !== undefined) data.assigneeId = dto.assigneeId;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.priority !== undefined) data.priority = dto.priority;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.positionId !== undefined) data.positionId = dto.positionId;
    if (dto.estimatedMinutes !== undefined) data.estimatedMinutes = dto.estimatedMinutes;
    if (dto.sprint !== undefined) data.sprint = dto.sprint;
    if (dto.penaltyPercent !== undefined) data.penaltyPercent = dto.penaltyPercent;
    if (dto.deadline !== undefined) data.deadline = dto.deadline ? new Date(dto.deadline) : null;
    if (dto.price !== undefined) data.price = BigInt(dto.price);

    // Muddati o'tgan (overdue) vazifaning muddati kelajakka cho'zilsa — avtomatik "Jarayonda"ga qaytadi.
    if (existing.status === 'overdue' && data.deadline instanceof Date && data.deadline.getTime() > Date.now()) {
      data.status = 'in_progress';
      Object.assign(data, this.trackTime(existing, 'in_progress'));
    }

    const task = await this.prisma.task.update({ where: { id }, data, include: this.taskInclude });
    await this.audit.record({ userId: user.id, entity: 'Task', entityId: id, action: 'UPDATE', ip });
    if (task.assigneeId && task.assigneeId !== prevAssignee) {
      await this.notifications.notify(task.assigneeId, 'task_assigned', { taskId: task.id, title: task.title });
    }
    return task;
  }

  /** Drag&drop: change column (status) and/or order. */
  async changeStatus(id: number, dto: ChangeStatusDto, user: AuthUser, ip?: string) {
    const task = await this.prisma.task.findFirst({ where: { id } });
    if (!task) throw new NotFoundException('Vazifa topilmadi');
    await this.assertProjectAccess(task.projectId, user);

    // Employee: only own tasks. checked/rejected pipeline'da yo'q — review orqali hal bo'ladi.
    if (user.role === 'employee' && task.assigneeId !== user.id) {
      throw new ForbiddenException('Bu vazifa sizga biriktirilmagan');
    }

    // Kanban statusi faqat BITTADAN OLDINGA siljiydi: todo→in_progress→done→production.
    // 'checked'/'rejected' faqat review (Ishga tushirilgan ustunida) orqali, 'overdue' avtomatik.
    // Sakrash (masalan todo→done) va orqaga qaytarish taqiqlangan.
    // Superadmin — hammasi ochiq: istalgan statusga erkin o'tkazadi.
    if (user.role !== 'superadmin' && dto.status !== task.status) {
      const PIPELINE = ['todo', 'in_progress', 'done', 'production'];
      const to = PIPELINE.indexOf(dto.status);
      const from = PIPELINE.indexOf(task.status);
      if (to === -1 || to !== from + 1) {
        throw new BadRequestException('Statusni faqat bittadan keyingi bosqichga siljitish mumkin');
      }
    }

    const updated = await this.prisma.task.update({
      where: { id },
      data: { status: dto.status, orderIndex: dto.orderIndex ?? task.orderIndex, ...this.trackTime(task, dto.status) },
      include: this.taskInclude,
    });

    await this.projects.recomputeProgress(task.projectId);
    // Status o'zgarsa assignee'ni xabardor qilamiz (o'zi o'zgartirgan bo'lsa — shart emas).
    if (dto.status !== task.status && updated.assigneeId && updated.assigneeId !== user.id) {
      await this.notifications.notify(updated.assigneeId, 'task_status', { taskId: id, title: updated.title, status: dto.status });
    }
    await this.audit.record({ userId: user.id, entity: 'Task', entityId: id, action: 'STATUS', ip, oldValue: { status: task.status }, newValue: { status: dto.status } });
    return updated;
  }

  /**
   * Manager/Admin review of a task.
   * verdict=checked -> status 'checked'.
   * verdict=rejected -> comment MANDATORY, status auto-returns to 'in_progress', reopened_count++.
   */
  async review(id: number, dto: ReviewTaskDto, user: AuthUser, ip?: string) {
    const task = await this.prisma.task.findFirst({ where: { id } });
    if (!task) throw new NotFoundException('Vazifa topilmadi');
    // Faqat "Ishga tushirilgan" (production) vazifani tekshirish mumkin (superadmin'ga ochiq).
    if (user.role !== 'superadmin' && task.status !== 'production') {
      throw new BadRequestException('Faqat "Ishga tushirilgan" vazifani tekshirish mumkin');
    }
    // Ruxsat: admin/superadmin yoki loyihaning tekshiruvchisi (auditor a'zosi).
    await this.assertReviewer(task.projectId, user);

    if (dto.verdict === 'rejected') {
      if (!dto.comment?.trim()) throw new BadRequestException('Rad etishda izoh majburiy');
      await this.prisma.taskComment.create({ data: { taskId: id, userId: user.id, body: dto.comment.trim() } });
      const updated = await this.prisma.task.update({
        where: { id },
        // Rad etilgan vazifa to'g'ridan-to'g'ri "Jarayonda"ga qaytadi va sikl (reopenedCount) oshadi.
        data: {
          status: 'in_progress',
          reopenedCount: { increment: 1 },
          rejectReason: dto.comment.trim(),
          rejectPhotoUrl: dto.photoUrl || null,
          ...this.trackTime(task, 'in_progress'),
        },
        include: this.taskInclude,
      });
      await this.projects.recomputeProgress(task.projectId);
      await this.audit.record({ userId: user.id, entity: 'Task', entityId: id, action: 'REJECT', ip, newValue: { reason: dto.comment } });
      if (task.assigneeId) {
        await this.notifications.notify(task.assigneeId, 'task_rejected', { taskId: id, title: task.title, reason: dto.comment });
      }
      return updated;
    }

    // checked
    const updated = await this.prisma.task.update({
      where: { id },
      data: { status: 'checked' },
      include: this.taskInclude,
    });
    await this.projects.recomputeProgress(task.projectId);
    await this.audit.record({ userId: user.id, entity: 'Task', entityId: id, action: 'CHECK', ip });
    if (task.assigneeId) {
      await this.notifications.notify(task.assigneeId, 'task_checked', { taskId: id, title: task.title });
    }
    return updated;
  }

  async addComment(id: number, dto: CreateCommentDto, user: AuthUser) {
    const task = await this.prisma.task.findFirst({ where: { id } });
    if (!task) throw new NotFoundException('Vazifa topilmadi');
    await this.assertProjectAccess(task.projectId, user);
    // IDOR: oddiy xodim faqat o'ziga biriktirilgan vazifaga izoh yoza oladi.
    if (user.role === 'employee' && task.assigneeId !== user.id) {
      throw new ForbiddenException('Bu vazifa sizga biriktirilmagan');
    }
    return this.prisma.taskComment.create({
      data: { taskId: id, userId: user.id, body: dto.body },
      include: { user: { select: { id: true, fullName: true, avatar: true } } },
    });
  }

  async addFile(id: number, file: { filename: string; originalname: string }, user: AuthUser) {
    const task = await this.prisma.task.findFirst({ where: { id } });
    if (!task) throw new NotFoundException('Vazifa topilmadi');
    await this.assertProjectAccess(task.projectId, user);
    // IDOR: oddiy xodim faqat o'ziga biriktirilgan vazifaga fayl qo'sha oladi.
    if (user.role === 'employee' && task.assigneeId !== user.id) {
      throw new ForbiddenException('Bu vazifa sizga biriktirilmagan');
    }
    return this.prisma.taskFile.create({
      data: {
        taskId: id,
        fileUrl: `/uploads/${file.filename}`,
        fileName: file.originalname,
        uploadedBy: user.id,
      },
    });
  }

  async remove(id: number, user: AuthUser, ip?: string) {
    const task = await this.prisma.task.findFirst({ where: { id } });
    if (!task) throw new NotFoundException('Vazifa topilmadi');
    if (!PRIVILEGED.includes(user.role)) throw new ForbiddenException('O\'chirishga ruxsatingiz yo\'q');
    await this.assertProjectAccess(task.projectId, user);
    await this.prisma.task.delete({ where: { id } });
    await this.projects.recomputeProgress(task.projectId);
    await this.audit.record({ userId: user.id, entity: 'Task', entityId: id, action: 'DELETE', ip, oldValue: { title: task.title } });
    return { message: 'Vazifa o\'chirildi' };
  }

  /** O'chirilgan (trash) vazifalar — ko'rinish filtri bilan. */
  trash(user: AuthUser) {
    const where: any = { deletedAt: { not: null }, ...this.visibilityWhere(user) };
    return this.prisma.task.findMany({ where, include: this.taskInclude, orderBy: { updatedAt: 'desc' } });
  }

  /** Trashdagi vazifani tiklash. */
  async restore(id: number, user: AuthUser, ip?: string) {
    if (!PRIVILEGED.includes(user.role)) throw new ForbiddenException('Tiklashga ruxsatingiz yo\'q');
    const task = await this.prisma.task.findFirst({ where: { id, deletedAt: { not: null } } });
    if (!task) throw new NotFoundException('O\'chirilgan vazifa topilmadi');
    await this.assertProjectAccess(task.projectId, user);
    const restored = await this.prisma.task.update({ where: { id }, data: { deletedAt: null }, include: this.taskInclude });
    await this.projects.recomputeProgress(task.projectId);
    await this.audit.record({ userId: user.id, entity: 'Task', entityId: id, action: 'RESTORE', ip, newValue: { title: task.title } });
    return restored;
  }

  /** Butunlay o'chirish (faqat admin, avval trashda bo'lishi shart). */
  async hardDelete(id: number, user: AuthUser, ip?: string) {
    if (!['superadmin', 'admin'].includes(user.role)) throw new ForbiddenException('Faqat administrator butunlay o\'chira oladi');
    const task = await this.prisma.task.findFirst({ where: { id, deletedAt: { not: null } } });
    if (!task) throw new NotFoundException('Avval vazifani chiqindiga (trash) o\'tkazing');
    await this.prisma.$executeRaw`DELETE FROM tasks WHERE id = ${id}`; // task_files/comments cascade
    await this.audit.record({ userId: user.id, entity: 'Task', entityId: id, action: 'HARD_DELETE', ip, oldValue: { title: task.title } });
    return { message: 'Vazifa butunlay o\'chirildi' };
  }
}
