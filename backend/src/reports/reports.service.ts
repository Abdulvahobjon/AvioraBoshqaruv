import { Injectable, NotFoundException } from '@nestjs/common';
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
      if (r.to) {
        const to = new Date(r.to);
        // "YYYY-MM-DD" (vaqtsiz) kelsa, o'sha kun yozuvlari tushib qolmasligi uchun
        // chegarani kun oxirigacha kengaytiramiz (aks holda lte=00:00 bo'lib qoladi).
        if (/^\d{4}-\d{2}-\d{2}$/.test(r.to)) to.setUTCHours(23, 59, 59, 999);
        w[field].lte = to;
      }
    }
    return w;
  }

  /**
   * UZS kursini BIR MARTA olib, sinxron konverter qaytaradi (N+1 await oldini olish).
   * Currency faqat UZS/USD, shuning uchun bitta USD kurs yetarli.
   */
  private async uzsConverter() {
    const usdRate = BigInt(await this.currencies.getRate('USD'));
    return (amount: bigint, code: string) => (code === 'USD' ? amount * usdRate : amount);
  }

  /** Per-project budget: price vs shares vs actual expenses vs profit/variance (all in UZS). */
  async projects(r: Range) {
    const projects = await this.prisma.project.findMany({
      where: { ...this.dateWhere(r) },
      include: { members: true, client: { select: { name: true } }, type: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    // Loyihaga bog'langan real xarajatlar (amountUzs allaqachon so'mda)
    const expGrouped = await this.prisma.expense.groupBy({
      by: ['projectId'],
      where: { projectId: { not: null } },
      _sum: { amountUzs: true },
    });
    const expByProject = new Map<number, bigint>();
    for (const g of expGrouped) expByProject.set(g.projectId as number, g._sum.amountUzs ?? 0n);

    const toUzs = await this.uzsConverter();
    const rows: any[] = [];
    for (const p of projects) {
      const priceUzs = toUzs(p.price, p.currency);
      let sharesUzs = 0n;
      for (const m of p.members) sharesUzs += toUzs(m.shareAmount, m.shareCurrency);
      const expensesUzs = expByProject.get(p.id) ?? 0n;
      const profitUzs = priceUzs - sharesUzs - expensesUzs; // real foyda (ulush + xarajat ayrilgan)
      const spentUzs = sharesUzs + expensesUzs;              // jami sarflangan
      rows.push({
        id: p.id,
        name: p.name,
        client: p.client?.name || '—',
        type: p.type?.name || '—',
        status: p.status,
        price: n(priceUzs),
        shares: n(sharesUzs),
        expenses: n(expensesUzs),
        spent: n(spentUzs),
        profit: n(profitUzs),
        variance: n(priceUzs - spentUzs), // byudjet farqi (musbat = byudjet ichida)
      });
    }
    const totals = rows.reduce(
      (a, x) => ({
        price: a.price + x.price, shares: a.shares + x.shares,
        expenses: a.expenses + x.expenses, spent: a.spent + x.spent, profit: a.profit + x.profit,
      }),
      { price: 0, shares: 0, expenses: 0, spent: 0, profit: 0 },
    );
    return { rows, totals };
  }

  /** Loyiha budjeti burn-down: byudjet (price) ga nisbatan kümülativ sarflangan mablag' (xarajatlar) vaqt bo'yicha. */
  async projectBudget(projectId: number) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId },
      include: { members: true },
    });
    if (!project) throw new NotFoundException('Loyiha topilmadi');

    const toUzs = await this.uzsConverter();
    const budgetUzs = toUzs(project.price, project.currency);
    let sharesUzs = 0n;
    for (const m of project.members) sharesUzs += toUzs(m.shareAmount, m.shareCurrency);

    const expenses = await this.prisma.expense.findMany({
      where: { projectId },
      select: { amountUzs: true, date: true, note: true },
      orderBy: { date: 'asc' },
    });
    const expensesTotal = expenses.reduce((a, e) => a + e.amountUzs, 0n);

    // Burn-down: har bir xarajatdan keyin qolgan byudjet
    let cumulative = 0n;
    const series = expenses.map((e) => {
      cumulative += e.amountUzs;
      return {
        date: e.date,
        note: e.note || '—',
        spent: n(e.amountUzs),
        cumulative: n(cumulative),
        remaining: n(budgetUzs - sharesUzs - cumulative),
      };
    });

    const totalSpent = sharesUzs + expensesTotal;
    return {
      projectId,
      name: project.name,
      budget: n(budgetUzs),
      shares: n(sharesUzs),
      expenses: n(expensesTotal),
      totalSpent: n(totalSpent),
      remaining: n(budgetUzs - totalSpent),
      variance: n(budgetUzs - totalSpent),
      series,
    };
  }

  /** Company finance summary: income (client payments) vs expenses vs payroll → net. */
  async finance(r: Range) {
    const toUzs = await this.uzsConverter();
    const payments = await this.prisma.clientPayment.findMany({ where: this.dateWhere(r, 'date') });
    let income = 0n;
    for (const p of payments) income += toUzs(p.amount, p.currency);

    const expenses = await this.prisma.expense.findMany({ where: this.dateWhere(r, 'date') });
    const expenseTotal = expenses.reduce((a, e) => a + e.amountUzs, 0n);

    // Oraliq berilgan bo'lsa, faqat shu oraliqda TO'LANGAN oyliklarni hisoblaymiz
    // (aks holda tanlangan oy daromadidan butun tarix oyliklari ayrilib, net buziladi).
    const payrolls = await this.prisma.payroll.findMany({
      where: { status: { in: ['paid', 'closed'] }, ...this.dateWhere(r, 'paidAt') },
    });
    const payrollTotal = payrolls.reduce((a, p) => a + p.fixedAmount, 0n);

    // Kutilayotgan daromad: hali to'lanmagan va bekor qilinmagan loyihalar narxi (UZS).
    // Ya'ni loyihalar ortidan kelajakda kelishi kutilayotgan umumiy mablag'.
    const pendingProjects = await this.prisma.project.findMany({
      where: { paymentStatus: 'unpaid', status: { not: 'cancelled' } },
      select: { price: true, currency: true },
    });
    let expectedIncome = 0n;
    for (const p of pendingProjects) expectedIncome += toUzs(p.price, p.currency);

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

  /** Xarajatlar hisoboti: sana/kategoriya bo'yicha, jami + kategoriya kesimi (UZS). */
  async expenses(r: Range & { categoryId?: string }) {
    const where: any = { ...this.dateWhere(r, 'date') };
    if (r.categoryId) where.categoryId = Number(r.categoryId);
    const expenses = await this.prisma.expense.findMany({
      where,
      include: { category: { select: { name: true } } },
      orderBy: { date: 'desc' },
    });
    const rows = expenses.map((e) => ({
      id: e.id,
      date: e.date,
      category: e.category?.name || '—',
      amount: n(e.amount),
      currency: e.currency,
      amountUzs: n(e.amountUzs),
      note: e.note || '—',
    }));
    const total = expenses.reduce((a, e) => a + e.amountUzs, 0n);
    // Kategoriya kesimi
    const catMap = new Map<string, bigint>();
    for (const e of expenses) {
      const name = e.category?.name || '—';
      catMap.set(name, (catMap.get(name) || 0n) + e.amountUzs);
    }
    const byCategory = [...catMap.entries()]
      .map(([category, sum]) => ({ category, total: n(sum) }))
      .sort((a, b) => b.total - a.total);
    return { rows, byCategory, totals: { count: rows.length, total: n(total) } };
  }

  /** Ish haqi (oylik) hisoboti: oy/sana bo'yicha, xodimlar kesimida + jami (UZS). */
  async payroll(r: Range & { month?: string; status?: string }) {
    const where: any = {};
    if (r.month) where.month = r.month;
    else Object.assign(where, this.dateWhere(r, 'createdAt'));
    if (r.status) where.status = r.status;
    const payrolls = await this.prisma.payroll.findMany({
      where,
      include: { user: { select: { fullName: true, position: { select: { name: true } } } } },
      orderBy: [{ month: 'desc' }, { total: 'desc' }],
    });
    const rows = payrolls.map((p) => ({
      id: p.id,
      fullName: p.user?.fullName || '—',
      position: p.user?.position?.name || '—',
      month: p.month,
      fixedAmount: n(p.fixedAmount),
      projectShareTotal: n(p.projectShareTotal),
      total: n(p.total),
      status: p.status,
    }));
    const totals = {
      count: rows.length,
      fixedAmount: n(payrolls.reduce((a, p) => a + p.fixedAmount, 0n)),
      projectShareTotal: n(payrolls.reduce((a, p) => a + p.projectShareTotal, 0n)),
      total: n(payrolls.reduce((a, p) => a + p.total, 0n)),
      paid: n(payrolls.filter((p) => ['paid', 'closed'].includes(p.status)).reduce((a, p) => a + p.fixedAmount, 0n)),
    };
    return { rows, totals };
  }

  /** Vazifalar hisoboti: status kesimi + xodim kesimida statuslar bo'yicha. */
  async tasksReport(r: Range & { projectId?: string; assigneeId?: string; status?: string; type?: string; sprint?: string }) {
    const where: any = { ...this.dateWhere(r, 'createdAt') };
    if (r.projectId) where.projectId = Number(r.projectId);
    if (r.assigneeId) where.assigneeId = Number(r.assigneeId);
    if (r.status) where.status = r.status;
    if (r.type) where.type = r.type;
    if (r.sprint) where.sprint = Number(r.sprint);
    const tasks = await this.prisma.task.findMany({
      where,
      include: {
        assignee: { select: { fullName: true } },
        project: { select: { name: true } },
      },
    });
    const STATUSES = ['todo', 'in_progress', 'overdue', 'done', 'checked', 'production', 'rejected'];
    const TYPES = ['bug', 'extra', 'feature', 'research'];
    const emptyCounts = () => Object.fromEntries(STATUSES.map((s) => [s, 0]));

    const byStatus = emptyCounts();
    const byType: Record<string, number> = Object.fromEntries(TYPES.map((t) => [t, 0]));
    const perAssignee = new Map<string, any>();
    const perSprint = new Map<number, any>();
    const now = Date.now();
    let overdueLive = 0;
    for (const t of tasks) {
      byStatus[t.status] = (byStatus[t.status] || 0) + 1;
      byType[t.type] = (byType[t.type] || 0) + 1;
      if (t.deadline && new Date(t.deadline).getTime() < now && !['done', 'checked', 'production'].includes(t.status)) overdueLive++;
      const key = t.assignee?.fullName || '— (biriktirilmagan)';
      if (!perAssignee.has(key)) perAssignee.set(key, { fullName: key, total: 0, ...emptyCounts() });
      const row = perAssignee.get(key);
      row.total++;
      row[t.status]++;
      // Sprint breakdown (TZ 10.1)
      const sp = t.sprint ?? 0;
      if (!perSprint.has(sp)) perSprint.set(sp, { sprint: sp, total: 0, ...emptyCounts() });
      const sr = perSprint.get(sp);
      sr.total++;
      sr[t.status]++;
    }
    const byAssignee = [...perAssignee.values()].sort((a, b) => b.total - a.total);
    const bySprint = [...perSprint.values()].sort((a, b) => a.sprint - b.sprint);
    return {
      byStatus,
      byType,
      byAssignee,
      bySprint,
      totals: { count: tasks.length, overdueLive },
    };
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

    const toUzs = await this.uzsConverter();
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
      for (const r of u.financeRequests) reqTotal += toUzs(r.amount, r.currency);
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
    // Kurs konvertorini bir marta olamiz (loop ichida har oy uchun DB so'rovi — N+1).
    const toUzs = userId ? null : await this.uzsConverter();
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
        for (const p of payments) sum += toUzs!(p.amount, p.currency);
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

  /**
   * Dashboard analitikasi — vazifalar (status bo'yicha joriy vs o'tgan davr),
   * loyihalar (status bo'yicha) va yig'ilishlar dinamikasi (qatnashish + sarflangan vaqt).
   * Scope: employee → shaxsiy; boshqa rollar → butun tashkilot bo'yicha.
   * period: '1m' | '3m' | '6m' | '1y'.
   */
  async analytics(user: AuthUser, periodKey?: string) {
    const months = ({ '1m': 1, '3m': 3, '6m': 6, '1y': 12 } as Record<string, number>)[periodKey || '1m'] ?? 1;
    const now = new Date();
    const start = new Date(now);
    start.setMonth(start.getMonth() - months);
    const prevStart = new Date(start);
    prevStart.setMonth(prevStart.getMonth() - months);

    const isEmployee = user.role === 'employee';

    // ── VAZIFALAR (status kesimida, joriy va o'tgan davr) ──
    const taskWhere = (from: Date, to: Date): any => ({
      deletedAt: null,
      createdAt: { gte: from, lt: to },
      ...(isEmployee ? { assigneeId: user.id } : {}),
    });
    const [curTasks, prevTasks] = await Promise.all([
      this.prisma.task.groupBy({ by: ['status'], where: taskWhere(start, now), _count: { _all: true } }),
      this.prisma.task.groupBy({ by: ['status'], where: taskWhere(prevStart, start), _count: { _all: true } }),
    ]);
    const TASK_STATUSES: { key: string; label: string }[] = [
      { key: 'todo', label: 'Qilish kerak' },
      { key: 'in_progress', label: 'Jarayonda' },
      { key: 'done', label: 'Bajarilgan' },
      { key: 'production', label: 'Ishga tushirilgan' },
      { key: 'checked', label: 'Tekshirilgan' },
      { key: 'rejected', label: 'Rad etilgan' },
      { key: 'overdue', label: "Muddati o'tgan" },
    ];
    const curMap: Record<string, number> = Object.fromEntries(curTasks.map((t) => [t.status, t._count._all]));
    const prevMap: Record<string, number> = Object.fromEntries(prevTasks.map((t) => [t.status, t._count._all]));
    const tasks = TASK_STATUSES.map((s) => ({
      status: s.key,
      label: s.label,
      current: curMap[s.key] || 0,
      previous: prevMap[s.key] || 0,
    }));

    // ── LOYIHALAR (status kesimida) ──
    const projWhere: any = {
      deletedAt: null,
      createdAt: { gte: start, lt: now },
      ...(isEmployee ? { members: { some: { userId: user.id } } } : {}),
    };
    const projGrouped = await this.prisma.project.groupBy({ by: ['status'], where: projWhere, _count: { _all: true } });
    const PROJECT_STATUSES: { key: string; label: string }[] = [
      { key: 'completed', label: 'Tugatilgan' },
      { key: 'active', label: 'Jarayonda' },
      { key: 'cancelled', label: 'Bekor' },
      { key: 'overdue', label: 'Muddati' },
      { key: 'planning', label: 'Rejalashtirilgan' },
    ];
    const projMap: Record<string, number> = Object.fromEntries(projGrouped.map((p) => [p.status, p._count._all]));
    const projects = PROJECT_STATUSES.map((s) => ({ status: s.key, label: s.label, count: projMap[s.key] || 0 }));

    // ── YIG'ILISHLAR DINAMIKASI ──
    const attendance = await this.prisma.meetingAttendance.findMany({
      where: {
        meeting: { startAt: { gte: start, lt: now } },
        ...(isEmployee ? { userId: user.id } : {}),
      },
      select: { attended: true, absenceReason: true, meeting: { select: { duration: true } } },
    });
    let attended = 0;
    let excused = 0;
    let unexcused = 0;
    for (const a of attendance) {
      if (a.attended) attended++;
      else if (a.absenceReason && a.absenceReason.trim()) excused++;
      else unexcused++;
    }
    let total: number;
    let timeSpentMinutes: number;
    if (isEmployee) {
      total = attendance.length;
      timeSpentMinutes = attendance.reduce((s, a) => s + (a.attended ? a.meeting.duration || 0 : 0), 0);
    } else {
      const ms = await this.prisma.meeting.findMany({
        where: { startAt: { gte: start, lt: now } },
        select: { duration: true },
      });
      total = ms.length;
      timeSpentMinutes = ms.reduce((s, mt) => s + (mt.duration || 0), 0);
    }
    const meetings = { attended, excused, unexcused, total, timeSpentMinutes };

    return { period: periodKey || '1m', scope: isEmployee ? 'self' : 'all', tasks, projects, meetings };
  }
}
