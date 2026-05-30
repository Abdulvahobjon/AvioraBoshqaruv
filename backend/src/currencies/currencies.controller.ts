import { Body, Controller, Get, Param, Patch, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Currency } from '@prisma/client';
import { Request } from 'express';
import { CurrenciesService } from './currencies.service';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('currencies')
@ApiBearerAuth()
@Controller('currencies')
export class CurrenciesController {
  constructor(private readonly currencies: CurrenciesService) {}

  @Get()
  findAll() {
    return this.currencies.findAll();
  }

  @Get(':code/history')
  history(@Param('code') code: Currency) {
    return this.currencies.history(code);
  }

  @Patch(':code')
  @Roles('superadmin', 'admin')
  updateRate(
    @Param('code') code: Currency,
    @Body('rateToUzs') rateToUzs: number,
    @CurrentUser('id') actorId: number,
    @Req() req: Request,
  ) {
    return this.currencies.updateRate(code, Number(rateToUzs), actorId, req.ip);
  }
}
