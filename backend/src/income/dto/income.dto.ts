import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Currency } from '@prisma/client';
import { IsEnum, IsInt, IsISO8601, IsOptional, Min } from 'class-validator';

export class CreateIncomeDto {
  @ApiProperty({ description: 'Summa (tiyin)' })
  @IsInt()
  @Min(1)
  amount: number;

  @ApiPropertyOptional({ enum: Currency })
  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @ApiPropertyOptional({ description: 'Tushum sanasi (ISO)' })
  @IsOptional()
  @IsISO8601()
  date?: string;
}
