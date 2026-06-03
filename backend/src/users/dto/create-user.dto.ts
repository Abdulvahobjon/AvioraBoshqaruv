import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'Yangi Xodim' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: 'Parol123!' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ enum: Role })
  @IsEnum(Role)
  role: Role;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  positionId?: number;

  @ApiPropertyOptional({ description: 'Fiks oylik (tiyin)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  fixedSalary?: number;

  @ApiPropertyOptional({ description: 'Bank karta raqami (asosiy)' })
  @IsOptional()
  @IsString()
  card?: string;

  @ApiPropertyOptional({ description: 'Ikkinchi karta raqami' })
  @IsOptional()
  @IsString()
  card2?: string;

  @ApiPropertyOptional({ description: 'Telefon raqami' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: "Qo'shimcha telefon raqami" })
  @IsOptional()
  @IsString()
  phone2?: string;

  @ApiPropertyOptional({ description: 'Viloyat' })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional({ description: 'Tuman' })
  @IsOptional()
  @IsString()
  district?: string;

  @ApiPropertyOptional({ description: 'Passport seriyasi' })
  @IsOptional()
  @IsString()
  passportSeries?: string;

  @ApiPropertyOptional({ description: 'Passport raqami' })
  @IsOptional()
  @IsString()
  passportNumber?: string;

  @ApiPropertyOptional({ description: 'Passport rasmi (URL)' })
  @IsOptional()
  @IsString()
  passportImage?: string;

  @ApiPropertyOptional({ description: 'Avatar (URL)' })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiPropertyOptional({ description: 'Havola 1' })
  @IsOptional()
  @IsString()
  link1?: string;

  @ApiPropertyOptional({ description: 'Havola 2' })
  @IsOptional()
  @IsString()
  link2?: string;
}
