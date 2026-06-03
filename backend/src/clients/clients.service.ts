import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CurrenciesService } from '../currencies/currencies.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class ClientsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private currencies: CurrenciesService,
  ) {}

  async findAll(q: PaginationDto & { regionId?: number; status?: string; managerId?: number }) {
    const page = Number(q.page) || 1;
    const limit = Number(q.limit) || 20;
    // Faqat ruxsat etilgan ustunlar bo'yicha saralash (aks holda Prisma 500 beradi).
    const sortCol = ['name', 'createdAt', 'status'].includes(q.sortBy as string) ? (q.sortBy as string) : 'createdAt';
    const sortDir = q.sortOrder === 'asc' ? 'asc' : 'desc';
    const where: any = {};
    if (q.search) {
      where.OR = [
        { name: { contains: q.search, mode: 'insensitive' } },
        { phone: { contains: q.search, mode: 'insensitive' } },
        { email: { contains: q.search, mode: 'insensitive' } },
      ];
    }
    if (q.regionId) where.regionId = Number(q.regionId);
    if (q.status) where.status = q.status;
    if (q.managerId) where.managerId = Number(q.managerId);

    const [items, total] = await Promise.all([
      this.prisma.client.findMany({
        where,
        include: {
          region: { select: { id: true, name: true } },
          manager: { select: { id: true, fullName: true } },
          _count: { select: { projects: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortCol]: sortDir },
      }),
      this.prisma.client.count({ where }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /** Client card: profile + projects + revenue + debts + type breakdown. */
  async findOne(id: number) {
    const client = await this.prisma.client.findFirst({
      where: { id },
      include: {
        region: { select: { id: true, name: true } },
        manager: { select: { id: true, fullName: true } },
        projects: {
          include: { type: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        },
        payments: { orderBy: { date: 'desc' } },
      },
    });
    if (!client) throw new NotFoundException('Mijoz topilmadi');

    const projects = client.projects;
    const usdRate = BigInt(await this.currencies.getRate('USD'));
    const toUzs = (amount: bigint, currency: string) => (currency === 'USD' ? amount * usdRate : amount);
    const totalRevenue = projects
      .filter((p) => p.paymentStatus === 'paid')
      .reduce((acc, p) => acc + toUzs(p.price, p.currency), 0n);
    const debt = projects
      .filter((p) => p.paymentStatus === 'unpaid' && p.status !== 'cancelled')
      .reduce((acc, p) => acc + toUzs(p.price, p.currency), 0n);
    const activeProjects = projects.filter((p) => p.status === 'active' || p.status === 'overdue').length;

    const typeBreakdown: Record<string, number> = {};
    for (const p of projects) {
      const name = p.type?.name || 'Boshqa';
      typeBreakdown[name] = (typeBreakdown[name] || 0) + 1;
    }

    return {
      ...client,
      stats: {
        projectsCount: projects.length,
        activeProjects,
        totalRevenue: totalRevenue.toString(),
        debt: debt.toString(),
        typeBreakdown,
      },
    };
  }

  async create(dto: CreateClientDto, actorId: number, ip?: string) {
    const client = await this.prisma.client.create({ data: dto });
    await this.audit.record({ userId: actorId, entity: 'Client', entityId: client.id, action: 'CREATE', ip, newValue: { name: client.name } });
    return client;
  }

  async update(id: number, dto: UpdateClientDto, actorId: number, ip?: string) {
    const before = await this.prisma.client.findFirst({ where: { id } });
    if (!before) throw new NotFoundException('Mijoz topilmadi');
    const client = await this.prisma.client.update({ where: { id }, data: dto });
    await this.audit.record({ userId: actorId, entity: 'Client', entityId: id, action: 'UPDATE', ip, oldValue: { name: before.name, status: before.status }, newValue: { name: client.name, status: client.status } });
    return client;
  }

  async remove(id: number, actorId: number, ip?: string) {
    const before = await this.prisma.client.findFirst({ where: { id } });
    if (!before) throw new NotFoundException('Mijoz topilmadi');
    await this.prisma.client.delete({ where: { id } });
    await this.audit.record({ userId: actorId, entity: 'Client', entityId: id, action: 'DELETE', ip, oldValue: { name: before.name } });
    return { message: 'Mijoz o\'chirildi' };
  }
}
