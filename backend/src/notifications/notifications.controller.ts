import { Controller, Get, Param, ParseIntPipe, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  // Bildirishnomalar faqat o'qiladi — o'chirish yo'q. Scroll pagination: ?cursor=&take=
  @Get()
  list(
    @CurrentUser('id') userId: number,
    @Query('cursor') cursor?: string,
    @Query('take') take?: string,
  ) {
    return this.notifications.findForUser(userId, cursor ? Number(cursor) : undefined, take ? Number(take) : undefined);
  }

  @Patch('read-all')
  markAllRead(@CurrentUser('id') userId: number) {
    return this.notifications.markAllRead(userId);
  }

  @Patch(':id/read')
  markRead(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') userId: number) {
    return this.notifications.markRead(id, userId);
  }
}
