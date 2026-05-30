import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private gateway: NotificationsGateway,
  ) {}

  /** Persist a notification and push it to the user in real-time. */
  async notify(userId: number, type: string, payload: any = {}) {
    if (!userId) return;
    const notif = await this.prisma.notification.create({
      data: { userId, type, payload },
    });
    this.gateway.emitToUser(userId, 'notification', notif);
    return notif;
  }

  async findForUser(userId: number) {
    const [items, unread] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);
    return { items, unread };
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
