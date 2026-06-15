import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CurrenciesService } from '../currencies/currencies.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { PayManyDto, UpdatePayrollDto } from './dto/payroll.dto';

const ACCT = ['accountant', 'superadmin', 'admin'];

@Injectable()
export class PayrollService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private notifications: NotificationsService,
    private currencies: CurrenciesService,
  ) {}

  // "Ish haqi" jadvali + detal modal uchun zarur foydalanuvchi maydonlari.
  private include = {
    user: {
      select: {
        id: true, fullName: true, avatar: true, region: true, district: true,
        passportSeries: true, passportNumber: true,
        position: { select: { name: true } },
      },
    },
  };

  /**
   * Generate/refresh payrolls for a month ("YYYY-MM") for all active employees.
   * fixedAmount = fixed salary; projectShareTotal = shares from projects completed that
   * month (these are already credited to balance at completion — shown here for the
   * income report). total = fixed + shares (monthly income figure).
   */
  async generate(month: string, actor: AuthUser) {
    if (!ACCT.includes(actor.role)) throw new ForbiddenException('Ruxsat yo\'q');
    if (!/^\d{4}-\d{2}$/.test(month)) throw new BadRequestException('Oy formati: YYYY-MM');

    const [start, end] = monthRange(month);
    const users = await this.prisma.user.findMany({ where: { status: 'active' } });
    const results: any[] = [];

    for (const u of users) {
      // Shares from projects completed this month where the user is a member
      const members = await this.prisma.projectMember.findMany({
        // ProjectMember soft-delete emas — ichki `project` relatsiyasiga deletedAt filtri
        // qo'lda qo'shiladi (middleware faqat top-level modelga ta'sir qiladi).
        where: { userId: u.id, project: { status: 'completed', updatedAt: { gte: start, lt: end }, deletedAt: null } },
      });
      let shares = 0n;
      for (const m of members) shares += await this.currencies.toUzs(m.shareAmount, m.shareCurrency);

      const fixed = u.fixedSalary;
      const total = fixed + shares;

      const payroll = await this.prisma.payroll.upsert({
        where: { userId_month: { userId: u.id, month } },
        update: { fixedAmount: fixed, projectShareTotal: shares, total },
        create: { userId: u.id, month, fixedAmount: fixed, projectShareTotal: shares, total, status: 'draft' },
        include: this.include,
      });
      results.push(payroll);
    }
    await this.audit.record({ userId: actor.id, entity: 'Payroll', action: 'GENERATE', newValue: { month, count: results.length } });
    return results;
  }

  async list(user: AuthUser, q: any) {
    const where: any = {};
    // Buxgalter/admin/superadmin + auditor (nazorat) hammasini ko'radi; qolganlar faqat o'zinikini.
    const seesAll = ACCT.includes(user.role) || user.role === 'auditor';
    if (!seesAll) where.userId = user.id;
    else if (q.userId) where.userId = Number(q.userId);
    if (q.month) where.month = q.month;
    if (q.search) where.user = { fullName: { contains: String(q.search), mode: 'insensitive' } };
    // Jami miqdori (tiyin) oralig'i
    if (q.totalMin || q.totalMax) {
      where.total = {};
      if (q.totalMin) where.total.gte = BigInt(q.totalMin);
      if (q.totalMax) where.total.lte = BigInt(q.totalMax);
    }
    // Faqat jarimasi bor yozuvlar (toggle)
    if (q.hasPenalty === '1' || q.hasPenalty === 'true') where.penalty = { gt: 0 };
    if (q.createdFrom || q.createdTo) {
      where.createdAt = {};
      if (q.createdFrom) where.createdAt.gte = new Date(q.createdFrom);
      if (q.createdTo) where.createdAt.lte = new Date(q.createdTo);
    }
    return this.prisma.payroll.findMany({ where, include: this.include, orderBy: [{ month: 'desc' }, { userId: 'asc' }] });
  }

  /** KPI bonus / jarima (ma'lumot uchun) ni yangilash — total/balansga ta'sir qilmaydi. */
  async update(id: number, dto: UpdatePayrollDto, actor: AuthUser) {
    if (!ACCT.includes(actor.role)) throw new ForbiddenException('Ruxsat yo\'q');
    const p = await this.prisma.payroll.findFirst({ where: { id } });
    if (!p) throw new NotFoundException('Topilmadi');
    const data: any = {};
    if (dto.kpiBonus !== undefined) data.kpiBonus = BigInt(dto.kpiBonus);
    if (dto.penalty !== undefined) data.penalty = BigInt(dto.penalty);
    const updated = await this.prisma.payroll.update({ where: { id }, data, include: this.include });
    await this.audit.record({ userId: actor.id, entity: 'Payroll', entityId: id, action: 'UPDATE', newValue: data });
    return updated;
  }

  /**
   * Buxgalter "Tasdiqlash" — tanlangan oyliklarni to'lash (draft/ready → paid).
   * Har biri: balansga fiks oylik qo'shiladi + ledger kredit yoziladi + xodimga bildirishnoma.
   * Atomik: faqat hali to'lanmaganlari o'tadi (dubl-bosish/parallel xavfsiz).
   */
  async payMany(dto: PayManyDto, actor: AuthUser, ip?: string) {
    if (!ACCT.includes(actor.role)) throw new ForbiddenException('To\'lovni buxgalter bajaradi');
    const ids = [...new Set(dto.ids)];
    let paid = 0;
    for (const id of ids) {
      const p = await this.prisma.payroll.findFirst({ where: { id } });
      if (!p || !['draft', 'ready'].includes(p.status)) continue;
      const ok = await this.prisma.$transaction(async (tx) => {
        const res = await tx.payroll.updateMany({
          where: { id, status: { in: ['draft', 'ready'] } },
          data: { status: 'paid', paidAt: new Date(), paidById: actor.id },
        });
        if (res.count === 0) return false;
        await tx.user.update({ where: { id: p.userId }, data: { balance: { increment: p.fixedAmount } } });
        await tx.ledgerEntry.create({
          data: { userId: p.userId, amount: p.fixedAmount, type: 'salary', direction: 'credit', note: `Oylik ${p.month}` },
        });
        return true;
      });
      if (ok) {
        paid++;
        await this.notifications.notify(p.userId, 'payroll_paid', { month: p.month, amount: p.fixedAmount.toString() });
      }
    }
    await this.audit.record({ userId: actor.id, entity: 'Payroll', action: 'PAY_MANY', ip, flagged: true, newValue: { ids, paid } });
    return { paid };
  }

  async markReady(id: number, actor: AuthUser) {
    if (!ACCT.includes(actor.role)) throw new ForbiddenException('Ruxsat yo\'q');
    const p = await this.prisma.payroll.findFirst({ where: { id } });
    if (!p) throw new NotFoundException('Topilmadi');
    if (p.status !== 'draft') throw new BadRequestException('Faqat draft holatdagini tayyorlash mumkin');
    // Atomik: faqat hali 'draft' bo'lsa o'tkazamiz (dubl-bosish bir marta ishlaydi).
    const res = await this.prisma.payroll.updateMany({ where: { id, status: 'draft' }, data: { status: 'ready' } });
    if (res.count === 0) throw new BadRequestException('Faqat draft holatdagini tayyorlash mumkin');
    return this.prisma.payroll.findFirst({ where: { id }, include: this.include });
  }

  /** Accountant pays the salary portion → credits balance + ledger (shares already credited at completion). */
  async pay(id: number, actor: AuthUser, ip?: string) {
    if (!ACCT.includes(actor.role)) throw new ForbiddenException('To\'lovni buxgalter bajaradi');
    const p = await this.prisma.payroll.findFirst({ where: { id } });
    if (!p) throw new NotFoundException('Topilmadi');
    if (p.status !== 'ready') throw new BadRequestException('Faqat "tayyor" holatdagini to\'lash mumkin');

    const updated = await this.prisma.$transaction(async (tx) => {
      // Atomik: faqat hali 'ready' bo'lsa to'laymiz — parallel ikki to'lov balansga ikki marta qo'shmaydi.
      const res = await tx.payroll.updateMany({ where: { id, status: 'ready' }, data: { status: 'paid', paidAt: new Date(), paidById: actor.id } });
      if (res.count === 0) throw new BadRequestException('Faqat "tayyor" holatdagini to\'lash mumkin');
      await tx.user.update({ where: { id: p.userId }, data: { balance: { increment: p.fixedAmount } } });
      await tx.ledgerEntry.create({
        data: { userId: p.userId, amount: p.fixedAmount, type: 'salary', direction: 'credit', note: `Oylik ${p.month}` },
      });
      return tx.payroll.findFirst({ where: { id }, include: this.include });
    });
    await this.audit.record({ userId: actor.id, entity: 'Payroll', entityId: id, action: 'PAY', ip });
    await this.notifications.notify(p.userId, 'payroll_paid', { month: p.month, amount: p.fixedAmount.toString() });
    return updated;
  }

  async confirm(id: number, user: AuthUser, ip?: string) {
    const p = await this.prisma.payroll.findFirst({ where: { id } });
    if (!p) throw new NotFoundException('Topilmadi');
    if (p.userId !== user.id) throw new ForbiddenException('Bu oylik sizniki emas');
    if (p.status !== 'paid') throw new BadRequestException('Faqat to\'langanni tasdiqlash mumkin');
    // Atomik: faqat hali 'paid' bo'lsa yopamiz (dubl-bosish bir marta ishlaydi).
    const res = await this.prisma.payroll.updateMany({ where: { id, status: 'paid' }, data: { status: 'closed', confirmedAt: new Date() } });
    if (res.count === 0) throw new BadRequestException('Faqat to\'langanni tasdiqlash mumkin');
    const updated = await this.prisma.payroll.findFirst({ where: { id }, include: this.include });
    await this.audit.record({ userId: user.id, entity: 'Payroll', entityId: id, action: 'CONFIRM', ip });
    return updated;
  }
}

function monthRange(month: string): [Date, Date] {
  const [y, m] = month.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 1));
  return [start, end];
}
