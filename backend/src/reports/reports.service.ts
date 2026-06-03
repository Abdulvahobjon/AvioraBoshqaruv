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

  // ─────────────── XODIM BO'YICHA HISOBOT ───────────────

  private numFrom(q: any, key: string): number | undefined {
    const v = q[key];
    return v !== undefined && v !== '' && v !== null ? Number(v) : undefined;
  }
  private inRange(v: number, from?: number, to?: number) {
    if (from !== undefined && v < from) return false;
    if (to !== undefined && v > to) return false;
    return true;
  }
  private parseIds(v: any): number[] {
    if (!v) return [];
    return String(v).split(',').map((x) => Number(x.trim())).filter((x) => Number.isFinite(x) && x > 0);
  }

  /** Xodim bo'yicha keng hisobot: maosh, balans, loyiha/vazifa/yig'ilish/so'rov agregatlari. */
  async employeeReport(q: any) {
    const where: any = { deletedAt: null };
    const ids = this.parseIds(q.userIds);
    if (ids.length) where.id = { in: ids };
    if (q.positionId) where.positionId = Number(q.positionId);
    if (q.region) where.region = q.region;
    if (q.search) where.fullName = { contains: q.search, mode: 'insensitive' };
    if (q.joinedFrom || q.joinedTo) {
      where.createdAt = {};
      if (q.joinedFrom) where.createdAt.gte = new Date(q.joinedFrom);
      if (q.joinedTo) where.createdAt.lte = new Date(q.joinedTo);
    }
    const salaryFrom = this.numFrom(q, 'salaryFrom');
    const salaryTo = this.numFrom(q, 'salaryTo');
    if (salaryFrom !== undefined || salaryTo !== undefined) {
      where.fixedSalary = {};
      if (salaryFrom !== undefined) where.fixedSalary.gte = BigInt(Math.round(salaryFrom * 100));
      if (salaryTo !== undefined) where.fixedSalary.lte = BigInt(Math.round(salaryTo * 100));
    }
    const balanceFrom = this.numFrom(q, 'balanceFrom');
    const balanceTo = this.numFrom(q, 'balanceTo');
    if (balanceFrom !== undefined || balanceTo !== undefined) {
      where.balance = {};
      if (balanceFrom !== undefined) where.balance.gte = BigInt(Math.round(balanceFrom * 100));
      if (balanceTo !== undefined) where.balance.lte = BigInt(Math.round(balanceTo * 100));
    }

    const users = await this.prisma.user.findMany({
      where,
      include: {
        position: { select: { name: true } },
        _count: { select: { projectMembers: true } },
        assignedTasks: { where: { deletedAt: null }, select: { status: true } },
        meetingAttendance: { select: { attended: true, absenceReason: true } },
        financeRequests: { select: { amount: true, currency: true } },
        payrolls: { select: { total: true } },
      },
      orderBy: { fullName: 'asc' },
    });

    let rows: any[] = [];
    for (const u of users) {
      const tasks = { todo: 0, in_progress: 0, overdue: 0, done: 0, production: 0, checked: 0, rejected: 0 };
      for (const t of u.assignedTasks) tasks[t.status] = (tasks[t.status] || 0) + 1;

      let mAttended = 0, mExcused = 0, mUnexcused = 0;
      for (const a of u.meetingAttendance) {
        if (a.attended) mAttended++;
        else if (a.absenceReason && a.absenceReason.trim()) mExcused++;
        else mUnexcused++;
      }

      let reqTotal = 0n;
      for (const r of u.financeRequests) reqTotal += await this.currencies.toUzs(r.amount, r.currency);
      const payrollTotal = u.payrolls.reduce((a, p) => a + p.total, 0n);

      rows.push({
        id: u.id,
        fullName: u.fullName,
        position: u.position?.name || '—',
        region: u.region || '—',
        district: u.district || '—',
        phone: u.phone || '—',
        fixedSalary: n(u.fixedSalary),
        balance: n(u.balance),
        projectsCount: u._count.projectMembers,
        tasksTotal: u.assignedTasks.length,
        tasks,
        meetingsTotal: u.meetingAttendance.length,
        meetingsAttended: mAttended,
        meetingsExcused: mExcused,
        meetingsUnexcused: mUnexcused,
        requestsCount: u.financeRequests.length,
        requestsTotal: n(reqTotal),
        payrollTotal: n(payrollTotal),
      });
    }

    // Agregat (sanoq) oralig'i bo'yicha filtrlar
    const projF = this.numFrom(q, 'projectsFrom'), projT = this.numFrom(q, 'projectsTo');
    const taskF = this.numFrom(q, 'tasksFrom'), taskT = this.numFrom(q, 'tasksTo');
    const meetF = this.numFrom(q, 'meetingsFrom'), meetT = this.numFrom(q, 'meetingsTo');
    const reqF = this.numFrom(q, 'requestsFrom'), reqT = this.numFrom(q, 'requestsTo');
    rows = rows.filter((r) =>
      this.inRange(r.projectsCount, projF, projT) &&
      this.inRange(r.tasksTotal, taskF, taskT) &&
      this.inRange(r.meetingsTotal, meetF, meetT) &&
      this.inRange(r.requestsCount, reqF, reqT),
    );

    return { rows, count: rows.length };
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
