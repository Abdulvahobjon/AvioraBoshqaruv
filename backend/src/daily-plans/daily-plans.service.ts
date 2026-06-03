import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDailyPlanDto } from './dto/create-daily-plan.dto';
import { UpdateDailyPlanDto } from './dto/update-daily-plan.dto';

/** "YYYY-MM-DD" -> kun boshidagi (UTC) Date. @db.Date faqat sanani saqlaydi. */
function toDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

@Injectable()
export class DailyPlansService {
  constructor(private prisma: PrismaService) {}

  /** Foydalanuvchining rejalari. `date` berilsa — faqat o'sha kun. */
  findAll(userId: number, date?: string) {
    const where: any = { userId };
    if (date) where.date = toDate(date);
    return this.prisma.dailyPlan.findMany({
      where,
      orderBy: [{ isDone: 'asc' }, { time: 'asc' }, { createdAt: 'desc' }],
    });
  }

  create(userId: number, dto: CreateDailyPlanDto) {
    return this.prisma.dailyPlan.create({
      data: {
        userId,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        date: toDate(dto.date),
        time: dto.time || null,
        priority: dto.priority || 'medium',
        isDone: dto.isDone ?? false,
      },
    });
  }

  async update(userId: number, id: number, dto: UpdateDailyPlanDto) {
    const before = await this.prisma.dailyPlan.findFirst({ where: { id, userId } });
    if (!before) throw new NotFoundException('Reja topilmadi');
    return this.prisma.dailyPlan.update({
      where: { id },
      data: {
        title: dto.title !== undefined ? dto.title.trim() : undefined,
        description: dto.description !== undefined ? dto.description?.trim() || null : undefined,
        date: dto.date !== undefined ? toDate(dto.date) : undefined,
        time: dto.time !== undefined ? dto.time || null : undefined,
        priority: dto.priority,
        isDone: dto.isDone,
      },
    });
  }

  async remove(userId: number, id: number) {
    const before = await this.prisma.dailyPlan.findFirst({ where: { id, userId } });
    if (!before) throw new NotFoundException('Reja topilmadi');
    await this.prisma.dailyPlan.delete({ where: { id } });
    return { message: 'Reja o\'chirildi' };
  }
}
