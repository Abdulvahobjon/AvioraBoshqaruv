import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateIncomeDto } from './dto/income.dto';

/**
 * Qo'shimcha (mijozsiz/loyihasiz) tushum — "umumiy tushum".
 * Texnik jihatdan `client_payments` jadvalida client_id IS NULL bo'lgan yozuv.
 * Moliya hisoboti income summasi barcha to'lovlarni sanaydi → bu yozuvlar ham +tushum.
 */
@Injectable()
export class IncomeService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  /** Faqat mijoz/loyihaga bog'lanmagan tushumlar (umumiy kassa kirimi). */
  list() {
    return this.prisma.clientPayment.findMany({
      where: { clientId: null, projectId: null },
      orderBy: { date: 'desc' },
    });
  }

  async create(dto: CreateIncomeDto, actorId: number, ip?: string) {
    const payment = await this.prisma.clientPayment.create({
      data: {
        clientId: null,
        projectId: null,
        amount: BigInt(dto.amount),
        currency: dto.currency ?? 'UZS',
        date: dto.date ? new Date(dto.date) : new Date(),
      },
    });
    await this.audit.record({
      userId: actorId,
      entity: 'Income',
      entityId: payment.id,
      action: 'CREATE',
      ip,
      newValue: { amount: payment.amount, currency: payment.currency },
      flagged: true,
    });
    return payment;
  }

  async remove(id: number, actorId: number, ip?: string) {
    // clientId: null sharti — bu endpoint orqali faqat umumiy tushum o'chiriladi,
    // real mijoz to'lovi (clientId bor) bu yerdan o'chmaydi.
    const before = await this.prisma.clientPayment.findFirst({ where: { id, clientId: null } });
    if (!before) throw new NotFoundException('Tushum topilmadi');
    await this.prisma.clientPayment.delete({ where: { id } });
    await this.audit.record({
      userId: actorId,
      entity: 'Income',
      entityId: id,
      action: 'DELETE',
      ip,
      oldValue: { amount: before.amount, currency: before.currency },
      flagged: true,
    });
    return { message: "Tushum o'chirildi" };
  }
}
