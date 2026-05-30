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

@Injectable()
export class TasksService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private projects: ProjectsService,
    private notifications: NotificationsService,
  ) {}

  private taskInclude = {
    assignee: { select: { id: true, fullName: true, avatar: true } },
    position: { select: { id: true, name: true } },
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
    const privileged = ['superadmin', 'admin', 'accountant'].includes(user.role);
    if (!privileged && !isMember) throw new ForbiddenException('Loyihaga ruxsatingiz yo\'q');
    return { project, isMember };
  }

  /** Kanban: all tasks for a project, grouped by status. Employees see only their own. */
  async board(projectId: number, user: AuthUser) {
    await this.assertProjectAccess(projectId, user);

    const where: any = { projectId };
    if (user.role === 'employee') where.assigneeId = user.id;

    const tasks = await this.prisma.task.findMany({
      where,
      include: this.taskInclude,
      orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }],
    });

    const now = Date.now();
    return tasks.map((t) => ({
      ...t,
      isOverdue:
        !!t.deadline &&
        t.deadline.getTime() < now &&
        !['done', 'checked', 'production'].includes(t.status),
    }));
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
    return task;
  }

  async create(dto: CreateTaskDto, user: AuthUser, ip?: string) {
    if (!PRIVILEGED.includes(user.role)) throw new ForbiddenException('Vazifa yaratishga ruxsatingiz yo\'q');
    await this.assertProjectAccess(dto.projectId, user);

    const task = await this.prisma.task.create({
      data: {
        projectId: dto.projectId,
        title: dto.title,
        description: dto.description,
        assigneeId: dto.assigneeId ?? null,
        status: dto.status ?? 'todo',
        priority: dto.priority ?? 'medium',
        type: dto.type ?? 'feature',
        positionId: dto.positionId ?? null,
        deadline: dto.deadline ? new Date(dto.deadline) : null,
        estimatedMinutes: dto.estimatedMinutes ?? null,
      },
      include: this.taskInclude,
    });

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
    const data: any = { ...dto };
    if (dto.deadline !== undefined) data.deadline = dto.deadline ? new Date(dto.deadline) : null;
    delete data.projectId;

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

    // Employee: only own tasks, and cannot set checked/rejected (review is manager-only)
    if (user.role === 'employee') {
      if (task.assigneeId !== user.id) throw new ForbiddenException('Bu vazifa sizga biriktirilmagan');
      if (['checked', 'rejected'].includes(dto.status)) {
        throw new ForbiddenException('Tekshiruvni faqat menejer bajaradi');
      }
    }

    const updated = await this.prisma.task.update({
      where: { id },
      data: { status: dto.status, orderIndex: dto.orderIndex ?? task.orderIndex },
      include: this.taskInclude,
    });

    await this.projects.recomputeProgress(task.projectId);
    await this.audit.record({ userId: user.id, entity: 'Task', entityId: id, action: 'STATUS', ip, oldValue: { status: task.status }, newValue: { status: dto.status } });
    return updated;
  }

  /**
   * Manager/Admin review of a task.
   * verdict=checked -> status 'checked'.
   * verdict=rejected -> comment MANDATORY, status auto-returns to 'in_progress', reopened_count++.
   */
  async review(id: number, dto: ReviewTaskDto, user: AuthUser, ip?: string) {
    if (!PRIVILEGED.includes(user.role)) throw new ForbiddenException('Tekshirishga ruxsatingiz yo\'q');
    const task = await this.prisma.task.findFirst({ where: { id } });
    if (!task) throw new NotFoundException('Vazifa topilmadi');
    await this.assertProjectAccess(task.projectId, user);

    if (dto.verdict === 'rejected') {
      if (!dto.comment?.trim()) throw new BadRequestException('Rad etishda izoh majburiy');
      await this.prisma.taskComment.create({ data: { taskId: id, userId: user.id, body: dto.comment.trim() } });
      const updated = await this.prisma.task.update({
        where: { id },
        data: { status: 'in_progress', reopenedCount: { increment: 1 }, rejectReason: dto.comment.trim() },
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
    return this.prisma.taskComment.create({
      data: { taskId: id, userId: user.id, body: dto.body },
      include: { user: { select: { id: true, fullName: true, avatar: true } } },
    });
  }

  async addFile(id: number, file: { filename: string; originalname: string }, user: AuthUser) {
    const task = await this.prisma.task.findFirst({ where: { id } });
    if (!task) throw new NotFoundException('Vazifa topilmadi');
    await this.assertProjectAccess(task.projectId, user);
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
}
