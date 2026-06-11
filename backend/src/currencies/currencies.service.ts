import { Injectable, NotFoundException } from '@nestjs/common';
import { Currency } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

/**
 * Currency service. Single source of truth for UZS conversion.
 * Replaces the previously hardcoded USD rate. Caches rates briefly.
 */
@Injectable()
export class CurrenciesService {
  private cache = new Map<string, { rate: number; at: number }>();
  private TTL = 60_000;

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async findAll() {
    return this.prisma.currencyRate.findMany({ orderBy: { code: 'asc' } });
  }

  async history(code: Currency) {
    const cur = await this.prisma.currencyRate.findUnique({ where: { code } });
    if (!cur) throw new NotFoundException('Valuta topilmadi');
    return this.prisma.currencyHistory.findMany({
      where: { currencyId: cur.id },
      orderBy: { changedAt: 'desc' },
      take: 50,
    });
  }

  /** Current rate to UZS (1 unit = N so'm). UZS => 1. */
  async getRate(code: Currency): Promise<number> {
    if (code === 'UZS') return 1;
    const cached = this.cache.get(code);
    if (cached && Date.now() - cached.at < this.TTL) return cached.rate;
    const cur = await this.prisma.currencyRate.findUnique({ where: { code } });
    // Kurs topilmasa JIM 1 ga tenglashtirmaymiz — aks holda USD summa so'mga 1:1
    // aylanib, moliyaviy hisob jimgina buziladi. Aniq xato beramiz.
    if (!cur || !cur.rateToUzs || cur.rateToUzs < 1) {
      throw new NotFoundException(`${code} uchun valyuta kursi sozlanmagan. Sozlamalar → Valyutalar bo'limidan kursni kiriting.`);
    }
    const rate = cur.rateToUzs;
    this.cache.set(code, { rate, at: Date.now() });
    return rate;
  }

  /** Convert an amount (in given currency, tiyin) to UZS tiyin. */
  async toUzs(amount: bigint, code: Currency): Promise<bigint> {
    if (code === 'UZS') return amount;
    const rate = await this.getRate(code);
    return amount * BigInt(rate);
  }

  async updateRate(code: Currency, rateToUzs: number, actorId: number, ip?: string) {
    const cur = await this.prisma.currencyRate.findUnique({ where: { code } });
    if (!cur) throw new NotFoundException('Valuta topilmadi');
    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.currencyRate.update({ where: { code }, data: { rateToUzs } });
      await tx.currencyHistory.create({ data: { currencyId: cur.id, rateToUzs } });
      return u;
    });
    this.cache.delete(code);
    await this.audit.record({
      userId: actorId, entity: 'Currency', entityId: cur.id, action: 'UPDATE', ip,
      oldValue: { rateToUzs: cur.rateToUzs }, newValue: { rateToUzs },
    });
    return updated;
  }
}
