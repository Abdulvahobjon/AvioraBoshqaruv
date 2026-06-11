import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface AuditParams {
  userId?: number | null;
  entity: string;
  entityId?: string | number | null;
  action: string; // CREATE | UPDATE | DELETE | LOGIN | ...
  ip?: string | null;
  oldValue?: any;
  newValue?: any;
  flagged?: boolean; // qo'lda flaglash (avtomatik aniqlashdan tashqari)
}

/**
 * Audit logger. Modules call `record()` on important mutations.
 * Stores old/new snapshots as JSONB and flags suspicious actions.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger('Audit');

  constructor(private prisma: PrismaService) {}

  async record(p: AuditParams) {
    try {
      const flagged = p.flagged ?? this.isSuspicious(p);
      await this.prisma.auditLog.create({
        data: {
          userId: p.userId ?? null,
          entity: p.entity,
          entityId: p.entityId != null ? String(p.entityId) : null,
          action: p.action,
          ip: p.ip ?? null,
          oldValue: this.sanitize(p.oldValue),
          newValue: this.sanitize(p.newValue),
          flagged,
        },
      });
    } catch (e) {
      // Audit must never break the main flow
      this.logger.error('Audit yozishda xato: ' + (e as Error).message);
    }
  }

  /** Flag deletes and money-related changes for review. */
  private isSuspicious(p: AuditParams): boolean {
    if (p.action === 'DELETE') return true;
    const moneyEntities = ['Project', 'FinanceRequest', 'LedgerEntry', 'Payroll', 'Expense', 'User'];
    if (p.action === 'UPDATE' && moneyEntities.includes(p.entity)) {
      const before = p.oldValue || {};
      const after = p.newValue || {};
      const moneyFields = ['price', 'amount', 'balance', 'fixedSalary', 'shareAmount', 'total'];
      return moneyFields.some((f) => f in after && String(before[f]) !== String(after[f]));
    }
    return false;
  }

  /** Convert BigInt to string so JSON storage works. */
  private sanitize(value: any): any {
    if (value === undefined || value === null) return undefined;
    return JSON.parse(JSON.stringify(value, (_k, v) => (typeof v === 'bigint' ? v.toString() : v)));
  }
}
