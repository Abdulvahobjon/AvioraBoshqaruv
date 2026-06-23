import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { IncomeService } from './income.service';
import { CreateIncomeDto } from './dto/income.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

// Klass-darajadagi @Roles barcha metodlarga meros bo'ladi (frontend 'income.manage' bilan mos:
// superadmin / admin / accountant). Auditor global AuditorReadOnlyGuard bilan baribir bloklangan.
@ApiTags('income')
@ApiBearerAuth()
@Controller('income')
@Roles('superadmin', 'admin', 'accountant')
export class IncomeController {
  constructor(private readonly income: IncomeService) {}

  @Get()
  list() {
    return this.income.list();
  }

  @Post()
  create(@Body() dto: CreateIncomeDto, @CurrentUser('id') actorId: number, @Req() req: Request) {
    return this.income.create(dto, actorId, req.ip);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') actorId: number, @Req() req: Request) {
    return this.income.remove(id, actorId, req.ip);
  }
}
