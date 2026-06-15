import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { PayrollService } from './payroll.service';
import { PayManyDto, UpdatePayrollDto } from './dto/payroll.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@ApiTags('payroll')
@ApiBearerAuth()
@Controller('payroll')
export class PayrollController {
  constructor(private readonly payroll: PayrollService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() q: any) {
    return this.payroll.list(user, q);
  }

  @Post('generate')
  @Roles('superadmin', 'admin', 'accountant')
  generate(@Body('month') month: string, @CurrentUser() user: AuthUser) {
    return this.payroll.generate(month, user);
  }

  /** Tanlangan oyliklarni ommaviy tasdiqlash (buxgalter "Tasdiqlash"). */
  @Post('pay-many')
  @Roles('superadmin', 'admin', 'accountant')
  payMany(@Body() dto: PayManyDto, @CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.payroll.payMany(dto, user, req.ip);
  }

  /** KPI bonus / jarima (ma'lumot uchun) ni yangilash. */
  @Patch(':id')
  @Roles('superadmin', 'admin', 'accountant')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePayrollDto, @CurrentUser() user: AuthUser) {
    return this.payroll.update(id, dto, user);
  }

  @Post(':id/ready')
  @Roles('superadmin', 'admin', 'accountant')
  markReady(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.payroll.markReady(id, user);
  }

  @Post(':id/pay')
  @Roles('superadmin', 'admin', 'accountant')
  pay(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.payroll.pay(id, user, req.ip);
  }

  @Post(':id/confirm')
  confirm(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.payroll.confirm(id, user, req.ip);
  }
}
