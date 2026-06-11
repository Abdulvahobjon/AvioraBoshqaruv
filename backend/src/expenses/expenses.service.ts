import { Injectable, NotFoundException } from '@nestjs/common';
import { Currency } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CurrenciesService } from '../currencies/currencies.service';
import { AuthUser } from '../common/decorators/current-user.decorator';

@Injectable()
export class ExpensesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private currencies: CurrenciesService,
  ) {}

  private include = {
    category: { select: { id: true, name: true } },
    project: { select: { id: true, name: true } },
  };

  async findAll(q: any) {
    const where: any = {};
    if (q.categoryId) where.categoryId = Number(q.categoryId);
    if (q.projectId) where.projectId = Number(q.projectId);
    if (q.from || q.to) {
      where.date = {};
      if (q.from) where.date.gte = new Date(q.from);
      if (q.to) where.date.lte = new Date(q.to);
    }
    const items = await this.prisma.expense.findMany({ where, include: this.include, orderBy: { date: 'desc' } });
    const totalUzs = items.reduce((acc, e) => acc + e.amountUzs, 0n);
    return { items, totalUzs: totalUzs.toString() };
  }

  async create(dto: any, actor: AuthUser, ip?: string) {
    const amount = BigInt(dto.amount);
    const currency: Currency = dto.currency || 'UZS';
    const amountUzs = await this.currencies.toUzs(amount, currency);
    const expense = await this.prisma.expense.create({
      data: {
        categoryId: dto.categoryId ?? null,
        projectId: dto.projectId ?? null,
        amount,
        currency,
        amountUzs,
        note: dto.note ?? null,
        date: dto.date ? new Date(dto.date) : new Date(),
        createdBy: actor.id,
      },
      include: this.include,
    });
    await this.audit.record({ userId: actor.id, entity: 'Expense', entityId: expense.id, action: 'CREATE', ip, newValue: { amount: expense.amount, currency } });
    return expense;
  }

  async update(id: number, dto: any, actor: AuthUser, ip?: string) {
    const existing = await this.prisma.expense.findFirst({ where: { id } });
    if (!existing) throw new NotFoundException('Xarajat topilmadi');
    const data: any = {};
    if (dto.categoryId !== undefined) data.categoryId = dto.categoryId;
    if (dto.projectId !== undefined) data.projectId = dto.projectId;
    if (dto.note !== undefined) data.note = dto.note;
    if (dto.date !== undefined) data.date = new Date(dto.date);
    if (dto.amount !== undefined || dto.currency !== undefined) {
      const amount = BigInt(dto.amount ?? existing.amount);
      const currency: Currency = dto.currency ?? existing.currency;
      data.amount = amount;
      data.currency = currency;
      data.amountUzs = await this.currencies.toUzs(amount, currency);
    }
    const expense = await this.prisma.expense.update({ where: { id }, data, include: this.include });
    await this.audit.record({ userId: actor.id, entity: 'Expense', entityId: id, action: 'UPDATE', ip });
    return expense;
  }

  async remove(id: number, actor: AuthUser, ip?: string) {
    const existing = await this.prisma.expense.findFirst({ where: { id } });
    if (!existing) throw new NotFoundException('Xarajat topilmadi');
    await this.prisma.expense.delete({ where: { id } });
    await this.audit.record({ userId: actor.id, entity: 'Expense', entityId: id, action: 'DELETE', ip });
    return { message: 'Xarajat o\'chirildi' };
  }
}
