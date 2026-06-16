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

  /**
   * Har 5 daqiqada: boshlanishiga 15 daqiqadan kam qolgan, hali yakunlanmagan yig'ilishlar uchun
   * qatnashchilarga bir martalik eslatma yuboradi (reminder_sent_at orqali takror oldini olamiz).
   * reminder_sent_at ustuni yangi — client regeneratsiyasiz ishlash uchun raw SQL ishlatamiz.
   */
  @Cron('*/5 * * * *', { name: 'meeting-reminder', timeZone: 'Asia/Tashkent' })
  async meetingReminders() {
    const now = new Date();
    const soon = new Date(now.getTime() + 15 * 60000);
    const due: Array<{ id: number; title: string | null; start_at: Date }> = await this.prisma.$queryRaw`
      SELECT id, title, start_at FROM "meetings"
      WHERE deleted_at IS NULL AND finished_at IS NULL AND reminder_sent_at IS NULL
        AND start_at >= ${now} AND start_at <= ${soon}`;
    for (const m of due) {
      const attendees = await this.prisma.meetingAttendance.findMany({ where: { meetingId: m.id }, select: { userId: true } });
      for (const a of attendees) {
        await this.notifications.notify(a.userId, 'meeting_reminder', { meetingId: m.id, title: m.title, startAt: m.start_at });
      }
      await this.prisma.$executeRaw`UPDATE "meetings" SET reminder_sent_at = ${now} WHERE id = ${m.id}`;
    }
    if (due.length) this.logger.log(`Yig'ilish eslatmasi: ${due.length} ta yig'ilish uchun yuborildi`);
  }

  /**
   * Har 5 daqiqada: vaqti tugagan (start_at + davomiyligi o'tgan), hali yakunlanmagan yig'ilishlar uchun
   * tashkilotchiga bir martalik "yig'ilish yakunlandi — davomat oling" eslatmasi yuboradi.
   * Bosilganda frontend AttendanceDialog (davomat oynasi)ni ochadi. attendance_due_sent_at takror oldini oladi.
   */
  @Cron('*/5 * * * *', { name: 'meeting-attendance-due', timeZone: 'Asia/Tashkent' })
  async meetingAttendanceDue() {
    const now = new Date();
    // start_at — timezone'siz (UTC saqlanadi); now() bilan to'g'ri solishtirish uchun UTC deb belgilaymiz.
    const due: Array<{ id: number; title: string | null; created_by: number }> = await this.prisma.$queryRaw`
      SELECT id, title, created_by FROM "meetings"
      WHERE deleted_at IS NULL AND finished_at IS NULL AND attendance_due_sent_at IS NULL
        AND created_by IS NOT NULL
        AND (start_at AT TIME ZONE 'UTC') + make_interval(mins => COALESCE(duration, 30)) <= ${now}`;
    for (const m of due) {
      await this.notifications.notify(m.created_by, 'meeting_finished', { meetingId: m.id, title: m.title });
      await this.prisma.$executeRaw`UPDATE "meetings" SET attendance_due_sent_at = ${now} WHERE id = ${m.id}`;
    }
    if (due.length) this.logger.log(`Davomat eslatmasi: ${due.length} ta yig'ilish tashkilotchisiga yuborildi`);
  }
}
