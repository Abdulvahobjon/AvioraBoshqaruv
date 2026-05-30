import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { ExpensesService } from './expenses.service';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@ApiTags('expenses')
@ApiBearerAuth()
@Controller('expenses')
@Roles('superadmin', 'admin', 'accountant')
export class ExpensesController {
  constructor(private readonly expenses: ExpensesService) {}

  @Get()
  findAll(@Query() q: any) {
    return this.expenses.findAll(q);
  }

  @Post()
  create(@Body() dto: any, @CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.expenses.create(dto, user, req.ip);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: any, @CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.expenses.update(id, dto, user, req.ip);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.expenses.remove(id, user, req.ip);
  }
}
