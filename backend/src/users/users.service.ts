import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

const userSelect = {
  id: true,
  fullName: true,
  role: true,
  roles: true,
  positionId: true,
  position: { select: { id: true, name: true } },
  fixedSalary: true,
  balance: true,
  card: true,
  card2: true,
  phone: true,
  phone2: true,
  region: true,
  district: true,
  passportSeries: true,
  passportNumber: true,
  passportImage: true,
  link1: true,
  link2: true,
  avatar: true,
  status: true,
  createdAt: true,
};

// Optional profile fields shared by create/update (only string columns).
const PROFILE_FIELDS = [
  'card', 'card2', 'phone', 'phone2', 'region', 'district',
  'passportSeries', 'passportNumber', 'passportImage', 'avatar', 'link1', 'link2',
] as const;

// Qo'shimcha rol sifatida beriladigan rollar (superadmin alohida — bu yerda yo'q).
const ASSIGNABLE_ROLES = ['admin', 'manager', 'accountant', 'auditor', 'employee'];

/** Qo'shimcha rollarni tozalash: superadmin chiqariladi, asosiy rol takrorlanmaydi, dedup. */
function sanitizeRoles(roles: string[], primaryRole: string): string[] {
  return [...new Set(roles.filter((r) => ASSIGNABLE_ROLES.includes(r) && r !== primaryRole))];
}

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async findAll(q: PaginationDto) {
    const where: any = {};
    if (q.search) {
      where.fullName = { contains: q.search, mode: 'insensitive' };
    }
    // Faqat ruxsat etilgan ustunlar bo'yicha saralash (noto'g'ri ustun Prisma 500 beradi).
    const sortCol = ['fullName', 'createdAt', 'role', 'fixedSalary', 'balance'].includes(q.sortBy as string) ? (q.sortBy as string) : 'createdAt';
    const sortDir = q.sortOrder === 'asc' ? 'asc' : 'desc';
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: userSelect,
        skip: (q.page - 1) * q.limit,
        take: q.limit,
        orderBy: { [sortCol]: sortDir },
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items, total, page: q.page, limit: q.limit, totalPages: Math.ceil(total / q.limit) };
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findFirst({ where: { id }, select: userSelect });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');
    return user;
  }

  /** Yengil ro'yxat (dropdownlar uchun): id + ism + rol + lavozim. */
  findAllLight(role?: string) {
    const where: any = { status: 'active' };
    if (role) where.role = role;
    return this.prisma.user.findMany({
      where,
      select: { id: true, fullName: true, role: true, roles: true, avatar: true, positionId: true, position: { select: { id: true, name: true } } },
      orderBy: { fullName: 'asc' },
    });
  }

  /**
   * Xodim unumdorligi (KPI). TZ 6.1:
   *   Efficiency = W_tasks·(T_estimated/T_actual) − W_bugs·N_reopened  + yig'ilish davomati.
   * Bounded [0..100]: taskScore (velocity) 60% + qualityScore (reopen) 20% + meetingScore 20%.
   */
  async efficiency(userId: number) {
    const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));
    const user = await this.prisma.user.findFirst({ where: { id: userId }, select: { id: true, fullName: true, role: true } });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');

    const tasks = await this.prisma.task.findMany({
      where: { assigneeId: userId },
      select: { status: true, estimatedMinutes: true, actualMinutes: true, reopenedCount: true },
    });
    const total = tasks.length;
    const completed = tasks.filter((t) => ['done', 'checked', 'production'].includes(t.status));
    const overdue = tasks.filter((t) => t.status === 'overdue').length;
    const rejected = tasks.filter((t) => t.status === 'rejected').length;
    const totalReopened = tasks.reduce((a, t) => a + (t.reopenedCount || 0), 0);

    let est = 0, act = 0;
    for (const t of completed) {
      if (t.estimatedMinutes && t.actualMinutes) { est += t.estimatedMinutes; act += t.actualMinutes; }
    }
    const velocity = act > 0 ? est / act : 1; // >1 => rejadan tez
    const taskScore = clamp(Math.round(velocity * 100));
    const reopenRate = total ? totalReopened / total : 0;
    const qualityScore = clamp(Math.round(100 - reopenRate * 100));

    const att = await this.prisma.meetingAttendance.findMany({ where: { userId }, select: { attended: true, absenceReason: true } });
    const totalMeetings = att.length;
    const attended = att.filter((a) => a.attended).length;
    const excused = att.filter((a) => !a.attended && !!a.absenceReason).length;
    const unexcused = att.filter((a) => !a.attended && !a.absenceReason).length;
    // Sababsiz qatnashmaslik KPI'ni pasaytiradi (sababli — yarim ball).
    const meetingScore = totalMeetings ? clamp(Math.round(((attended + excused * 0.5) / totalMeetings) * 100)) : 100;

    const overall = clamp(Math.round(taskScore * 0.6 + qualityScore * 0.2 + meetingScore * 0.2));

    let overdueProjects = 0;
    if (['manager', 'admin', 'superadmin'].includes(user.role)) {
      overdueProjects = await this.prisma.project.count({
        where: { status: 'overdue', members: { some: { userId, roleInProject: 'manager' } } },
      });
    }

    return {
      overall_efficiency: overall,
      task_score: taskScore,
      quality_score: qualityScore,
      meeting_score: meetingScore,
      metrics: {
        total_tasks: total,
        completed_tasks: completed.length,
        overdue_tasks: overdue,
        rejected_tasks: rejected,
        total_reopened: totalReopened,
        estimated_minutes: est,
        actual_minutes: act,
        total_meetings: totalMeetings,
        attended_meetings: attended,
        excused_meetings: excused,
        unexcused_meetings: unexcused,
        overdue_projects: overdueProjects,
      },
    };
  }

  async create(dto: CreateUserDto, actorId: number, actorRole: string, ip?: string) {
    // Superadmin yagona (seed'dan keladi) — yangi superadmin umuman yaratilmaydi (hatto superadmin ham yarata olmaydi).
    if (dto.role === 'superadmin') {
      throw new ForbiddenException('Superadmin yagona — yangi superadmin yaratib bo\'lmaydi');
    }
    const exists = await this.prisma.user.findFirst({ where: { fullName: dto.fullName } });
    if (exists) throw new BadRequestException('Bu login allaqachon mavjud');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const data: any = {
      fullName: dto.fullName,
      passwordHash,
      role: dto.role,
      positionId: dto.positionId ?? null,
      fixedSalary: BigInt(dto.fixedSalary ?? 0),
    };
    // Qo'shimcha rollar — superadmin va admin bera oladi (superadmin roli sanitizeRoles'da chiqariladi).
    if (dto.roles !== undefined) {
      if (!['superadmin', 'admin'].includes(actorRole)) throw new ForbiddenException('Qo\'shimcha rollarni faqat superadmin yoki admin beradi');
      data.roles = sanitizeRoles(dto.roles, dto.role);
    }
    for (const f of PROFILE_FIELDS) {
      if ((dto as any)[f] !== undefined) data[f] = (dto as any)[f] || null;
    }
    const user = await this.prisma.user.create({ data, select: userSelect });
    await this.audit.record({ userId: actorId, entity: 'User', entityId: user.id, action: 'CREATE', ip, newValue: { fullName: user.fullName, role: user.role } });
    return user;
  }

  async update(id: number, dto: UpdateUserDto, actorId: number, actorRole: string, ip?: string) {
    const before = await this.prisma.user.findFirst({ where: { id }, select: userSelect });
    if (!before) throw new NotFoundException('Foydalanuvchi topilmadi');

    // Privilege escalation himoyasi (superadmin bo'lmaganlar uchun):
    if (actorRole !== 'superadmin' && before.role === 'superadmin') {
      throw new ForbiddenException('Superadmin foydalanuvchini faqat superadmin tahrirlay oladi');
    }
    // Superadmin yagona — mavjud bo'lmagan xodimni superadmin qilib bo'lmaydi (hatto superadmin ham promote qila olmaydi).
    if (dto.role === 'superadmin' && before.role !== 'superadmin') {
      throw new ForbiddenException('Superadmin yagona — boshqa xodimni superadmin qilib bo\'lmaydi');
    }

    const data: any = {};
    if (dto.fullName !== undefined) data.fullName = dto.fullName;
    if (dto.role !== undefined) data.role = dto.role;
    // Qo'shimcha rollar — superadmin va admin. Asosiy rolga nisbatan tozalanadi (superadmin chiqariladi).
    if (dto.roles !== undefined) {
      if (!['superadmin', 'admin'].includes(actorRole)) throw new ForbiddenException('Qo\'shimcha rollarni faqat superadmin yoki admin beradi');
      const primary = dto.role ?? before.role;
      data.roles = sanitizeRoles(dto.roles, primary);
    }
    if (dto.positionId !== undefined) data.positionId = dto.positionId;
    if (dto.fixedSalary !== undefined) data.fixedSalary = BigInt(dto.fixedSalary);
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, 10);
      data.tokenVersion = { increment: 1 }; // parol reset qilinsa eski refresh tokenlar bekor bo'ladi
    }
    for (const f of PROFILE_FIELDS) {
      if ((dto as any)[f] !== undefined) data[f] = (dto as any)[f] || null;
    }

    const user = await this.prisma.user.update({ where: { id }, data, select: userSelect });
    await this.audit.record({
      userId: actorId, entity: 'User', entityId: id, action: 'UPDATE', ip,
      oldValue: { role: before.role, fixedSalary: before.fixedSalary, status: before.status },
      newValue: { role: user.role, fixedSalary: user.fixedSalary, status: user.status },
    });
    return user;
  }

  async remove(id: number, actorId: number, actorRole: string, ip?: string) {
    // O'z akkauntini o'chirib bo'lmaydi (admin o'zini qulflab qo'yishidan saqlaydi).
    if (id === actorId) throw new ForbiddenException('O\'z akkauntingizni o\'chira olmaysiz');
    const user = await this.prisma.user.findFirst({ where: { id } });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');
    // Superadmin foydalanuvchini faqat superadmin o'chira oladi.
    if (actorRole !== 'superadmin' && user.role === 'superadmin') {
      throw new ForbiddenException('Superadmin foydalanuvchini faqat superadmin o\'chira oladi');
    }
    await this.prisma.user.delete({ where: { id } }); // soft delete via middleware
    await this.audit.record({ userId: actorId, entity: 'User', entityId: id, action: 'DELETE', ip, oldValue: { fullName: user.fullName } });
    return { message: 'Foydalanuvchi o\'chirildi' };
  }
}
