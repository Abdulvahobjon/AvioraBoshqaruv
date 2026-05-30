import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CurrenciesService } from '../currencies/currencies.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { CreateFinanceRequestDto, ReverseDto } from './dto/finance.dto';

@Injectable()
export class FinanceService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private notifications: NotificationsService,
    private currencies: CurrenciesService,
  ) {}

  private requestInclude = {
    user: { select: { id: true, fullName: true } },
    category: { select: { id: true, name: true } },
  };

  /** Step 1: employee/manager submits a request. Anti-fraud: no existing pending of same type. */
  async createRequest(dto: CreateFinanceRequestDto, user: AuthUser) {
    const open = await this.prisma.financeRequest.findFirst({
      where: { userId: user.id, type: dto.type, status: 'pending' },
    });
    if (open) {
      throw new BadRequestException('Sizda shu turdagi tasdiqlanmagan so\'rov bor. Avval uni yakunlang.');
    }

    const req = await this.prisma.financeRequest.create({
      data: {
        userId: user.id,
        amount: BigInt(dto.amount),
        currency: dto.currency || 'UZS',
        type: dto.type,
        categoryId: dto.categoryId ?? null,
        reason: dto.reason,
        card: dto.card ?? null,
        status: 'pending',
      },
      include: this.requestInclude,
    });
    await this.audit.record({ userId: user.id, entity: 'FinanceRequest', entityId: req.id, action: 'CREATE', newValue: { amount: req.amount, type: req.type } });
    // Notify accountants about the new request
    const accountants = await this.prisma.user.findMany({ where: { role: 'accountant', status: 'active' }, select: { id: true } });
    for (const a of accountants) {
      await this.notifications.notify(a.id, 'expense_request', { requestId: req.id, amount: req.amount.toString(), requester: req.user?.fullName });
    }
    return req;
  }

  async listRequests(user: AuthUser, q: any) {
    const where: any = {};
    // Accountant/admin/superadmin see all; others see only their own.
    if (!['accountant', 'admin', 'superadmin'].includes(user.role)) {
      where.userId = user.id;
    } else if (q.userId) {
      where.userId = Number(q.userId);
    }
    if (q.status) where.status = q.status;
    if (q.type) where.type = q.type;

    return this.prisma.financeRequest.findMany({
      where,
      include: this.requestInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Step 2: accountant pays. Creates a ledger debit; amount enters Pending until confirmed. */
  async pay(id: number, actor: AuthUser, ip?: string) {
    if (!['accountant', 'superadmin', 'admin'].includes(actor.role)) {
      throw new ForbiddenException('To\'lovni faqat buxgalter bajaradi');
    }
    const req = await this.prisma.financeRequest.findFirst({ where: { id } });
    if (!req) throw new NotFoundException('So\'rov topilmadi');
    if (req.status !== 'pending') throw new BadRequestException('Faqat kutilayotgan so\'rovni to\'lash mumkin');

    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.financeRequest.update({ where: { id }, data: { status: 'paid', paidAt: new Date() } });
      await tx.ledgerEntry.create({
        data: {
          requestId: id, userId: req.userId, amount: req.amount,
          type: req.type, direction: 'debit',
          note: `To'lov: ${req.reason}`,
        },
      });
      return u;
    });
    await this.audit.record({ userId: actor.id, entity: 'FinanceRequest', entityId: id, action: 'PAY', ip });
    await this.notifications.notify(req.userId, 'request_paid', { requestId: id, amount: req.amount.toString() });
    return updated;
  }

  /** Step 3: requester confirms receipt → closed. Salary-type withdrawals deduct from balance. */
  async confirm(id: number, user: AuthUser, ip?: string) {
    const req = await this.prisma.financeRequest.findFirst({ where: { id } });
    if (!req) throw new NotFoundException('So\'rov topilmadi');
    if (req.userId !== user.id) throw new ForbiddenException('Bu so\'rov sizniki emas');
    if (req.status !== 'paid') throw new BadRequestException('Faqat to\'langan so\'rovni tasdiqlash mumkin');

    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.financeRequest.update({ where: { id }, data: { status: 'closed', confirmedAt: new Date() } });
      // Salary withdrawals reduce the user's owed balance.
      if (req.type === 'salary') {
        const uzs = await this.currencies.toUzs(req.amount, req.currency);
        await tx.user.update({ where: { id: req.userId }, data: { balance: { decrement: uzs } } });
      }
      return u;
    });
    await this.audit.record({ userId: user.id, entity: 'FinanceRequest', entityId: id, action: 'CONFIRM', ip });
    return updated;
  }

  async reject(id: number, actor: AuthUser, ip?: string) {
    if (!['accountant', 'superadmin', 'admin'].includes(actor.role)) {
      throw new ForbiddenException('Ruxsat yo\'q');
    }
    const req = await this.prisma.financeRequest.findFirst({ where: { id } });
    if (!req) throw new NotFoundException('So\'rov topilmadi');
    if (req.status !== 'pending') throw new BadRequestException('Faqat kutilayotgan so\'rovni rad etish mumkin');
    const updated = await this.prisma.financeRequest.update({ where: { id }, data: { status: 'rejected' } });
    await this.audit.record({ userId: actor.id, entity: 'FinanceRequest', entityId: id, action: 'REJECT', ip });
    await this.notifications.notify(req.userId, 'request_rejected', { requestId: id });
    return updated;
  }

  /** Balance summary for a user: available balance + pending (paid, unconfirmed). */
  async balance(user: AuthUser) {
    const u = await this.prisma.user.findFirst({ where: { id: user.id }, select: { balance: true } });
    const pendingReqs = await this.prisma.financeRequest.findMany({
      where: { userId: user.id, status: 'paid' },
      select: { amount: true, currency: true },
    });
    let pending = 0n;
    for (const r of pendingReqs) pending += await this.currencies.toUzs(r.amount, r.currency);
    return { balance: (u?.balance ?? 0n).toString(), pending: pending.toString() };
  }

  // ── Ledger (immutable; correction only via reversal) ──
  async ledger(q: any) {
    const where: any = {};
    if (q.userId) where.userId = Number(q.userId);
    if (q.type) where.type = q.type;
    return this.prisma.ledgerEntry.findMany({
      where,
      include: {
        user: { select: { id: true, fullName: true } },
        request: { select: { id: true, reason: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  /** Correct a wrong ledger entry by posting an opposite (reversal) entry. Never deletes. */
  async reverse(entryId: number, dto: ReverseDto, actor: AuthUser, ip?: string) {
    if (!['accountant', 'superadmin', 'admin'].includes(actor.role)) {
      throw new ForbiddenException('Ruxsat yo\'q');
    }
    const entry = await this.prisma.ledgerEntry.findFirst({ where: { id: entryId } });
    if (!entry) throw new NotFoundException('Yozuv topilmadi');
    if (entry.isReversal) throw new BadRequestException('Teskari yozuvni qayta teskari qilib bo\'lmaydi');

    const reversal = await this.prisma.ledgerEntry.create({
      data: {
        requestId: entry.requestId,
        userId: entry.userId,
        amount: entry.amount,
        type: 'reversal',
        direction: entry.direction === 'debit' ? 'credit' : 'debit',
        isReversal: true,
        reversedEntryId: entry.id,
        note: dto.note || `Teskari yozuv (#${entry.id})`,
      },
    });
    await this.audit.record({ userId: actor.id, entity: 'LedgerEntry', entityId: reversal.id, action: 'REVERSE', ip, newValue: { reversedEntryId: entry.id } });
    return reversal;
  }
}
