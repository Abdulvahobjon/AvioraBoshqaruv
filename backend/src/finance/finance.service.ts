import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CurrenciesService } from '../currencies/currencies.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { CreateFinanceRequestDto, PayRequestDto, RejectRequestDto, ReverseDto } from './dto/finance.dto';

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
    project: { select: { id: true, name: true } },
    paidByUser: { select: { id: true, fullName: true } },
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
        projectId: dto.projectId ?? null,
        reason: dto.reason,
        card: dto.card ?? null,
        paymentMethod: dto.paymentMethod ?? null,
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
    const where: any = { deletedAt: null };
    const seesAll = ['accountant', 'admin', 'superadmin', 'auditor'].includes(user.role);
    // Accountant/admin/superadmin/auditor see all; others see only their own.
    // `mine=1` — moliyaviy rol o'zining so'rovlarini ham filtrlay oladi ("Mening so'rovlarim").
    if (!seesAll || q.mine === '1' || q.mine === 'true') {
      where.userId = user.id;
    } else if (q.userId) {
      where.userId = Number(q.userId);
    }
    if (q.status) where.status = q.status;
    if (q.type) where.type = q.type;
    if (q.categoryId) where.categoryId = Number(q.categoryId);
    if (q.projectId) where.projectId = Number(q.projectId);
    if (q.search) where.user = { fullName: { contains: String(q.search), mode: 'insensitive' } };

    // Summa oralig'i (tiyin)
    if (q.amountMin || q.amountMax) {
      where.amount = {};
      if (q.amountMin) where.amount.gte = BigInt(q.amountMin);
      if (q.amountMax) where.amount.lte = BigInt(q.amountMax);
    }
    // Sana oraliqlari: yaratilgan / to'langan / tasdiqlangan
    const range = (field: string, from?: string, to?: string) => {
      if (!from && !to) return;
      where[field] = {};
      if (from) where[field].gte = new Date(from);
      if (to) where[field].lte = new Date(to);
    };
    range('createdAt', q.createdFrom, q.createdTo);
    range('paidAt', q.paidFrom, q.paidTo);
    range('confirmedAt', q.confirmedFrom, q.confirmedTo);

    return this.prisma.financeRequest.findMany({
      where,
      include: this.requestInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Step 2: accountant pays. Creates a ledger debit; amount enters Pending until confirmed. */
  async pay(id: number, dto: PayRequestDto, actor: AuthUser, ip?: string) {
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
      const res = await tx.financeRequest.updateMany({
        where: { id, status: 'pending' },
        data: {
          status: 'paid',
          paidAt: new Date(),
          paidBy: actor.id,
          paymentMethod: dto?.paymentMethod ?? req.paymentMethod ?? 'card',
          // Chek/kvitansiya fayllari (0-3 ta) — buxgalter to'lov qilganda yuklaydi.
          ...(dto?.receipts && dto.receipts.length ? { receipts: dto.receipts.slice(0, 3) } : {}),
        },
      });
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

  async reject(id: number, dto: RejectRequestDto, actor: AuthUser, ip?: string) {
    if (!['accountant', 'superadmin', 'admin'].includes(actor.role)) {
      throw new ForbiddenException('Ruxsat yo\'q');
    }
    const req = await this.prisma.financeRequest.findFirst({ where: { id } });
    if (!req) throw new NotFoundException('So\'rov topilmadi');
    if (req.status !== 'pending') throw new BadRequestException('Faqat kutilayotgan so\'rovni rad etish mumkin');
    // Atomik: faqat hali 'pending' bo'lsa rad etamiz (dubl-bosish bir marta ishlaydi).
    const res = await this.prisma.financeRequest.updateMany({
      where: { id, status: 'pending' },
      data: { status: 'rejected', canceledAt: new Date(), cancelReason: dto?.cancelReason ?? null },
    });
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

  // ── Ledger (immutable; correction only via reversal) — "Tarix" sahifasi shu yerdan o'qiydi ──
  async ledger(q: any) {
    const where: any = {};
    if (q.userId) where.userId = Number(q.userId);
    if (q.type) where.type = q.type;
    if (q.direction) where.direction = q.direction;
    if (q.search) where.user = { fullName: { contains: String(q.search), mode: 'insensitive' } };
    if (q.amountMin || q.amountMax) {
      where.amount = {};
      if (q.amountMin) where.amount.gte = BigInt(q.amountMin);
      if (q.amountMax) where.amount.lte = BigInt(q.amountMax);
    }
    if (q.dateFrom || q.dateTo) {
      where.createdAt = {};
      if (q.dateFrom) where.createdAt.gte = new Date(q.dateFrom);
      if (q.dateTo) where.createdAt.lte = new Date(q.dateTo);
    }
    return this.prisma.ledgerEntry.findMany({
      where,
      include: {
        user: {
          select: {
            id: true, fullName: true, avatar: true, region: true, district: true,
            fixedSalary: true, passportSeries: true, passportNumber: true,
            position: { select: { name: true } },
          },
        },
        request: { select: { id: true, reason: true, category: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 300,
    });
  }

  /** Correct a wrong ledger entry by posting an opposite (reversal) entry. Never deletes. */
  async reverse(entryId: number, dto: ReverseDto, actor: AuthUser, ip?: string) {
    if (!['accountant', 'superadmin', 'admin'].includes(actor.role)) {
      throw new ForbiddenException('Ruxsat yo\'q');
    }
    // Dastlabki tezkor tekshiruv (aniq xabar uchun) — yakuniy/atomik tekshiruv
    // tranzaksiya ichida (UNIQUE + qayta o'qish) amalga oshadi.
    const pre = await this.prisma.ledgerEntry.findFirst({ where: { id: entryId } });
    if (!pre) throw new NotFoundException('Yozuv topilmadi');
    if (pre.isReversal) throw new BadRequestException('Teskari yozuvni qayta teskari qilib bo\'lmaydi');

    let reversal;
    try {
      reversal = await this.prisma.$transaction(async (tx) => {
        // Yozuv va bog'liq so'rov holatini tranzaksiya ICHIDA qayta o'qiymiz —
        // aks holda balans deltasi eskirgan (TOCTOU) snapshotdan hisoblanardi.
        const entry = await tx.ledgerEntry.findFirst({ where: { id: entryId } });
        if (!entry) throw new NotFoundException('Yozuv topilmadi');
        if (entry.isReversal) throw new BadRequestException('Teskari yozuvni qayta teskari qilib bo\'lmaydi');
        const already = await tx.ledgerEntry.findFirst({ where: { reversedEntryId: entry.id } });
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
              ? await tx.financeRequest.findFirst({ where: { id: entry.requestId }, select: { status: true } })
              : null;
            if (linked?.status === 'closed') balanceDelta = entry.amount;
          }
        }

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
        return { entry: r, reversedEntryId: entry.id, balanceDelta };
      });
    } catch (e: any) {
      if (e?.code === 'P2002') throw new BadRequestException('Bu yozuv allaqachon teskari qilingan');
      throw e;
    }
    await this.audit.record({ userId: actor.id, entity: 'LedgerEntry', entityId: reversal.entry.id, action: 'REVERSE', ip, flagged: true, newValue: { reversedEntryId: reversal.reversedEntryId, balanceDelta: reversal.balanceDelta.toString() } });
    return reversal.entry;
  }
}
