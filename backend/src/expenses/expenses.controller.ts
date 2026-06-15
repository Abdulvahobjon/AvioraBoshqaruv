import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto, UpdateExpenseDto } from './dto/expense.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@ApiTags('expenses')
@ApiBearerAuth()
@Controller('expenses')
@Roles('superadmin', 'admin', 'accountant', 'auditor')
export class ExpensesController {
  constructor(private readonly expenses: ExpensesService) {}

  @Get()
  findAll(@Query() q: any) {
    return this.expenses.findAll(q);
  }

  // ⚠️ Yozuv (write) endpointlari auditorga TAQIQLANGAN — auditor faqat o'qiy oladi.
  // Klass-darajadagi @Roles auditorni ham kiritadi (GET uchun), shuning uchun bu erda override.
  @Post()
  @Roles('superadmin', 'admin', 'accountant')
  create(@Body() dto: CreateExpenseDto, @CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.expenses.create(dto, user, req.ip);
  }

  @Patch(':id')
  @Roles('superadmin', 'admin', 'accountant')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateExpenseDto, @CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.expenses.update(id, dto, user, req.ip);
  }

  @Delete(':id')
  @Roles('superadmin', 'admin', 'accountant')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.expenses.remove(id, user, req.ip);
  }
}
