import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtPayload } from './jwt.strategy';

// Foydalanuvchi o'zi tahrirlashi mumkin bo'lgan maydonlar (rol/oylik/status YO'Q).
const SELF_PROFILE_FIELDS = [
  'card', 'card2', 'phone', 'phone2', 'region', 'district',
  'passportSeries', 'passportNumber', 'passportImage', 'avatar', 'link1', 'link2',
] as const;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private audit: AuditService,
  ) {}

  async login(dto: LoginDto, ip?: string) {
    // Login is human-typed: tolerate surrounding whitespace and letter-case.
    const fullName = (dto.fullName || '').trim();
    const user = await this.prisma.user.findFirst({
      where: { fullName: { equals: fullName, mode: 'insensitive' } },
    });
    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('Login yoki parol noto\'g\'ri');
    }
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Login yoki parol noto\'g\'ri');
    }

    await this.audit.record({ userId: user.id, entity: 'Auth', action: 'LOGIN', ip });
    // Ruxsat etilgan rollar = asosiy rol + qo'shimcha rollar. Birinchi (asosiy) — default aktiv rol.
    const allowed = this.allowedRoles(user);
    const activeRole = allowed[0];
    const tokens = await this.issueTokens({ sub: user.id, role: activeRole, tv: user.tokenVersion });
    // mustSelectRole=true bo'lsa, frontend rol tanlash oynasini ko'rsatadi (token default rol bilan ishlaydi).
    return { ...tokens, user: this.publicUser(user, activeRole), roles: allowed, mustSelectRole: allowed.length > 1 };
  }

  /** Foydalanuvchining barcha ruxsat etilgan rollari: asosiy 'role' + qo'shimcha 'roles' (dedup). */
  private allowedRoles(user: { role: string; roles?: string[] }): string[] {
    return [...new Set([user.role, ...(user.roles || [])])];
  }

  /** Aktiv rolni almashtirish — yangi token qayta beriladi (qayta login shart emas). */
  async switchRole(userId: number, role: string) {
    const user = await this.prisma.user.findFirst({ where: { id: userId, status: 'active' } });
    if (!user) throw new UnauthorizedException();
    const allowed = this.allowedRoles(user);
    if (!allowed.includes(role)) throw new BadRequestException('Bu rol sizga biriktirilmagan');
    const tokens = await this.issueTokens({ sub: user.id, role, tv: user.tokenVersion });
    return { ...tokens, user: this.publicUser(user, role), roles: allowed };
  }

  async refresh(refreshToken?: string) {
    if (!refreshToken) throw new UnauthorizedException('Refresh token topilmadi');
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token yaroqsiz');
    }
    const user = await this.prisma.user.findFirst({ where: { id: payload.sub, status: 'active' } });
    if (!user) throw new UnauthorizedException('Foydalanuvchi topilmadi');
    // tokenVersion mos kelmasa — token bekor qilingan (parol o'zgargan / chiqilgan).
    if ((payload.tv ?? 0) !== user.tokenVersion) throw new UnauthorizedException('Refresh token bekor qilingan');
    // Aktiv rolni saqlaymiz (refresh'da o'zgarmaydi); roli endi yaroqsiz bo'lsa asosiyga qaytamiz.
    const allowed = this.allowedRoles(user);
    const active = payload.role && allowed.includes(payload.role) ? payload.role : allowed[0];
    return this.issueTokens({ sub: user.id, role: active, tv: user.tokenVersion });
  }

  async me(userId: number, activeRole?: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId },
      include: { position: true },
    });
    if (!user) throw new UnauthorizedException();
    return this.publicUser(user, activeRole);
  }

  /** Foydalanuvchi o'z profilini tahrirlaydi — faqat shaxsiy maydonlar (rol/oylik o'zgarmaydi). */
  async updateProfile(userId: number, dto: UpdateProfileDto, activeRole: string, ip?: string) {
    const before = await this.prisma.user.findFirst({ where: { id: userId } });
    if (!before) throw new UnauthorizedException();
    const data: any = {};
    for (const f of SELF_PROFILE_FIELDS) {
      if ((dto as any)[f] !== undefined) data[f] = (dto as any)[f] || null;
    }
    const user = await this.prisma.user.update({
      where: { id: userId },
      data,
      include: { position: true },
    });
    await this.audit.record({ userId, entity: 'User', entityId: userId, action: 'UPDATE_PROFILE', ip });
    return this.publicUser(user, activeRole);
  }

  async changePassword(userId: number, dto: ChangePasswordDto, ip?: string) {
    const user = await this.prisma.user.findFirst({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    const ok = await bcrypt.compare(dto.oldPassword, user.passwordHash);
    if (!ok) throw new BadRequestException('Joriy parol noto\'g\'ri');

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    // tokenVersion oshadi → eski refresh tokenlar darhol bekor bo'ladi.
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash, tokenVersion: { increment: 1 } } });
    await this.audit.record({ userId, entity: 'User', entityId: userId, action: 'CHANGE_PASSWORD', ip });
    return { message: 'Parol o\'zgartirildi' };
  }

  private async issueTokens(payload: JwtPayload) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES', '15m'),
      }),
      this.jwt.signAsync(payload, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES', '7d'),
      }),
    ]);
    return { accessToken, refreshToken };
  }

  private publicUser(user: any, activeRole?: string) {
    const { passwordHash, ...rest } = user;
    const allowed = this.allowedRoles(user);
    // role = AKTIV rol (tanlangan); roles = barcha ruxsat etilgan rollar (almashtirish uchun).
    return { ...rest, role: activeRole || user.role, roles: allowed };
  }
}
