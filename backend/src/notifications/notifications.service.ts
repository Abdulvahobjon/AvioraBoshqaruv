import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger('Notifications');

  constructor(
    private prisma: PrismaService,
    private gateway: NotificationsGateway,
  ) {}

  /**
   * Persist a notification and push it in real-time. Best-effort:
   * bildirishnoma xatosi asosiy amalni (allaqachon commit qilingan) buzmasligi kerak.
   */
  async notify(userId: number, type: string, payload: any = {}) {
    if (!userId) return;
    try {
      const notif = await this.prisma.notification.create({
        data: { userId, type, payload },
      });
      this.gateway.emitToUser(userId, 'notification', notif);
      return notif;
    } catch (e: any) {
      this.logger.warn(`Bildirishnoma yuborilmadi (user #${userId}, ${type}): ${e?.message || e}`);
      return null;
    }
  }

  /**
   * Cursor pagination — eng yangisi yuqorida (id desc).
   * `cursor` oxirgi olingan bildirishnoma id'si; `nextCursor` null bo'lsa boshqa sahifa yo'q.
   * `unread` — har doim umumiy o'qilmaganlar soni (qo'ng'iroq belgisi uchun).
   */
  async findForUser(userId: number, cursor?: number, take = 20) {
    const limit = Math.min(Math.max(Number(take) || 20, 1), 50);
    const rows = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { id: 'desc' },
      take: limit + 1, // keyingi sahifa bor-yo'qligini bilish uchun bitta ortiq
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const unread = await this.prisma.notification.count({ where: { userId, isRead: false } });
    return { items, unread, nextCursor: hasMore ? items[items.length - 1].id : null };
  }

  async markRead(id: number, userId: number) {
    await this.prisma.notification.updateMany({ where: { id, userId }, data: { isRead: true } });
    return { ok: true };
  }

  async markAllRead(userId: number) {
    await this.prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
    return { ok: true };
  }
}
