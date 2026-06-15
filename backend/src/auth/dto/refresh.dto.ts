import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RefreshDto {
  // Ixtiyoriy — refresh token endi httpOnly cookie'dan o'qiladi.
  // Bu maydon faqat eski mijozlar bilan moslik uchun qoldirilgan.
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
