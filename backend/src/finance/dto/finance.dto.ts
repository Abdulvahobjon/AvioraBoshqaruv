import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Currency, FinanceRequestType } from '@prisma/client';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateFinanceRequestDto {
  @ApiProperty({ description: 'Summa (tiyin)' })
  @Min(1, { message: 'Summa 0 dan katta bo\'lsin' })
  amount: number;

  @ApiPropertyOptional({ enum: Currency })
  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @ApiProperty({ enum: FinanceRequestType })
  @IsEnum(FinanceRequestType)
  type: FinanceRequestType;

  @ApiPropertyOptional({ description: 'type=other bo\'lsa kategoriya' })
  @IsOptional()
  @IsInt()
  categoryId?: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Sabab kiriting' })
  reason: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  card?: string;
}

export class ReverseDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}
