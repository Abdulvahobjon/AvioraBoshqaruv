import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

/** Role-aware dashboard summary. No @Roles → available to every authenticated user. */
@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly reports: ReportsService) {}

  @Get()
  dashboard(@CurrentUser() user: AuthUser) {
    return this.reports.dashboard(user);
  }

  /** Vazifa/loyiha/yig'ilish dinamikasi — davr bo'yicha (period=1m|3m|6m|1y). Hamma rollar. */
  @Get('analytics')
  analytics(@CurrentUser() user: AuthUser, @Query('period') period?: string) {
    return this.reports.analytics(user, period);
  }
}
