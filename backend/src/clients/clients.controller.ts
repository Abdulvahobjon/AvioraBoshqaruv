import {
  BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Req,
  UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { CreateClientPaymentDto } from './dto/client-payment.dto';
import { CreateClientContactDto, UpdateClientContactDto } from './dto/client-contact.dto';
import { CreateClientActivityDto } from './dto/client-activity.dto';
import { CreateClientDocumentDto } from './dto/client-document.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { uploadOptions } from '../common/upload.util';

@ApiTags('clients')
@ApiBearerAuth()
@Controller('clients')
export class ClientsController {
  constructor(private readonly clients: ClientsService) {}

  @Get()
  @Roles('superadmin', 'admin', 'manager', 'auditor')
  findAll(@Query() q: any) {
    return this.clients.findAll(q);
  }

  @Get(':id')
  @Roles('superadmin', 'admin', 'manager', 'auditor')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.clients.findOne(id);
  }

  @Post()
  @Roles('superadmin', 'admin', 'manager')
  create(@Body() dto: CreateClientDto, @CurrentUser('id') actorId: number, @Req() req: Request) {
    return this.clients.create(dto, actorId, req.ip);
  }

  @Patch(':id')
  @Roles('superadmin', 'admin', 'manager')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateClientDto, @CurrentUser('id') actorId: number, @Req() req: Request) {
    return this.clients.update(id, dto, actorId, req.ip);
  }

  @Delete(':id')
  @Roles('superadmin', 'admin')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') actorId: number, @Req() req: Request) {
    return this.clients.remove(id, actorId, req.ip);
  }

  // ─────────────── Fayl yuklash (hujjatlar uchun) ───────────────
  @Post('upload')
  @Roles('superadmin', 'admin', 'manager')
  @UseInterceptors(FileInterceptor('file', uploadOptions(10)))
  upload(@UploadedFile() file: any) {
    if (!file) throw new BadRequestException('Fayl topilmadi');
    return { url: `/uploads/${file.filename}`, name: file.originalname, size: file.size };
  }

  // ─────────────── To'lovlar ───────────────
  @Post(':id/payments')
  @Roles('superadmin', 'admin', 'manager')
  addPayment(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateClientPaymentDto, @CurrentUser('id') actorId: number, @Req() req: Request) {
    return this.clients.addPayment(id, dto, actorId, req.ip);
  }

  @Delete(':id/payments/:paymentId')
  @Roles('superadmin', 'admin')
  removePayment(@Param('id', ParseIntPipe) id: number, @Param('paymentId', ParseIntPipe) paymentId: number, @CurrentUser('id') actorId: number, @Req() req: Request) {
    return this.clients.removePayment(id, paymentId, actorId, req.ip);
  }

  // ─────────────── Kontakt shaxslar ───────────────
  @Post(':id/contacts')
  @Roles('superadmin', 'admin', 'manager')
  addContact(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateClientContactDto, @CurrentUser('id') actorId: number, @Req() req: Request) {
    return this.clients.addContact(id, dto, actorId, req.ip);
  }

  @Patch(':id/contacts/:contactId')
  @Roles('superadmin', 'admin', 'manager')
  updateContact(@Param('id', ParseIntPipe) id: number, @Param('contactId', ParseIntPipe) contactId: number, @Body() dto: UpdateClientContactDto, @CurrentUser('id') actorId: number, @Req() req: Request) {
    return this.clients.updateContact(id, contactId, dto, actorId, req.ip);
  }

  @Delete(':id/contacts/:contactId')
  @Roles('superadmin', 'admin', 'manager')
  removeContact(@Param('id', ParseIntPipe) id: number, @Param('contactId', ParseIntPipe) contactId: number, @CurrentUser('id') actorId: number, @Req() req: Request) {
    return this.clients.removeContact(id, contactId, actorId, req.ip);
  }

  // ─────────────── Faoliyat / muloqot tarixi ───────────────
  @Post(':id/activities')
  @Roles('superadmin', 'admin', 'manager')
  addActivity(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateClientActivityDto, @CurrentUser('id') actorId: number, @Req() req: Request) {
    return this.clients.addActivity(id, dto, actorId, req.ip);
  }

  @Delete(':id/activities/:activityId')
  @Roles('superadmin', 'admin', 'manager')
  removeActivity(@Param('id', ParseIntPipe) id: number, @Param('activityId', ParseIntPipe) activityId: number, @CurrentUser('id') actorId: number, @Req() req: Request) {
    return this.clients.removeActivity(id, activityId, actorId, req.ip);
  }

  // ─────────────── Hujjatlar ───────────────
  @Post(':id/documents')
  @Roles('superadmin', 'admin', 'manager')
  addDocument(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateClientDocumentDto, @CurrentUser('id') actorId: number, @Req() req: Request) {
    return this.clients.addDocument(id, dto, actorId, req.ip);
  }

  @Delete(':id/documents/:docId')
  @Roles('superadmin', 'admin', 'manager')
  removeDocument(@Param('id', ParseIntPipe) id: number, @Param('docId', ParseIntPipe) docId: number, @CurrentUser('id') actorId: number, @Req() req: Request) {
    return this.clients.removeDocument(id, docId, actorId, req.ip);
  }
}
