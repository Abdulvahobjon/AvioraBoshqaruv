import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Currency } from '@prisma/client';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateExpenseDto {
  @ApiProperty({ description: 'Summa (tiyin)' })
  @IsInt({ message: 'Summa butun (tiyin) bo\'lsin' })
  @Min(1, { message: 'Summa 0 dan katta bo\'lsin' })
  amount: number;

  @ApiPropertyOptional({ enum: Currency })
  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @ApiPropertyOptional({ description: 'Xarajat kategoriyasi' })
  @IsOptional()
  @IsInt()
  categoryId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ description: 'Sana (ISO)' })
  @IsOptional()
  @IsDateString()
  date?: string;
}

export class UpdateExpenseDto extends PartialType(CreateExpenseDto) {}
