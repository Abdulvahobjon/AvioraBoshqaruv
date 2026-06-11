import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { ReviewApplicationDto } from './dto/application.dto';

const include = {
  region: { select: { id: true, name: true } },
  district: { select: { id: true, name: true } },
  position: { select: { id: true, name: true } },
  reviewer: { select: { id: true, fullName: true } },
};

function toBool(v: any): boolean {
  return v === true || v === 'true' || v === '1' || v === 1;
}

function toIntOrNull(v: any): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

/** Nomzodlar arizalari (HR). Public POST anketa + admin/manager review. */
@Injectable()
export class ApplicationsService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  /** Public anketa formasi uchun ma'lumotnomalar (faqat isApplication=true). */
  async meta() {
    const [regions, districts, positions] = await Promise.all([
      this.prisma.region.findMany({ where: { isApplication: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
      this.prisma.district.findMany({ where: { isApplication: true }, select: { id: true, name: true, regionId: true }, orderBy: { name: 'asc' } }),
      this.prisma.position.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    ]);
    return { regions, districts, positions };
  }

  async create(body: any, resumeUrl: string | null) {
    if (!body.fullName?.trim()) throw new BadRequestException('F.I.O kiritilishi shart');
    if (!body.phone?.trim()) throw new BadRequestException('Telefon raqami kiritilishi shart');

    let birthDate: Date | null = null;
    if (body.birthDate) {
      const d = new Date(body.birthDate);
      if (Number.isNaN(d.getTime())) throw new BadRequestException('Tug\'ilgan sana noto\'g\'ri');
      birthDate = d;
    }

    return this.prisma.application.create({
      data: {
        fullName: body.fullName.trim(),
        birthDate,
        phone: body.phone.trim(),
        telegram: body.telegram?.trim() || null,
        isStudent: toBool(body.isStudent),
        university: body.university?.trim() || null,
        regionId: toIntOrNull(body.regionId),
        districtId: toIntOrNull(body.districtId),
        positionId: toIntOrNull(body.positionId),
        resume: resumeUrl,
        portfolio: body.portfolio?.trim() || null,
        extraInfo: body.extraInfo?.trim() || null,
      },
      include,
    });
  }

  async findAll(q: any) {
    const where: any = { deletedAt: null };
    if (q.status) where.status = q.status;
    if (q.regionId) where.regionId = Number(q.regionId);
    if (q.positionId) where.positionId = Number(q.positionId);
    if (q.isStudent !== undefined && q.isStudent !== '') where.isStudent = toBool(q.isStudent);
    if (q.search) {
      where.OR = [
        { fullName: { contains: q.search, mode: 'insensitive' } },
        { phone: { contains: q.search, mode: 'insensitive' } },
      ];
    }
    const page = Number(q.page) || 1;
    const limit = Number(q.limit) || 20;
    const [items, total] = await Promise.all([
      this.prisma.application.findMany({
        where,
        include,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.application.count({ where }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: number) {
    const app = await this.prisma.application.findFirst({ where: { id, deletedAt: null }, include });
    if (!app) throw new NotFoundException('Ariza topilmadi');
    return app;
  }

  async review(id: number, dto: ReviewApplicationDto, user: AuthUser, ip?: string) {
    const before = await this.prisma.application.findFirst({ where: { id, deletedAt: null } });
    if (!before) throw new NotFoundException('Ariza topilmadi');

    if ((dto.status === 'accepted' || dto.status === 'rejected') && !dto.conclusion?.trim()) {
      throw new BadRequestException('Xulosa kiritilishi shart');
    }

    const app = await this.prisma.application.update({
      where: { id },
      data: {
        status: dto.status,
        conclusion: dto.conclusion?.trim() ?? before.conclusion,
        reviewedBy: user.id,
        reviewedAt: new Date(),
      },
      include,
    });

    await this.audit.record({
      userId: user.id, entity: 'Application', entityId: id, action: 'REVIEW', ip,
      oldValue: { status: before.status }, newValue: { status: app.status, conclusion: app.conclusion },
    });
    return app;
  }

  async remove(id: number, user: AuthUser, ip?: string) {
    const before = await this.prisma.application.findFirst({ where: { id, deletedAt: null } });
    if (!before) throw new NotFoundException('Ariza topilmadi');
    await this.prisma.application.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.record({
      userId: user.id, entity: 'Application', entityId: id, action: 'DELETE', ip,
      oldValue: { fullName: before.fullName },
    });
    return { message: 'Ariza o\'chirildi' };
  }
}
