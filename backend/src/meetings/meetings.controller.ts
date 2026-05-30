import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MeetingsService } from './meetings.service';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@ApiTags('meetings')
@ApiBearerAuth()
@Controller('meetings')
export class MeetingsController {
  constructor(private readonly meetings: MeetingsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.meetings.findAll(user);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.meetings.findOne(id);
  }

  @Post()
  create(@Body() dto: any, @CurrentUser() user: AuthUser) {
    return this.meetings.create(dto, user);
  }

  /** Finish meeting: body { attendedUserIds: number[] } */
  @Post(':id/finish')
  finish(@Param('id', ParseIntPipe) id: number, @Body('attendedUserIds') attendedUserIds: number[], @CurrentUser() user: AuthUser) {
    return this.meetings.finish(id, attendedUserIds || [], user);
  }

  /** Non-attendee submits absence reason. */
  @Post(':id/reason')
  submitReason(@Param('id', ParseIntPipe) id: number, @Body('reason') reason: string, @CurrentUser() user: AuthUser) {
    return this.meetings.submitReason(id, reason, user);
  }

  @Post(':id/attendance')
  setAttendance(@Param('id', ParseIntPipe) id: number, @Body() dto: any, @CurrentUser() user: AuthUser) {
    return this.meetings.setAttendance(id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.meetings.remove(id, user);
  }
}
