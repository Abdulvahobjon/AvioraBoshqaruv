import { Controller, Get } from '@nestjs/common';
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
}
