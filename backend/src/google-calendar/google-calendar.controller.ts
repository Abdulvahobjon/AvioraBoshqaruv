import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GoogleCalendarService, GoogleHealth } from './google-calendar.service';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('google')
@ApiBearerAuth()
@Controller('google')
export class GoogleCalendarController {
  constructor(private readonly gcal: GoogleCalendarService) {}

  /**
   * Token sog'ligini tekshirish: refresh_token bilan calendarList.list chaqiriladi.
   * { ok: true } yoki { ok: false, reason } qaytaradi. Faqat admin/superadmin.
   */
  @Get('health')
  @Roles('superadmin', 'admin')
  @ApiOperation({ summary: 'Google ulanishi sog\'ligi (refresh token amal qilyaptimi)' })
  health(): Promise<GoogleHealth> {
    return this.gcal.checkHealth();
  }
}
