import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtPayload } from './jwt.strategy';

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
    const tokens = await this.issueTokens({ sub: user.id, role: user.role });
    return { ...tokens, user: this.publicUser(user) };
  }

  async refresh(refreshToken: string) {
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
    return this.issueTokens({ sub: user.id, role: user.role });
  }

  async me(userId: number) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId },
      include: { position: true },
    });
    if (!user) throw new UnauthorizedException();
    return this.publicUser(user);
  }

  async changePassword(userId: number, dto: ChangePasswordDto, ip?: string) {
    const user = await this.prisma.user.findFirst({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    const ok = await bcrypt.compare(dto.oldPassword, user.passwordHash);
    if (!ok) throw new BadRequestException('Joriy parol noto\'g\'ri');

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
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

  private publicUser(user: any) {
    const { passwordHash, ...rest } = user;
    return rest;
  }
}
