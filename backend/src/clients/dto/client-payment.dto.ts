import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Currency } from '@prisma/client';
import { IsEnum, IsInt, IsISO8601, IsOptional, Min } from 'class-validator';

export class CreateClientPaymentDto {
  @ApiProperty({ description: 'Summa (tiyin)' })
  @IsInt()
  @Min(1)
  amount: number;

  @ApiPropertyOptional({ enum: Currency })
  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @ApiPropertyOptional({ description: 'Bog\'liq loyiha ID (ixtiyoriy)' })
  @IsOptional()
  @IsInt()
  projectId?: number;

  @ApiPropertyOptional({ description: 'To\'lov sanasi (ISO)' })
  @IsOptional()
  @IsISO8601()
  date?: string;
}
