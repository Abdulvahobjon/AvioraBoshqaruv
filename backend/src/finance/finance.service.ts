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
    // Accountant/admin/superadmin/auditor see all; others see only their own.
    if (!['accountant', 'admin', 'superadmin', 'auditor'].includes(user.role)) {
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

    // Ledger har doim UZS (tiyin) saqlanadi — aralash valyutali yozuvlar jamlanganda
    // noto'g'ri bo'lmasligi uchun (balansga ta'sir ham confirm'da UZS bilan bo'ladi).
    const uzs = await this.currencies.toUzs(req.amount, req.currency);
    const updated = await this.prisma.$transaction(async (tx) => {
      // Atomik holat almashinuvi: faqat hali 'pending' bo'lsa to'laymiz — parallel ikki to'lov dubl ledger yozmaydi.
      const res = await tx.financeRequest.updateMany({ where: { id, status: 'pending' }, data: { status: 'paid', paidAt: new Date() } });
      if (res.count === 0) throw new BadRequestException('Faqat kutilayotgan so\'rovni to\'lash mumkin');
      await tx.ledgerEntry.create({
        data: {
          requestId: id, userId: req.userId, amount: uzs,
          type: req.type, direction: 'debit',
          note: `To'lov: ${req.reason}`,
        },
      });
      return tx.financeRequest.findFirst({ where: { id } });
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
      // Atomik: faqat hali 'paid' bo'lsa yopamiz — parallel ikki tasdiq balansni ikki marta kamaytirmaydi.
      const res = await tx.financeRequest.updateMany({ where: { id, status: 'paid' }, data: { status: 'closed', confirmedAt: new Date() } });
      if (res.count === 0) throw new BadRequestException('Faqat to\'langan so\'rovni tasdiqlash mumkin');
      // Salary withdrawals reduce the user's owed balance.
      if (req.type === 'salary') {
        const uzs = await this.currencies.toUzs(req.amount, req.currency);
        await tx.user.update({ where: { id: req.userId }, data: { balance: { decrement: uzs } } });
      }
      return tx.financeRequest.findFirst({ where: { id } });
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
    // Atomik: faqat hali 'pending' bo'lsa rad etamiz (dubl-bosish bir marta ishlaydi).
    const res = await this.prisma.financeRequest.updateMany({ where: { id, status: 'pending' }, data: { status: 'rejected' } });
    if (res.count === 0) throw new BadRequestException('Faqat kutilayotgan so\'rovni rad etish mumkin');
    const updated = await this.prisma.financeRequest.findFirst({ where: { id } });
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
    // Bir yozuvni faqat bir marta teskari qilish mumkin (dubl-bosishdan himoya).
    // Yakuniy himoya — reversedEntryId ustidagi UNIQUE constraint (quyida P2002 ushlanadi);
    // bu erdagi tekshiruv tezkor/aniq xabar uchun.
    const already = await this.prisma.ledgerEntry.findFirst({ where: { reversedEntryId: entry.id } });
    if (already) throw new BadRequestException('Bu yozuv allaqachon teskari qilingan');

    // Balansga ta'sirni ham teskari qaytaramiz — aks holda ledger yig'indisi balansga mos kelmaydi:
    //  • kredit (oylik / loyiha ulushi) balansni OSHIRGAN  → teskarisi KAMAYTIRADI
    //  • debit (oylik yechib olish, faqat tasdiqlangan so'rov) balansni KAMAYTIRGAN → teskarisi OSHIRADI
    // company/other turdagi so'rovlar balansga umuman ta'sir qilmaydi (confirm faqat 'salary'da kamaytiradi).
    let balanceDelta = 0n;
    if (entry.userId) {
      if (entry.direction === 'credit' && ['salary', 'project_share'].includes(entry.type)) {
        balanceDelta = -entry.amount;
      } else if (entry.direction === 'debit' && entry.type === 'salary') {
        // Yechib olish balansni faqat so'rov TASDIQLANGANDA (closed) kamaytirgan.
        const linked = entry.requestId
          ? await this.prisma.financeRequest.findFirst({ where: { id: entry.requestId }, select: { status: true } })
          : null;
        if (linked?.status === 'closed') balanceDelta = entry.amount;
      }
    }

    let reversal;
    try {
      reversal = await this.prisma.$transaction(async (tx) => {
        // UNIQUE(reversed_entry_id) ikki bir vaqtli urinishdan birini P2002 bilan rad etadi.
        const r = await tx.ledgerEntry.create({
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
        if (balanceDelta !== 0n && entry.userId) {
          await tx.user.update({ where: { id: entry.userId }, data: { balance: { increment: balanceDelta } } });
        }
        return r;
      });
    } catch (e: any) {
      if (e?.code === 'P2002') throw new BadRequestException('Bu yozuv allaqachon teskari qilingan');
      throw e;
    }
    await this.audit.record({ userId: actor.id, entity: 'LedgerEntry', entityId: reversal.id, action: 'REVERSE', ip, flagged: true, newValue: { reversedEntryId: entry.id, balanceDelta: balanceDelta.toString() } });
    return reversal;
  }
}
