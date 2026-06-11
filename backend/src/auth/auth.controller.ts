import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // Brute-force himoyasi: bir IP'dan 1 daqiqada maks 8 ta login urinishi.
  @Throttle({ default: { ttl: 60_000, limit: 8 } })
  @Public()
  @Post('login')
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.auth.login(dto, req.ip);
  }

  @Public()
  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @ApiBearerAuth()
  @Get('me')
  me(@CurrentUser('id') userId: number) {
    return this.auth.me(userId);
  }

  @ApiBearerAuth()
  @Post('change-password')
  changePassword(@CurrentUser('id') userId: number, @Body() dto: ChangePasswordDto, @Req() req: Request) {
    return this.auth.changePassword(userId, dto, req.ip);
  }
}
