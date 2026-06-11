import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from './common/decorators/public.decorator';

/**
 * Oddiy health endpoint — Docker/Render healthcheck va monitoring uchun.
 * Public: autentifikatsiya talab qilinmaydi (Swagger productionda yopiq bo'lgani uchun
 * healthcheck'ni shu yerga yo'naltiramiz).
 */
@ApiTags('health')
@Controller('health')
export class HealthController {
  @Public()
  @Get()
  check() {
    return { status: 'ok', uptime: process.uptime() };
  }
}
