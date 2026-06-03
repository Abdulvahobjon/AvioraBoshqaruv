import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ClientsModule } from './clients/clients.module';
import { ProjectsModule } from './projects/projects.module';
import { TasksModule } from './tasks/tasks.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SettingsModule } from './settings/settings.module';
import { CurrenciesModule } from './currencies/currencies.module';
import { FinanceModule } from './finance/finance.module';
import { PayrollModule } from './payroll/payroll.module';
import { ExpensesModule } from './expenses/expenses.module';
import { ReportsModule } from './reports/reports.module';
import { MeetingsModule } from './meetings/meetings.module';
import { DailyPlansModule } from './daily-plans/daily-plans.module';
import { CronModule } from './cron/cron.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuditModule,
    AuthModule,
    UsersModule,
    ClientsModule,
    ProjectsModule,
    TasksModule,
    NotificationsModule,
    SettingsModule,
    CurrenciesModule,
    FinanceModule,
    PayrollModule,
    ExpensesModule,
    ReportsModule,
    MeetingsModule,
    DailyPlansModule,
    CronModule,
  ],
  providers: [
    // Global auth: every route requires JWT unless @Public()
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Global RBAC: routes with @Roles() are checked
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
