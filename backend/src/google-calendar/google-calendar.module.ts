import { Module } from '@nestjs/common';
import { GoogleCalendarService } from './google-calendar.service';
import { GoogleCalendarController } from './google-calendar.controller';

@Module({
  controllers: [GoogleCalendarController],
  providers: [GoogleCalendarService],
  exports: [GoogleCalendarService],
})
export class GoogleCalendarModule {}
