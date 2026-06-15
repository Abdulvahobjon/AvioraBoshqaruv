import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Foydalanuvchi O'ZINING profilini tahrirlashi — faqat shaxsiy maydonlar.
 * Rol, qo'shimcha rollar, oylik, status, login (fullName) bu yerda YO'Q —
 * ularni faqat admin/superadmin o'zgartira oladi (privilege escalation himoyasi).
 */
export class UpdateProfileDto {
  @ApiPropertyOptional({ description: 'Bank karta raqami (asosiy)' })
  @IsOptional() @IsString() @MaxLength(32)
  card?: string;

  @ApiPropertyOptional({ description: 'Ikkinchi karta raqami' })
  @IsOptional() @IsString() @MaxLength(32)
  card2?: string;

  @ApiPropertyOptional({ description: 'Telefon raqami' })
  @IsOptional() @IsString() @MaxLength(32)
  phone?: string;

  @ApiPropertyOptional({ description: "Qo'shimcha telefon raqami" })
  @IsOptional() @IsString() @MaxLength(32)
  phone2?: string;

  @ApiPropertyOptional({ description: 'Viloyat' })
  @IsOptional() @IsString() @MaxLength(64)
  region?: string;

  @ApiPropertyOptional({ description: 'Tuman' })
  @IsOptional() @IsString() @MaxLength(64)
  district?: string;

  @ApiPropertyOptional({ description: 'Passport seriyasi' })
  @IsOptional() @IsString() @MaxLength(16)
  passportSeries?: string;

  @ApiPropertyOptional({ description: 'Passport raqami' })
  @IsOptional() @IsString() @MaxLength(16)
  passportNumber?: string;

  @ApiPropertyOptional({ description: 'Passport rasmi (URL)' })
  @IsOptional() @IsString() @MaxLength(255)
  passportImage?: string;

  @ApiPropertyOptional({ description: 'Avatar (URL)' })
  @IsOptional() @IsString() @MaxLength(255)
  avatar?: string;

  @ApiPropertyOptional({ description: 'Havola 1' })
  @IsOptional() @IsString() @MaxLength(255)
  link1?: string;

  @ApiPropertyOptional({ description: 'Havola 2' })
  @IsOptional() @IsString() @MaxLength(255)
  link2?: string;
}
