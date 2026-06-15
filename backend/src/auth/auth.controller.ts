import {
  BadRequestException, Body, Controller, Get, Patch, Post, Req, Res,
  UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { SwitchRoleDto } from './dto/switch-role.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { uploadOptions } from '../common/upload.util';

const REFRESH_COOKIE = 'refresh_token';
const REFRESH_PATH = '/api/auth';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Refresh tokenni httpOnly cookie sifatida o'rnatadi — JS (XSS) o'qiy olmaydi.
   * path=/api/auth → cookie faqat auth endpointlariga yuboriladi (kengaytma yuzasini kamaytiradi).
   */
  private setRefreshCookie(res: Response, token: string) {
    const isProd = this.config.get<string>('NODE_ENV') === 'production';
    res.cookie(REFRESH_COOKIE, token, {
      httpOnly: true,
      secure: isProd, // prod'da faqat HTTPS orqali
      sameSite: 'lax',
      path: REFRESH_PATH,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 kun (refresh token muddati bilan mos)
    });
  }

  private clearRefreshCookie(res: Response) {
    res.clearCookie(REFRESH_COOKIE, { path: REFRESH_PATH });
  }

  /** cookie-parser'siz: Cookie sarlavhasidan refresh tokenni o'qiydi. */
  private readRefreshCookie(req: Request): string | undefined {
    const raw = req.headers.cookie;
    if (!raw) return undefined;
    for (const part of raw.split(';')) {
      const idx = part.indexOf('=');
      if (idx === -1) continue;
      if (part.slice(0, idx).trim() === REFRESH_COOKIE) {
        return decodeURIComponent(part.slice(idx + 1).trim());
      }
    }
    return undefined;
  }

  // Brute-force himoyasi: bir IP'dan 1 daqiqada maks 8 ta login urinishi.
  @Throttle({ default: { ttl: 60_000, limit: 8 } })
  @Public()
  @Post('login')
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.login(dto, req.ip);
    this.setRefreshCookie(res, result.refreshToken);
    // Refresh token JAVOB TANASIGA qaytarilmaydi — faqat httpOnly cookie'da.
    const { refreshToken, ...safe } = result;
    return safe;
  }

  @Public()
  @Post('refresh')
  async refresh(@Body() dto: RefreshDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    // Avval cookie'dan (xavfsiz), bo'lmasa eski mijozlar uchun body'dan.
    const token = this.readRefreshCookie(req) || dto?.refreshToken;
    const result = await this.auth.refresh(token);
    this.setRefreshCookie(res, result.refreshToken);
    const { refreshToken, ...safe } = result;
    return safe;
  }

  @Public()
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    this.clearRefreshCookie(res);
    return { message: 'Chiqildi' };
  }

  @ApiBearerAuth()
  @Post('switch-role')
  async switchRole(@Body() dto: SwitchRoleDto, @CurrentUser('id') userId: number, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.switchRole(userId, dto.role);
    this.setRefreshCookie(res, result.refreshToken);
    const { refreshToken, ...safe } = result;
    return safe;
  }

  @ApiBearerAuth()
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id, user.role);
  }

  @ApiBearerAuth()
  @Post('change-password')
  changePassword(@CurrentUser('id') userId: number, @Body() dto: ChangePasswordDto, @Req() req: Request) {
    return this.auth.changePassword(userId, dto, req.ip);
  }

  /** Foydalanuvchi o'z profilini tahrirlaydi — faqat shaxsiy maydonlar (rol/oylik admin ixtiyorida). */
  @ApiBearerAuth()
  @Patch('profile')
  updateProfile(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto, @Req() req: Request) {
    return this.auth.updateProfile(user.id, dto, user.role, req.ip);
  }

  /** O'z profili uchun fayl (avatar/passport) yuklash — har qanday tizimga kirgan foydalanuvchi. */
  @ApiBearerAuth()
  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', uploadOptions(10)))
  upload(@UploadedFile() file: any) {
    if (!file) throw new BadRequestException('Fayl yuklanmadi');
    return { url: `/uploads/${file.filename}`, name: file.originalname, size: file.size };
  }
}
