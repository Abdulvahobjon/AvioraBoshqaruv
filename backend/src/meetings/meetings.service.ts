import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { GoogleCalendarService } from '../google-calendar/google-calendar.service';
import { AuthUser } from '../common/decorators/current-user.decorator';

const PRIVILEGED = ['superadmin', 'admin', 'manager'];
const MEET_ACCOUNT = 'asositllm'; // yagona Google akkaunt — yozuv uchun saqlanadi

@Injectable()
export class MeetingsService {
  private readonly logger = new Logger('Meetings');

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private gcal: GoogleCalendarService,
  ) {}

  private include = {
    project: { select: { id: true, name: true, code: true } },
    creator: { select: { id: true, fullName: true } },
    attendance: { include: { user: { select: { id: true, fullName: true, avatar: true, position: { select: { name: true } } } } } },
  };

  async findAll(user: AuthUser, q: any = {}) {
    const where: any = {};
    if (user.role === 'employee') where.attendance = { some: { userId: user.id } };
    if (q.search) where.title = { contains: q.search, mode: 'insensitive' };
    if (q.organizerId) where.createdBy = Number(q.organizerId);
    if (q.projectId) where.projectId = Number(q.projectId);
    if (q.status === 'finished') where.finishedAt = { not: null };
    else if (q.status === 'planned') where.finishedAt = null;
    if (q.from || q.to) {
      where.startAt = {};
      if (q.from) where.startAt.gte = new Date(q.from);
      if (q.to) where.startAt.lte = new Date(q.to);
    }
    const order = q.sort === 'oldest' ? 'asc' : 'desc';
    return this.prisma.meeting.findMany({ where, include: this.include, orderBy: { startAt: order } });
  }

  async findOne(id: number, user?: AuthUser) {
    const meeting = await this.prisma.meeting.findFirst({ where: { id }, include: this.include });
    if (!meeting) throw new NotFoundException('Yig\'ilish topilmadi');
    // IDOR himoyasi: oddiy xodim faqat o'zi ishtirokchi/tashkilotchi bo'lgan yig'ilishni ko'radi.
    // (Ichki chaqiruvlar user'siz keladi — ular allaqachon avtorizatsiyadan o'tgan.)
    if (user && user.role === 'employee') {
      const allowed = meeting.createdBy === user.id || meeting.attendance.some((a) => a.userId === user.id);
      if (!allowed) throw new ForbiddenException('Bu yig\'ilishni ko\'rishga ruxsatingiz yo\'q');
    }
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

  /** startAt ni Date ga aylantiradi; yaroqsiz bo'lsa 400 beradi (Prisma 500 oldini olish). */
  private parseStartAt(value: any): Date {
    const d = new Date(value);
    if (isNaN(d.getTime())) throw new BadRequestException('Boshlanish vaqti noto\'g\'ri');
    return d;
  }

  /** participantIds dagi barcha foydalanuvchilar mavjudligini tekshiradi (FK 500 oldini olish). */
  private async assertParticipantsExist(ids: number[]) {
    const unique = [...new Set(ids)];
    if (!unique.length) return;
    const cnt = await this.prisma.user.count({ where: { id: { in: unique } } });
    if (cnt !== unique.length) throw new BadRequestException('Ba\'zi ishtirokchilar topilmadi');
  }

  async create(dto: any, user: AuthUser) {
    if (!PRIVILEGED.includes(user.role)) throw new ForbiddenException('Yig\'ilish yaratishga ruxsat yo\'q');
    const participantIds: number[] = Array.isArray(dto.participantIds) ? dto.participantIds.map(Number) : [];
    const projectId = dto.projectId ? Number(dto.projectId) : null;
    const startAt = this.parseStartAt(dto.startAt);
    await this.assertParticipantsExist(participantIds);

    const baseData = {
      title: dto.title || 'Yig\'ilish',
      projectId,
      // Foydalanuvchi qo'lda havola kiritsa — shu havola saqlanadi (probel bo'lsa null).
      // null bo'lsa, quyida avtomatik Google Meet ochiladi.
      link: typeof dto.link === 'string' && dto.link.trim() ? dto.link.trim() : null,
      content: dto.content ?? null,
      duration: dto.duration ? Number(dto.duration) : null,
      penaltyPercent: dto.penaltyPercent != null && dto.penaltyPercent !== '' ? Number(dto.penaltyPercent) : null,
      startAt,
      createdBy: user.id,
      attendance: { create: participantIds.map((pid) => ({ userId: pid })) },
    };

    // UID `count+1` asosida — parallel yaratishda unique to'qnashuv bo'lsa (P2002) qayta urinamiz.
    let meeting;
    for (let attempt = 0; ; attempt++) {
      try {
        const uid = await this.generateUid(projectId);
        meeting = await this.prisma.meeting.create({ data: { uid, ...baseData }, include: this.include });
        break;
      } catch (e: any) {
        if (e?.code === 'P2002' && attempt < 5) continue;
        throw e;
      }
    }

    // Notify all participants that a meeting was scheduled
    for (const pid of participantIds) {
      await this.notifications.notify(pid, 'meeting_created', { meetingId: meeting.id, title: meeting.title, startAt: meeting.startAt });
    }

    // Qo'lda havola kiritilgan bo'lsa Google Meet yaratilmaydi — faqat "Havolasi" bo'sh qolsa avtomatik ochamiz.
    if (meeting.link) return meeting;

    // Best-effort: belgilangan vaqtga Google Meet yaratamiz. Xato bo'lsa ham yig'ilish saqlanadi.
    const withMeet = await this.attachMeet(meeting);
    return withMeet;
  }

  /** Yig'ilishga Google Meet havolasini biriktiradi (best-effort). */
  private async attachMeet(meeting: any) {
    if (!this.gcal.isConfigured()) {
      this.logger.warn(`Google '${MEET_ACCOUNT}' sozlanmagan — yig'ilish #${meeting.id} Meet havolasisiz saqlandi.`);
      return meeting;
    }
    try {
      const start = new Date(meeting.startAt);
      const end = new Date(start.getTime() + (meeting.duration || 30) * 60000);
      const r = await this.gcal.createMeetEvent({
        title: meeting.title || 'Yig\'ilish',
        description: meeting.content || undefined,
        startISO: start.toISOString(),
        endISO: end.toISOString(),
      });
      return this.prisma.meeting.update({
        where: { id: meeting.id },
        data: {
          googleEventId: r.googleEventId,
          meetLink: r.meetLink,
          meetAccount: MEET_ACCOUNT,
          // Meet havolasini "Havolasi" maydoniga ham yozamiz (qo'lda havola kiritilmagan bo'lsa).
          ...(r.meetLink && !meeting.link ? { link: r.meetLink } : {}),
        },
        include: this.include,
      });
    } catch (e: any) {
      this.logger.warn(`Yig'ilish #${meeting.id} uchun Meet yaratilmadi (yig'ilish saqlandi): ${e?.message || e}`);
      return meeting;
    }
  }

  /**
   * Meet havolasini QAYTA yaratish (retry). Avval yaratish muvaffaqiyatsiz bo'lib
   * yig'ilish linksiz saqlanganda ishlatiladi — ma'lumot yo'qolmaydi.
   * attachMeet'dan farqi: xatoni YUTMAYDI — toza xabarni foydalanuvchiga qaytaradi.
   */
  async regenerateLink(id: number, user: AuthUser) {
    const meeting = await this.prisma.meeting.findFirst({ where: { id } });
    if (!meeting) throw new NotFoundException('Yig\'ilish topilmadi');
    if (!this.canManage(meeting, user)) throw new ForbiddenException('Faqat tashkilotchi havolani qayta yaratadi');
    if (meeting.finishedAt) throw new BadRequestException('Yakunlangan yig\'ilish uchun havola yaratilmaydi');
    if (meeting.meetLink) throw new BadRequestException('Bu yig\'ilishda Google Meet havolasi allaqachon mavjud');

    // createMeetEvent xato bo'lsa (sozlanmagan/token/403) toza o'zbekcha exception throw qiladi → frontendga boradi.
    const start = new Date(meeting.startAt);
    const end = new Date(start.getTime() + (meeting.duration || 30) * 60000);
    const r = await this.gcal.createMeetEvent({
      title: meeting.title || 'Yig\'ilish',
      description: meeting.content || undefined,
      startISO: start.toISOString(),
      endISO: end.toISOString(),
    });
    return this.prisma.meeting.update({
      where: { id },
      data: {
        googleEventId: r.googleEventId,
        meetLink: r.meetLink,
        meetAccount: MEET_ACCOUNT,
        ...(r.meetLink ? { link: r.meetLink } : {}),
      },
      include: this.include,
    });
  }

  /** Yig'ilishni tahrirlash (tashkilotchi/admin). Ishtirokchilar va Google Meet eventi ham sinxronlanadi. */
  async update(id: number, dto: any, user: AuthUser) {
    const meeting = await this.prisma.meeting.findFirst({ where: { id }, include: { attendance: true } });
    if (!meeting) throw new NotFoundException('Yig\'ilish topilmadi');
    // Tashkilotchi yoki admin/superadmin tahrirlay oladi (boshqa amallar bilan izchil).
    if (!this.canManage(meeting, user)) throw new ForbiddenException('Faqat tashkilotchi yoki admin tahrirlay oladi');
    if (meeting.finishedAt) throw new BadRequestException('Yakunlangan yig\'ilishni tahrirlab bo\'lmaydi');
    if (Array.isArray(dto.participantIds)) await this.assertParticipantsExist(dto.participantIds.map(Number));

    const data: any = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.projectId !== undefined) data.projectId = dto.projectId ? Number(dto.projectId) : null;
    if (dto.link !== undefined) data.link = typeof dto.link === 'string' && dto.link.trim() ? dto.link.trim() : null;
    if (dto.content !== undefined) data.content = dto.content || null;
    if (dto.duration !== undefined) data.duration = dto.duration ? Number(dto.duration) : null;
    if (dto.penaltyPercent !== undefined) data.penaltyPercent = dto.penaltyPercent !== '' && dto.penaltyPercent != null ? Number(dto.penaltyPercent) : null;
    if (dto.startAt !== undefined) data.startAt = this.parseStartAt(dto.startAt);
    if (dto.finished !== undefined) data.finishedAt = dto.finished ? (meeting.finishedAt || new Date()) : null;

    await this.prisma.$transaction(async (tx) => {
      await tx.meeting.update({ where: { id }, data });
      if (Array.isArray(dto.participantIds)) {
        const ids = dto.participantIds.map(Number);
        const existingIds = meeting.attendance.map((a) => a.userId);
        const toRemove = existingIds.filter((uid) => !ids.includes(uid));
        const toAdd = ids.filter((uid) => !existingIds.includes(uid));
        if (toRemove.length) await tx.meetingAttendance.deleteMany({ where: { meetingId: id, userId: { in: toRemove } } });
        for (const uid of toAdd) await tx.meetingAttendance.create({ data: { meetingId: id, userId: uid } });
      }
    });

    // Best-effort: bog'langan Google Meet eventini yangilaymiz (vaqt/nomi o'zgarsa)
    if (meeting.googleEventId && (dto.startAt !== undefined || dto.title !== undefined || dto.duration !== undefined || dto.content !== undefined)) {
      try {
        const start = new Date(dto.startAt ?? meeting.startAt);
        const dur = dto.duration !== undefined ? (Number(dto.duration) || 30) : (meeting.duration || 30);
        await this.gcal.updateMeetEvent(meeting.googleEventId, {
          title: dto.title ?? meeting.title ?? undefined,
          description: dto.content ?? meeting.content ?? undefined,
          startISO: start.toISOString(),
          endISO: new Date(start.getTime() + dur * 60000).toISOString(),
        });
      } catch (e: any) {
        this.logger.warn(`Yig'ilish #${id} Meet eventini yangilab bo'lmadi: ${e?.message || e}`);
      }
    }

    return this.findOne(id);
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

    // Best-effort: bog'langan Google Meet eventini ham bekor qilamiz.
    if (m.googleEventId) {
      try {
        await this.gcal.cancelMeetEvent(m.googleEventId);
      } catch (e: any) {
        this.logger.warn(`Yig'ilish #${id} Meet eventini bekor qilib bo'lmadi: ${e?.message || e}`);
      }
    }

    await this.prisma.meeting.delete({ where: { id } });
    return { message: 'Yig\'ilish o\'chirildi' };
  }

  private canManage(meeting: { createdBy: number | null }, user: AuthUser) {
    return meeting.createdBy === user.id || ['superadmin', 'admin'].includes(user.role);
  }
}
