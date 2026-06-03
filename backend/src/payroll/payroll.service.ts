import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CurrenciesService } from '../currencies/currencies.service';
import { AuthUser } from '../common/decorators/current-user.decorator';

const ACCT = ['accountant', 'superadmin', 'admin'];

@Injectable()
export class PayrollService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private notifications: NotificationsService,
    private currencies: CurrenciesService,
  ) {}

  private include = { user: { select: { id: true, fullName: true } } };

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
        where: { userId: u.id, project: { status: 'completed', updatedAt: { gte: start, lt: end } } },
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
    if (!ACCT.includes(user.role)) where.userId = user.id;
    else if (q.userId) where.userId = Number(q.userId);
    if (q.month) where.month = q.month;
    return this.prisma.payroll.findMany({ where, include: this.include, orderBy: [{ month: 'desc' }, { userId: 'asc' }] });
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
      const res = await tx.payroll.updateMany({ where: { id, status: 'ready' }, data: { status: 'paid', paidAt: new Date() } });
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
