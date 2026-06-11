import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { TaskStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CronService {
  private readonly logger = new Logger('Cron');

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  /**
   * Every day at 09:00:
   *  - auto-mark passed-deadline tasks as 'overdue'
   *  - notify assignees about tasks due today and overdue tasks
   */
  @Cron('0 9 * * *', { name: 'deadline-check', timeZone: 'Asia/Tashkent' })
  async dailyDeadlineCheck() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 86400000);
    const activeStatuses: TaskStatus[] = ['todo', 'in_progress'];

    // 1) Auto-overdue: deadline passed, still active
    const overdueTasks = await this.prisma.task.findMany({
      where: { deadline: { lt: todayStart }, status: { in: activeStatuses } },
    });
    for (const t of overdueTasks) {
      await this.prisma.task.update({ where: { id: t.id }, data: { status: 'overdue' } });
      if (t.assigneeId) {
        await this.notifications.notify(t.assigneeId, 'task_overdue', { taskId: t.id, title: t.title });
      }
      // notify project managers
      const managers = await this.prisma.projectMember.findMany({
        where: { projectId: t.projectId, roleInProject: 'manager' },
      });
      for (const m of managers) {
        await this.notifications.notify(m.userId, 'task_overdue', { taskId: t.id, title: t.title });
      }
    }

    // 2) Due today
    const dueToday = await this.prisma.task.findMany({
      where: { deadline: { gte: todayStart, lt: todayEnd }, status: { in: activeStatuses } },
    });
    for (const t of dueToday) {
      if (t.assigneeId) {
        await this.notifications.notify(t.assigneeId, 'task_due_today', { taskId: t.id, title: t.title });
      }
    }

    this.logger.log(`Deadline check: ${overdueTasks.length} overdue, ${dueToday.length} due today`);
  }

  /**
   * Har soatda: muddati o'tgan, hali yakunlanmagan loyihalarni 'overdue' qiladi
   * va a'zolarni xabardor qiladi (TZ A.11 — markOverdueProjects).
   */
  @Cron('0 * * * *', { name: 'project-overdue-check', timeZone: 'Asia/Tashkent' })
  async markOverdueProjects() {
    const now = new Date();
    const projects = await this.prisma.project.findMany({
      where: { deadline: { lt: now }, status: { in: ['planning', 'active'] } },
      include: { members: { select: { userId: true } } },
    });
    for (const p of projects) {
      await this.prisma.project.update({ where: { id: p.id }, data: { status: 'overdue' } });
      for (const m of p.members) {
        await this.notifications.notify(m.userId, 'project_overdue', { projectId: p.id, projectName: p.name });
      }
    }
    if (projects.length) this.logger.log(`Loyiha overdue: ${projects.length} ta loyiha muddati o'tgan deb belgilandi`);
  }
}
