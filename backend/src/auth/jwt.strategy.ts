import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

export interface JwtPayload {
  sub: number;
  role: string;
  tv?: number; // tokenVersion (refresh tokenni bekor qilish uchun)
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, status: 'active' },
      select: { id: true, fullName: true, role: true, roles: true, tokenVersion: true },
    });
    if (!user) throw new UnauthorizedException('Foydalanuvchi topilmadi yoki bloklangan');
    // tokenVersion mos kelmasa — token bekor qilingan (parol o'zgargan / majburiy chiqish).
    // Aks holda eski access token muddati tugagunicha (15m) yaroqli qolardi.
    if ((payload.tv ?? 0) !== user.tokenVersion) {
      throw new UnauthorizedException('Token bekor qilingan, qaytadan kiring');
    }
    // AKTIV rol token'dan keladi — lekin u foydalanuvchining ruxsat etilgan rollaridan biri
    // bo'lishi SHART (xavfsizlik: o'ziga biriktirilmagan rolni da'vo qila olmaydi).
    const allowed = [...new Set<string>([user.role, ...(user.roles || [])])];
    const active = payload.role && allowed.includes(payload.role) ? payload.role : user.role;
    return { id: user.id, fullName: user.fullName, role: active, roles: allowed }; // request.user
  }
}
