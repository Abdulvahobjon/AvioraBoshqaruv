import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CurrenciesService } from '../currencies/currencies.service';
import { AuthUser } from '../common/decorators/current-user.decorator';

const n = (b: bigint) => Number(b) / 100; // tiyin -> unit for display/export
const MONTHS_SHORT = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];

interface Range {
  from?: string;
  to?: string;
}

@Injectable()
export class ReportsService {
  constructor(
    private prisma: PrismaService,
    private currencies: CurrenciesService,
  ) {}

  private dateWhere(r: Range, field = 'createdAt') {
    const w: any = {};
    if (r.from || r.to) {
      w[field] = {};
      if (r.from) w[field].gte = new Date(r.from);
      if (r.to) w[field].lte = new Date(r.to);
    }
    return w;
  }

  /** Per-project budget: price vs shares vs profit (all in UZS). */
  async projects(r: Range) {
    const projects = await this.prisma.project.findMany({
      where: { ...this.dateWhere(r) },
      include: { members: true, client: { select: { name: true } }, type: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const rows: any[] = [];
    for (const p of projects) {
      const priceUzs = await this.currencies.toUzs(p.price, p.currency);
      let sharesUzs = 0n;
      for (const m of p.members) sharesUzs += await this.currencies.toUzs(m.shareAmount, m.shareCurrency);
      const profitUzs = priceUzs - sharesUzs;
      rows.push({
        id: p.id,
        name: p.name,
        client: p.client?.name || '—',
        type: p.type?.name || '—',
        status: p.status,
        price: n(priceUzs),
        shares: n(sharesUzs),
        profit: n(profitUzs),
      });
    }
    const totals = rows.reduce(
      (a, x) => ({ price: a.price + x.price, shares: a.shares + x.shares, profit: a.profit + x.profit }),
      { price: 0, shares: 0, profit: 0 },
    );
    return { rows, totals };
  }

  /** Company finance summary: income (client payments) vs expenses vs payroll → net. */
  async finance(r: Range) {
    const payments = await this.prisma.clientPayment.findMany({ where: this.dateWhere(r, 'date') });
    let income = 0n;
    for (const p of payments) income += await this.currencies.toUzs(p.amount, p.currency);

    const expenses = await this.prisma.expense.findMany({ where: this.dateWhere(r, 'date') });
    const expenseTotal = expenses.reduce((a, e) => a + e.amountUzs, 0n);

    const payrolls = await this.prisma.payroll.findMany({ where: { status: { in: ['paid', 'closed'] } } });
    const payrollTotal = payrolls.reduce((a, p) => a + p.fixedAmount, 0n);

    // Kutilayotgan daromad: hali to'lanmagan va bekor qilinmagan loyihalar narxi (UZS).
    // Ya'ni loyihalar ortidan kelajakda kelishi kutilayotgan umumiy mablag'.
    const pendingProjects = await this.prisma.project.findMany({
      where: { paymentStatus: 'unpaid', status: { not: 'cancelled' } },
      select: { price: true, currency: true },
    });
    let expectedIncome = 0n;
    for (const p of pendingProjects) expectedIncome += await this.currencies.toUzs(p.price, p.currency);

    const net = income - expenseTotal - payrollTotal;
    return {
      income: n(income),
      expenses: n(expenseTotal),
      payroll: n(payrollTotal),
      net: n(net),
      expectedIncome: n(expectedIncome),
    };
  }

  /** Per-employee earnings + workload. */
  async employees() {
    const users = await this.prisma.user.findMany({
      where: { role: { in: ['employee', 'manager'] } },
      include: {
        _count: { select: { assignedTasks: true } },
        ledgerEntries: { where: { direction: 'credit' }, select: { amount: true } },
      },
    });
    return users.map((u) => ({
      id: u.id,
      fullName: u.fullName,
      role: u.role,
      balance: n(u.balance),
      earned: n(u.ledgerEntries.reduce((a, l) => a + l.amount, 0n)),
      tasks: u._count.assignedTasks,
    }));
  }

  // ─────────────── DASHBOARD (rolga qarab, hammasi DB'dan) ───────────────

  /** Rolga mos bosh sahifa ma'lumotlari. Hamma sanoq/statistika serverda hisoblanadi. */
  async dashboard(user: AuthUser) {
    if (user.role === 'employee') return this.employeeDashboard(user);
    if (user.role === 'accountant') return this.accountantDashboard();
    return this.adminDashboard();
  }

  /** So'nggi `months` oy uchun oylik tushum trendi (UZS, unit). userId berilsa — shaxsiy daromad (ledger credit). */
  private async incomeTrend(months = 6, userId?: number) {
    const now = new Date();
    const out: { month: string; label: string; value: number }[] = [];
    for (let i = months - 1; i >= 0; i--) {
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
      let sum = 0n;
      if (userId) {
        const entries = await this.prisma.ledgerEntry.findMany({
          where: { userId, direction: 'credit', createdAt: { gte: start, lt: end } },
          select: { amount: true },
        });
        for (const e of entries) sum += e.amount;
      } else {
        const payments = await this.prisma.clientPayment.findMany({
          where: { date: { gte: start, lt: end } },
          select: { amount: true, currency: true },
        });
        for (const p of payments) sum += await this.currencies.toUzs(p.amount, p.currency);
      }
      out.push({
        month: `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}`,
        label: MONTHS_SHORT[start.getUTCMonth()],
        value: n(sum),
      });
    }
    return out;
  }

  /** Loyihalarni status bo'yicha real sanog'i (soft-delete hisobga olingan). */
  private async projectCounts() {
    const grouped = await this.prisma.project.groupBy({
      by: ['status'],
      where: { deletedAt: null },
      _count: { _all: true },
    });
    const counts: Record<string, number> = { planning: 0, active: 0, overdue: 0, completed: 0, cancelled: 0 };
    let total = 0;
    for (const g of grouped) { counts[g.status] = g._count._all; total += g._count._all; }
    return { ...counts, total };
  }

  private async adminDashboard() {
    const [finance, projectCounts, recentProjects, incomeTrend] = await Promise.all([
      this.finance({}),
      this.projectCounts(),
      this.prisma.project.findMany({ orderBy: { createdAt: 'desc' }, take: 6, select: { id: true, name: true, deadline: true, status: true } }),
      this.incomeTrend(6),
    ]);
    return { role: 'admin', finance, projectCounts, recentProjects, incomeTrend };
  }

  private async accountantDashboard() {
    const [finance, pendingRequests, incomeTrend] = await Promise.all([
      this.finance({}),
      this.prisma.financeRequest.count({ where: { status: 'pending' } }),
      this.incomeTrend(6),
    ]);
    return { role: 'accountant', finance, pendingRequests, incomeTrend };
  }

  private async employeeDashboard(user: AuthUser) {
    const u = await this.prisma.user.findFirst({ where: { id: user.id }, select: { balance: true } });
    const pendingReqs = await this.prisma.financeRequest.findMany({
      where: { userId: user.id, status: 'paid' },
      select: { amount: true, currency: true },
    });
    let pending = 0n;
    for (const r of pendingReqs) pending += await this.currencies.toUzs(r.amount, r.currency);

    const myProjects = await this.prisma.project.findMany({
      where: { members: { some: { userId: user.id } } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, deadline: true, status: true },
    });
    const earningTrend = await this.incomeTrend(6, user.id);

    return {
      role: 'employee',
      balance: n(u?.balance ?? 0n),
      pending: n(pending),
      myProjectCount: myProjects.length,
      myProjects: myProjects.slice(0, 6),
      earningTrend,
    };
  }
}
