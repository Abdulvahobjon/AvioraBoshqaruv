import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DailyPlansService } from './daily-plans.service';
import { CreateDailyPlanDto } from './dto/create-daily-plan.dto';
import { UpdateDailyPlanDto } from './dto/update-daily-plan.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('daily-plans')
@ApiBearerAuth()
@Controller('daily-plans')
export class DailyPlansController {
  constructor(private readonly plans: DailyPlansService) {}

  @Get()
  findAll(@CurrentUser('id') userId: number, @Query('date') date?: string) {
    return this.plans.findAll(userId, date);
  }

  @Post()
  create(@CurrentUser('id') userId: number, @Body() dto: CreateDailyPlanDto) {
    return this.plans.create(userId, dto);
  }

  @Patch(':id')
  update(@CurrentUser('id') userId: number, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDailyPlanDto) {
    return this.plans.update(userId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser('id') userId: number, @Param('id', ParseIntPipe) id: number) {
    return this.plans.remove(userId, id);
  }
}
