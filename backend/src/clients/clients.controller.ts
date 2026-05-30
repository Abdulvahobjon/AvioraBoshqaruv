import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('clients')
@ApiBearerAuth()
@Controller('clients')
export class ClientsController {
  constructor(private readonly clients: ClientsService) {}

  @Get()
  @Roles('superadmin', 'admin', 'manager')
  findAll(@Query() q: any) {
    return this.clients.findAll(q);
  }

  @Get(':id')
  @Roles('superadmin', 'admin', 'manager')
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
}
