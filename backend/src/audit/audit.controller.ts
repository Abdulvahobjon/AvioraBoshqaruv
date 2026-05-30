import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('audit')
@ApiBearerAuth()
@Controller('audit')
@Roles('superadmin', 'admin', 'accountant')
export class AuditController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async list(@Query() q: any) {
    const where: any = {};
    if (q.entity) where.entity = q.entity;
    if (q.action) where.action = q.action;
    if (q.flagged === 'true') where.flagged = true;
    if (q.userId) where.userId = Number(q.userId);

    const page = Number(q.page) || 1;
    const limit = Number(q.limit) || 30;
    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: { user: { select: { id: true, fullName: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
