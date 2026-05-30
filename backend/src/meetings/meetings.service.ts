import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuthUser } from '../common/decorators/current-user.decorator';

const PRIVILEGED = ['superadmin', 'admin', 'manager'];

@Injectable()
export class MeetingsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  private include = {
    project: { select: { id: true, name: true, code: true } },
    creator: { select: { id: true, fullName: true } },
    attendance: { include: { user: { select: { id: true, fullName: true, avatar: true, position: { select: { name: true } } } } } },
  };

  async findAll(user: AuthUser) {
    const where: any = {};
    if (user.role === 'employee') {
      where.attendance = { some: { userId: user.id } };
    }
    return this.prisma.meeting.findMany({ where, include: this.include, orderBy: { startAt: 'desc' } });
  }

  async findOne(id: number) {
    const meeting = await this.prisma.meeting.findFirst({ where: { id }, include: this.include });
    if (!meeting) throw new NotFoundException('Yig\'ilish topilmadi');
    return meeting;
  }

  /** Generate a UID like "DSR-M-0001" from the project code (or a derived prefix). */
  private async generateUid(projectId?: number | null): Promise<string> {
    let prefix = 'GEN';
    if (projectId) {
      const project = await this.prisma.project.findFirst({ where: { id: projectId }, select: { code: true, name: true } });
      if (project?.code) prefix = project.code.toUpperCase();
      else if (project?.name) prefix = project.name.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'GEN';
    }
    const count = await this.prisma.meeting.count({ where: { uid: { startsWith: `${prefix}-M-` } } });
    const num = String(count + 1).padStart(4, '0');
    return `${prefix}-M-${num}`;
  }

  async create(dto: any, user: AuthUser) {
    if (!PRIVILEGED.includes(user.role)) throw new ForbiddenException('Yig\'ilish yaratishga ruxsat yo\'q');
    const participantIds: number[] = Array.isArray(dto.participantIds) ? dto.participantIds.map(Number) : [];
    const projectId = dto.projectId ? Number(dto.projectId) : null;
    const uid = await this.generateUid(projectId);

    const meeting = await this.prisma.meeting.create({
      data: {
        uid,
        title: dto.title || 'Yig\'ilish',
        projectId,
        link: dto.link ?? null,
        content: dto.content ?? null,
        duration: dto.duration ? Number(dto.duration) : null,
        startAt: new Date(dto.startAt),
        createdBy: user.id,
        attendance: { create: participantIds.map((pid) => ({ userId: pid })) },
      },
      include: this.include,
    });

    // Notify all participants that a meeting was scheduled
    for (const pid of participantIds) {
      await this.notifications.notify(pid, 'meeting_created', { meetingId: meeting.id, title: meeting.title, startAt: meeting.startAt });
    }
    return meeting;
  }

  /**
   * Finish a meeting (creator/admin only). Two-sided attendance:
   *  - attendedUserIds → attended=true
   *  - others → attended=false (reason submitted later by them)
   * Notifies absentees ("you didn't attend") and attendees ("meeting finished").
   */
  async finish(id: number, attendedUserIds: number[], user: AuthUser) {
    const meeting = await this.prisma.meeting.findFirst({ where: { id }, include: { attendance: true } });
    if (!meeting) throw new NotFoundException('Yig\'ilish topilmadi');
    if (!this.canManage(meeting, user)) throw new ForbiddenException('Faqat tashkilotchi yakunlay oladi');
    if (meeting.finishedAt) throw new BadRequestException('Yig\'ilish allaqachon yakunlangan');

    const attended = new Set((attendedUserIds || []).map(Number));
    await this.prisma.$transaction(async (tx) => {
      for (const a of meeting.attendance) {
        await tx.meetingAttendance.update({ where: { id: a.id }, data: { attended: attended.has(a.userId) } });
      }
      await tx.meeting.update({ where: { id }, data: { finishedAt: new Date() } });
    });

    for (const a of meeting.attendance) {
      if (attended.has(a.userId)) {
        await this.notifications.notify(a.userId, 'meeting_finished', { meetingId: id, title: meeting.title });
      } else {
        await this.notifications.notify(a.userId, 'meeting_absent', { meetingId: id, title: meeting.title });
      }
    }
    return this.findOne(id);
  }

  /** A non-attendee submits their absence reason → becomes "Sababli". */
  async submitReason(meetingId: number, reason: string, user: AuthUser) {
    const att = await this.prisma.meetingAttendance.findFirst({ where: { meetingId, userId: user.id } });
    if (!att) throw new NotFoundException('Siz bu yig\'ilish ishtirokchisi emassiz');
    if (att.attended) throw new BadRequestException('Siz yig\'ilishda qatnashgansiz');
    if (!reason?.trim()) throw new BadRequestException('Sabab kiriting');
    await this.prisma.meetingAttendance.update({ where: { id: att.id }, data: { absenceReason: reason.trim() } });
    return this.findOne(meetingId);
  }

  /** Organizer manual override of a single attendance row. */
  async setAttendance(meetingId: number, dto: any, actor: AuthUser) {
    const meeting = await this.prisma.meeting.findFirst({ where: { id: meetingId } });
    if (!meeting) throw new NotFoundException('Yig\'ilish topilmadi');
    if (!this.canManage(meeting, actor)) throw new ForbiddenException('Ruxsat yo\'q');
    await this.prisma.meetingAttendance.updateMany({
      where: { meetingId, userId: Number(dto.userId) },
      data: { attended: !!dto.attended, absenceReason: dto.absenceReason ?? null },
    });
    return this.findOne(meetingId);
  }

  /** Only the creator (or admin/superadmin) can delete. */
  async remove(id: number, actor: AuthUser) {
    const m = await this.prisma.meeting.findFirst({ where: { id } });
    if (!m) throw new NotFoundException('Yig\'ilish topilmadi');
    const isOwner = m.createdBy === actor.id;
    const isAdmin = ['superadmin', 'admin'].includes(actor.role);
    if (!isOwner && !isAdmin) throw new ForbiddenException('Faqat yaratgan odam o\'chira oladi');
    await this.prisma.meeting.delete({ where: { id } });
    return { message: 'Yig\'ilish o\'chirildi' };
  }

  private canManage(meeting: { createdBy: number | null }, user: AuthUser) {
    return meeting.createdBy === user.id || ['superadmin', 'admin'].includes(user.role);
  }
}
