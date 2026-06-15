import { Injectable, NotFoundException } from '@nestjs/common';
import { Currency } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

/**
 * Kurs masshtabi (fixed-point). Saqlangan `rateToUzs` = haqiqiy kurs × RATE_SCALE.
 * Masalan USD = 12650.50 so'm → DB'da 126505000 (×10000) saqlanadi.
 * Bu butun-son (Int) saqlashdagi kasr yo'qolishini bartaraf qiladi.
 * Konvertatsiya: amountUzs = amount × scaledRate / RATE_SCALE (hammasi BigInt).
 */
export const RATE_SCALE = 10000n;

/**
 * Currency service. Single source of truth for UZS conversion.
 * Replaces the previously hardcoded USD rate. Caches rates briefly.
 */
@Injectable()
export class CurrenciesService {
  private cache = new Map<string, { rate: bigint; at: number }>();
  private TTL = 60_000;

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  /** Saqlangan (scaled) kursni inson o'qiy oladigan songa o'giradi (ko'rsatish/forma uchun). */
  private toHuman(scaled: bigint): number {
    return Number(scaled) / Number(RATE_SCALE);
  }

  async findAll() {
    const rows = await this.prisma.currencyRate.findMany({ orderBy: { code: 'asc' } });
    return rows.map((r) => ({ ...r, rateToUzs: this.toHuman(r.rateToUzs) }));
  }

  async history(code: Currency) {
    const cur = await this.prisma.currencyRate.findUnique({ where: { code } });
    if (!cur) throw new NotFoundException('Valuta topilmadi');
    const rows = await this.prisma.currencyHistory.findMany({
      where: { currencyId: cur.id },
      orderBy: { changedAt: 'desc' },
      take: 50,
    });
    return rows.map((r) => ({ ...r, rateToUzs: this.toHuman(r.rateToUzs) }));
  }

  /**
   * Joriy kursni MASSHTABLANGAN (scaled, ×RATE_SCALE) BigInt sifatida qaytaradi.
   * UZS => RATE_SCALE (ya'ni 1.0). Konvertatsiyada doim RATE_SCALE ga bo'ling.
   */
  async getRate(code: Currency): Promise<bigint> {
    if (code === 'UZS') return RATE_SCALE;
    const cached = this.cache.get(code);
    if (cached && Date.now() - cached.at < this.TTL) return cached.rate;
    const cur = await this.prisma.currencyRate.findUnique({ where: { code } });
    // Kurs topilmasa JIM 1 ga tenglashtirmaymiz — aks holda USD summa so'mga 1:1
    // aylanib, moliyaviy hisob jimgina buziladi. Aniq xato beramiz.
    if (!cur || !cur.rateToUzs || cur.rateToUzs < RATE_SCALE) {
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
    return (amount * rate) / RATE_SCALE;
  }

  async updateRate(code: Currency, rateToUzs: number, actorId: number, ip?: string) {
    if (!(rateToUzs > 0)) throw new NotFoundException('Kurs musbat son bo\'lishi kerak');
    const cur = await this.prisma.currencyRate.findUnique({ where: { code } });
    if (!cur) throw new NotFoundException('Valuta topilmadi');
    // Inson kiritgan kasr kursni scaled BigInt ga o'giramiz (kasr yo'qolmaydi).
    const scaled = BigInt(Math.round(rateToUzs * Number(RATE_SCALE)));
    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.currencyRate.update({ where: { code }, data: { rateToUzs: scaled } });
      await tx.currencyHistory.create({ data: { currencyId: cur.id, rateToUzs: scaled } });
      return u;
    });
    this.cache.delete(code);
    await this.audit.record({
      userId: actorId, entity: 'Currency', entityId: cur.id, action: 'UPDATE', ip,
      oldValue: { rateToUzs: this.toHuman(cur.rateToUzs) }, newValue: { rateToUzs },
    });
    return { ...updated, rateToUzs: this.toHuman(updated.rateToUzs) };
  }
}
