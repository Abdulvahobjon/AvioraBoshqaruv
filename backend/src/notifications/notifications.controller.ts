import { Controller, Get, Param, ParseIntPipe, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@CurrentUser('id') userId: number) {
    return this.notifications.findForUser(userId);
  }

  @Patch(':id/read')
  markRead(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') userId: number) {
    return this.notifications.markRead(id, userId);
  }

  @Patch('read-all')
  markAllRead(@CurrentUser('id') userId: number) {
    return this.notifications.markAllRead(userId);
  }
}
