import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

const userSelect = {
  id: true,
  fullName: true,
  role: true,
  positionId: true,
  position: { select: { id: true, name: true } },
  fixedSalary: true,
  balance: true,
  card: true,
  card2: true,
  phone: true,
  phone2: true,
  region: true,
  district: true,
  passportSeries: true,
  passportNumber: true,
  passportImage: true,
  link1: true,
  link2: true,
  avatar: true,
  status: true,
  createdAt: true,
};

// Optional profile fields shared by create/update (only string columns).
const PROFILE_FIELDS = [
  'card', 'card2', 'phone', 'phone2', 'region', 'district',
  'passportSeries', 'passportNumber', 'passportImage', 'avatar', 'link1', 'link2',
] as const;

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async findAll(q: PaginationDto) {
    const where: any = {};
    if (q.search) {
      where.fullName = { contains: q.search, mode: 'insensitive' };
    }
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: userSelect,
        skip: (q.page - 1) * q.limit,
        take: q.limit,
        orderBy: { [q.sortBy || 'createdAt']: q.sortOrder },
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items, total, page: q.page, limit: q.limit, totalPages: Math.ceil(total / q.limit) };
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findFirst({ where: { id }, select: userSelect });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');
    return user;
  }

  async create(dto: CreateUserDto, actorId: number, ip?: string) {
    const exists = await this.prisma.user.findFirst({ where: { fullName: dto.fullName } });
    if (exists) throw new BadRequestException('Bu login allaqachon mavjud');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const data: any = {
      fullName: dto.fullName,
      passwordHash,
      role: dto.role,
      positionId: dto.positionId ?? null,
      fixedSalary: BigInt(dto.fixedSalary ?? 0),
    };
    for (const f of PROFILE_FIELDS) {
      if ((dto as any)[f] !== undefined) data[f] = (dto as any)[f] || null;
    }
    const user = await this.prisma.user.create({ data, select: userSelect });
    await this.audit.record({ userId: actorId, entity: 'User', entityId: user.id, action: 'CREATE', ip, newValue: { fullName: user.fullName, role: user.role } });
    return user;
  }

  async update(id: number, dto: UpdateUserDto, actorId: number, ip?: string) {
    const before = await this.prisma.user.findFirst({ where: { id }, select: userSelect });
    if (!before) throw new NotFoundException('Foydalanuvchi topilmadi');

    const data: any = {};
    if (dto.fullName !== undefined) data.fullName = dto.fullName;
    if (dto.role !== undefined) data.role = dto.role;
    if (dto.positionId !== undefined) data.positionId = dto.positionId;
    if (dto.fixedSalary !== undefined) data.fixedSalary = BigInt(dto.fixedSalary);
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.password) data.passwordHash = await bcrypt.hash(dto.password, 10);
    for (const f of PROFILE_FIELDS) {
      if ((dto as any)[f] !== undefined) data[f] = (dto as any)[f] || null;
    }

    const user = await this.prisma.user.update({ where: { id }, data, select: userSelect });
    await this.audit.record({
      userId: actorId, entity: 'User', entityId: id, action: 'UPDATE', ip,
      oldValue: { role: before.role, fixedSalary: before.fixedSalary, status: before.status },
      newValue: { role: user.role, fixedSalary: user.fixedSalary, status: user.status },
    });
    return user;
  }

  async remove(id: number, actorId: number, ip?: string) {
    const user = await this.prisma.user.findFirst({ where: { id } });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');
    await this.prisma.user.delete({ where: { id } }); // soft delete via middleware
    await this.audit.record({ userId: actorId, entity: 'User', entityId: id, action: 'DELETE', ip, oldValue: { fullName: user.fullName } });
    return { message: 'Foydalanuvchi o\'chirildi' };
  }
}
