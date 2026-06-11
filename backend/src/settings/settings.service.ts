import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type RefModel = 'region' | 'district' | 'position' | 'projectType' | 'expenseCategory';

const MODEL_MAP: Record<RefModel, string> = {
  region: 'region',
  district: 'district',
  position: 'position',
  projectType: 'projectType',
  expenseCategory: 'expenseCategory',
};

// Qaysi modellar qaysi qo'shimcha maydonlarni qabul qiladi
const HAS_IS_APPLICATION = new Set<RefModel>(['region', 'district']);
const HAS_REGION = new Set<RefModel>(['district']);

/** Generic reference-data (nomenklatura) service: regions, districts, positions, project types, expense categories. */
@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  private delegate(model: RefModel) {
    const key = MODEL_MAP[model];
    const d = (this.prisma as any)[key];
    if (!d) throw new BadRequestException('Noma\'lum ma\'lumotnoma');
    return d;
  }

  /** body'dan modelga tegishli ma'lumotni yig'ish (name + ixtiyoriy isApplication/regionId). */
  private buildData(model: RefModel, body: any, isCreate: boolean) {
    const data: any = {};
    if (isCreate || body.name !== undefined) {
      if (!body.name?.trim()) throw new BadRequestException('Nom kiritilishi shart');
      data.name = body.name.trim();
    }
    if (HAS_IS_APPLICATION.has(model) && body.isApplication !== undefined) {
      data.isApplication = body.isApplication === true || body.isApplication === 'true';
    }
    if (HAS_REGION.has(model) && body.regionId !== undefined) {
      data.regionId = body.regionId == null || body.regionId === '' ? null : Number(body.regionId);
    }
    return data;
  }

  findAll(model: RefModel, q: any = {}) {
    const where: any = { deletedAt: null };
    if (HAS_IS_APPLICATION.has(model) && (q.isApplication === 'true' || q.isApplication === true)) {
      where.isApplication = true;
    }
    if (HAS_REGION.has(model) && q.regionId) where.regionId = Number(q.regionId);
    const include = model === 'district' ? { region: { select: { id: true, name: true } } } : undefined;
    return this.delegate(model).findMany({ where, include, orderBy: { name: 'asc' } });
  }

  create(model: RefModel, body: any) {
    const data = this.buildData(model, body, true);
    return this.delegate(model).create({ data });
  }

  async update(model: RefModel, id: number, body: any) {
    const exists = await this.delegate(model).findFirst({ where: { id, deletedAt: null } });
    if (!exists) throw new NotFoundException('Topilmadi');
    const data = this.buildData(model, body, false);
    return this.delegate(model).update({ where: { id }, data });
  }

  async remove(model: RefModel, id: number) {
    const exists = await this.delegate(model).findFirst({ where: { id, deletedAt: null } });
    if (!exists) throw new NotFoundException('Topilmadi');
    return this.delegate(model).update({ where: { id }, data: { deletedAt: new Date() } }); // soft delete
  }
}
