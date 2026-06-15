import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { HealthController } from './health.controller';
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
import { AuditorReadOnlyGuard } from './common/guards/auditor-read-only.guard';

/**
 * Muhim env'lar mavjudligini ilova ko'tarilishida (fail-fast) tekshiradi.
 * JWT sirlari yo'q/qisqa bo'lsa — bo'sh/zaif sir bilan ishlamasin, balki darhol yiqilsin.
 */
function validateEnv(config: Record<string, any>) {
  const required = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
  for (const key of required) {
    const v = config[key];
    if (!v || String(v).length < 16) {
      throw new Error(`Konfiguratsiya xatosi: ${key} yo'q yoki juda qisqa (kamida 16 belgi). .env ni tekshiring.`);
    }
  }
  return config;
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    ScheduleModule.forRoot(),
    // Global rate-limit: bir IP'dan 1 daqiqada maks 120 so'rov (brute-force/DoS himoyasi).
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
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
  controllers: [HealthController],
  providers: [
    // Global rate-limit guard (eng birinchi ishlaydi)
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Global auth: every route requires JWT unless @Public()
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Global RBAC: routes with @Roles() are checked
    { provide: APP_GUARD, useClass: RolesGuard },
    // Nazoratchi (auditor) read-only — RolesGuard'dan keyin
    { provide: APP_GUARD, useClass: AuditorReadOnlyGuard },
  ],
})
export class AppModule {}
