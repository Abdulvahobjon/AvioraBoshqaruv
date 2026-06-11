import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { FinanceService } from './finance.service';
import { CreateFinanceRequestDto, ReverseDto } from './dto/finance.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@ApiTags('finance')
@ApiBearerAuth()
@Controller('finance')
export class FinanceController {
  constructor(private readonly finance: FinanceService) {}

  @Get('balance')
  balance(@CurrentUser() user: AuthUser) {
    return this.finance.balance(user);
  }

  @Get('requests')
  listRequests(@CurrentUser() user: AuthUser, @Query() q: any) {
    return this.finance.listRequests(user, q);
  }

  @Post('requests')
  createRequest(@Body() dto: CreateFinanceRequestDto, @CurrentUser() user: AuthUser) {
    return this.finance.createRequest(dto, user);
  }

  @Post('requests/:id/pay')
  pay(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.finance.pay(id, user, req.ip);
  }

  @Post('requests/:id/confirm')
  confirm(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.finance.confirm(id, user, req.ip);
  }

  @Post('requests/:id/reject')
  reject(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.finance.reject(id, user, req.ip);
  }

  @Get('ledger')
  @Roles('superadmin', 'admin', 'accountant', 'auditor')
  ledger(@Query() q: any) {
    return this.finance.ledger(q);
  }

  @Post('ledger/:id/reverse')
  @Roles('superadmin', 'admin', 'accountant')
  reverse(@Param('id', ParseIntPipe) id: number, @Body() dto: ReverseDto, @CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.finance.reverse(id, dto, user, req.ip);
  }
}
