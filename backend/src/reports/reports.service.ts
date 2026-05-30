import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CurrenciesService } from '../currencies/currencies.service';

const n = (b: bigint) => Number(b) / 100; // tiyin -> unit for display/export

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

    const net = income - expenseTotal - payrollTotal;
    return {
      income: n(income),
      expenses: n(expenseTotal),
      payroll: n(payrollTotal),
      net: n(net),
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
}
