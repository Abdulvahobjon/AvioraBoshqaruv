import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Global Prisma service.
 * - Soft-delete middleware: `delete`/`deleteMany` on models having `deletedAt`
 *   are rewritten to `update` setting `deletedAt`, and reads exclude soft-deleted rows.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  // Models that support soft delete (have deletedAt column)
  private static readonly SOFT_DELETE_MODELS = new Set([
    'User',
    'Client',
    'Project',
    'ProjectType',
    'Region',
    'Position',
    'ExpenseCategory',
    'Task',
    'Expense',
  ]);

  private readonly logger = new Logger('Prisma');

  constructor() {
    super({ log: ['warn', 'error'] });
  }

  async onModuleInit() {
    this.applySoftDeleteMiddleware();
    // Neon free tier auto-suspends when idle; the first cold connection can time
    // out while the compute wakes. Retry with backoff so boot doesn't crash.
    const maxRetries = 6;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.$connect();
        this.logger.log('Ma\'lumotlar bazasiga ulanildi');
        return;
      } catch (e) {
        if (attempt === maxRetries) {
          this.logger.error(`DB ulanmadi (${maxRetries} urinish): ${(e as Error).message}`);
          throw e;
        }
        const delay = attempt * 2000;
        this.logger.warn(`DB ulanmadi (urinish ${attempt}/${maxRetries}), ${delay}ms dan keyin qayta...`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  private applySoftDeleteMiddleware() {
    this.$use(async (params, next) => {
      const model = params.model;
      if (!model || !PrismaService.SOFT_DELETE_MODELS.has(model)) {
        return next(params);
      }

      // Convert delete -> update(deletedAt)
      if (params.action === 'delete') {
        params.action = 'update';
        params.args.data = { deletedAt: new Date() };
      } else if (params.action === 'deleteMany') {
        params.action = 'updateMany';
        params.args.data = { ...(params.args.data || {}), deletedAt: new Date() };
      }

      // Exclude soft-deleted from reads (unless caller explicitly asks)
      if (['findFirst', 'findMany', 'count'].includes(params.action)) {
        params.args = params.args || {};
        params.args.where = params.args.where || {};
        if (params.args.where.deletedAt === undefined) {
          params.args.where.deletedAt = null;
        }
      }
      if (params.action === 'findUnique') {
        // findUnique can't filter on non-unique deletedAt; convert to findFirst
        params.action = 'findFirst';
        params.args.where = params.args.where || {};
        if (params.args.where.deletedAt === undefined) {
          params.args.where.deletedAt = null;
        }
      }

      return next(params);
    });
  }
}
