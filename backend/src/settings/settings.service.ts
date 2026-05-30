import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type RefModel = 'region' | 'position' | 'projectType' | 'expenseCategory';

const MODEL_MAP: Record<RefModel, string> = {
  region: 'region',
  position: 'position',
  projectType: 'projectType',
  expenseCategory: 'expenseCategory',
};

/** Generic reference-data (nomenklatura) service: regions, positions, project types, expense categories. */
@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  private delegate(model: RefModel) {
    const key = MODEL_MAP[model];
    const d = (this.prisma as any)[key];
    if (!d) throw new BadRequestException('Noma\'lum ma\'lumotnoma');
    return d;
  }

  findAll(model: RefModel) {
    return this.delegate(model).findMany({ orderBy: { name: 'asc' } });
  }

  create(model: RefModel, name: string) {
    if (!name?.trim()) throw new BadRequestException('Nom kiritilishi shart');
    return this.delegate(model).create({ data: { name: name.trim() } });
  }

  async update(model: RefModel, id: number, name: string) {
    if (!name?.trim()) throw new BadRequestException('Nom kiritilishi shart');
    const exists = await this.delegate(model).findFirst({ where: { id } });
    if (!exists) throw new NotFoundException('Topilmadi');
    return this.delegate(model).update({ where: { id }, data: { name: name.trim() } });
  }

  async remove(model: RefModel, id: number) {
    const exists = await this.delegate(model).findFirst({ where: { id } });
    if (!exists) throw new NotFoundException('Topilmadi');
    return this.delegate(model).delete({ where: { id } }); // soft delete
  }
}
