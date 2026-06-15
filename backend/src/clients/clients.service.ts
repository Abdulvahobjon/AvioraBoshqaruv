import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CurrenciesService, RATE_SCALE } from '../currencies/currencies.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { CreateClientPaymentDto } from './dto/client-payment.dto';
import { CreateClientContactDto, UpdateClientContactDto } from './dto/client-contact.dto';
import { CreateClientActivityDto } from './dto/client-activity.dto';
import { CreateClientDocumentDto } from './dto/client-document.dto';
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
          // Middleware nested include'larni filtrlamaydi — o'chirilgan loyiha
          // daromad/qarz hisobiga kirib ketmasligi uchun aniq filtr.
          where: { deletedAt: null },
          include: { type: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        },
        payments: {
          include: { project: { select: { id: true, name: true } } },
          orderBy: { date: 'desc' },
        },
        // Soft-delete jadvallar — nested include middleware filtrlamaydi, aniq where.
        contacts: { where: { deletedAt: null }, orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] },
        activities: {
          include: { user: { select: { id: true, fullName: true } } },
          orderBy: { date: 'desc' },
        },
        documents: {
          where: { deletedAt: null },
          include: { uploadedBy: { select: { id: true, fullName: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!client) throw new NotFoundException('Mijoz topilmadi');

    const projects = client.projects;
    const usdRate = await this.currencies.getRate('USD'); // scaled (×RATE_SCALE)
    const toUzs = (amount: bigint, currency: string) => (currency === 'USD' ? (amount * usdRate) / RATE_SCALE : amount);
    const totalRevenue = projects
      .filter((p) => p.paymentStatus === 'paid')
      .reduce((acc, p) => acc + toUzs(p.price, p.currency), 0n);
    const debt = projects
      .filter((p) => p.paymentStatus === 'unpaid' && p.status !== 'cancelled')
      .reduce((acc, p) => acc + toUzs(p.price, p.currency), 0n);
    const activeProjects = projects.filter((p) => p.status === 'active' || p.status === 'overdue').length;
    // Qo'lda kiritilgan to'lovlar yig'indisi (loyiha tushumidan alohida kassa kirimi).
    const paymentsTotal = client.payments.reduce((acc, p) => acc + toUzs(p.amount, p.currency), 0n);

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
        paymentsTotal: paymentsTotal.toString(),
        contactsCount: client.contacts.length,
        activitiesCount: client.activities.length,
        documentsCount: client.documents.length,
        typeBreakdown,
      },
    };
  }

  /** Mijoz mavjudligini tasdiqlaydi (yo'q bo'lsa 404). */
  private async getClientOr404(clientId: number) {
    const client = await this.prisma.client.findFirst({ where: { id: clientId } });
    if (!client) throw new NotFoundException('Mijoz topilmadi');
    return client;
  }

  /** regionId/managerId haqiqatan mavjudligini tekshiradi (noto'g'ri ID → FK 500 oldini olish). */
  private async assertRefs(dto: { regionId?: number | null; managerId?: number | null }) {
    if (dto.regionId != null) {
      const r = await this.prisma.region.count({ where: { id: Number(dto.regionId) } });
      if (!r) throw new NotFoundException('Viloyat (region) topilmadi');
    }
    if (dto.managerId != null) {
      const m = await this.prisma.user.count({ where: { id: Number(dto.managerId) } });
      if (!m) throw new NotFoundException('Menejer (foydalanuvchi) topilmadi');
    }
  }

  async create(dto: CreateClientDto, actorId: number, ip?: string) {
    await this.assertRefs(dto);
    const client = await this.prisma.client.create({ data: dto });
    await this.audit.record({ userId: actorId, entity: 'Client', entityId: client.id, action: 'CREATE', ip, newValue: { name: client.name } });
    return client;
  }

  async update(id: number, dto: UpdateClientDto, actorId: number, ip?: string) {
    const before = await this.prisma.client.findFirst({ where: { id } });
    if (!before) throw new NotFoundException('Mijoz topilmadi');
    await this.assertRefs(dto);
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

  // ─────────────── To'lovlar ───────────────

  async addPayment(clientId: number, dto: CreateClientPaymentDto, actorId: number, ip?: string) {
    await this.getClientOr404(clientId);
    if (dto.projectId != null) {
      const p = await this.prisma.project.count({ where: { id: Number(dto.projectId), clientId } });
      if (!p) throw new NotFoundException('Loyiha topilmadi (yoki bu mijozga tegishli emas)');
    }
    const payment = await this.prisma.clientPayment.create({
      data: {
        clientId,
        amount: BigInt(dto.amount),
        currency: dto.currency ?? 'UZS',
        projectId: dto.projectId ?? null,
        date: dto.date ? new Date(dto.date) : new Date(),
      },
    });
    await this.audit.record({ userId: actorId, entity: 'Client', entityId: clientId, action: 'PAYMENT_ADD', ip, newValue: { amount: payment.amount, currency: payment.currency }, flagged: true });
    return payment;
  }

  async removePayment(clientId: number, paymentId: number, actorId: number, ip?: string) {
    const before = await this.prisma.clientPayment.findFirst({ where: { id: paymentId, clientId } });
    if (!before) throw new NotFoundException('To\'lov topilmadi');
    await this.prisma.clientPayment.delete({ where: { id: paymentId } });
    await this.audit.record({ userId: actorId, entity: 'Client', entityId: clientId, action: 'PAYMENT_DELETE', ip, oldValue: { amount: before.amount, currency: before.currency }, flagged: true });
    return { message: 'To\'lov o\'chirildi' };
  }

  // ─────────────── Kontakt shaxslar ───────────────

  async addContact(clientId: number, dto: CreateClientContactDto, actorId: number, ip?: string) {
    await this.getClientOr404(clientId);
    if (dto.isPrimary) await this.prisma.clientContact.updateMany({ where: { clientId, deletedAt: null }, data: { isPrimary: false } });
    const contact = await this.prisma.clientContact.create({ data: { clientId, ...dto } });
    await this.audit.record({ userId: actorId, entity: 'Client', entityId: clientId, action: 'CONTACT_ADD', ip, newValue: { name: contact.name } });
    return contact;
  }

  async updateContact(clientId: number, contactId: number, dto: UpdateClientContactDto, actorId: number, ip?: string) {
    const before = await this.prisma.clientContact.findFirst({ where: { id: contactId, clientId } });
    if (!before) throw new NotFoundException('Kontakt topilmadi');
    if (dto.isPrimary) await this.prisma.clientContact.updateMany({ where: { clientId, deletedAt: null, id: { not: contactId } }, data: { isPrimary: false } });
    const contact = await this.prisma.clientContact.update({ where: { id: contactId }, data: dto });
    await this.audit.record({ userId: actorId, entity: 'Client', entityId: clientId, action: 'CONTACT_UPDATE', ip, oldValue: { name: before.name }, newValue: { name: contact.name } });
    return contact;
  }

  async removeContact(clientId: number, contactId: number, actorId: number, ip?: string) {
    const before = await this.prisma.clientContact.findFirst({ where: { id: contactId, clientId } });
    if (!before) throw new NotFoundException('Kontakt topilmadi');
    await this.prisma.clientContact.delete({ where: { id: contactId } });
    await this.audit.record({ userId: actorId, entity: 'Client', entityId: clientId, action: 'CONTACT_DELETE', ip, oldValue: { name: before.name } });
    return { message: 'Kontakt o\'chirildi' };
  }

  // ─────────────── Faoliyat / muloqot tarixi ───────────────

  async addActivity(clientId: number, dto: CreateClientActivityDto, actorId: number, ip?: string) {
    await this.getClientOr404(clientId);
    const activity = await this.prisma.clientActivity.create({
      data: {
        clientId,
        userId: actorId,
        type: dto.type,
        note: dto.note,
        date: dto.date ? new Date(dto.date) : new Date(),
      },
      include: { user: { select: { id: true, fullName: true } } },
    });
    await this.audit.record({ userId: actorId, entity: 'Client', entityId: clientId, action: 'ACTIVITY_ADD', ip, newValue: { type: activity.type } });
    return activity;
  }

  async removeActivity(clientId: number, activityId: number, actorId: number, ip?: string) {
    const before = await this.prisma.clientActivity.findFirst({ where: { id: activityId, clientId } });
    if (!before) throw new NotFoundException('Yozuv topilmadi');
    await this.prisma.clientActivity.delete({ where: { id: activityId } });
    await this.audit.record({ userId: actorId, entity: 'Client', entityId: clientId, action: 'ACTIVITY_DELETE', ip });
    return { message: 'Yozuv o\'chirildi' };
  }

  // ─────────────── Hujjatlar ───────────────

  async addDocument(clientId: number, dto: CreateClientDocumentDto, actorId: number, ip?: string) {
    await this.getClientOr404(clientId);
    const doc = await this.prisma.clientDocument.create({
      data: { clientId, name: dto.name, url: dto.url, uploadedById: actorId },
      include: { uploadedBy: { select: { id: true, fullName: true } } },
    });
    await this.audit.record({ userId: actorId, entity: 'Client', entityId: clientId, action: 'DOCUMENT_ADD', ip, newValue: { name: doc.name } });
    return doc;
  }

  async removeDocument(clientId: number, docId: number, actorId: number, ip?: string) {
    const before = await this.prisma.clientDocument.findFirst({ where: { id: docId, clientId } });
    if (!before) throw new NotFoundException('Hujjat topilmadi');
    await this.prisma.clientDocument.delete({ where: { id: docId } });
    await this.audit.record({ userId: actorId, entity: 'Client', entityId: clientId, action: 'DOCUMENT_DELETE', ip, oldValue: { name: before.name } });
    return { message: 'Hujjat o\'chirildi' };
  }
}
