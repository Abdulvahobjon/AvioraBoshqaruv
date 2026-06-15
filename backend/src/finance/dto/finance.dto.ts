import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Currency, FinanceRequestType, PaymentMethod } from '@prisma/client';
import { ArrayMaxSize, IsArray, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateFinanceRequestDto {
  @ApiProperty({ description: 'Summa (tiyin)' })
  @IsInt({ message: 'Summa butun (tiyin) bo\'lsin' })
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

  @ApiPropertyOptional({ description: 'Bog\'langan loyiha' })
  @IsOptional()
  @IsInt()
  projectId?: number;

  @ApiPropertyOptional({ description: 'So\'rov sababi (ixtiyoriy)' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  card?: string;

  @ApiPropertyOptional({ enum: PaymentMethod, description: 'To\'lov turi (karta/naqd)' })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;
}

export class PayRequestDto {
  @ApiPropertyOptional({ enum: PaymentMethod, description: 'To\'lov turi (karta/naqd)' })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ description: 'To\'lov cheki/kvitansiya URL\'lari (0-3 ta)' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3, { message: 'Eng ko\'pi 3 ta chek' })
  @IsString({ each: true })
  receipts?: string[];
}

export class RejectRequestDto {
  @ApiPropertyOptional({ description: 'Bekor qilish sababi' })
  @IsOptional()
  @IsString()
  cancelReason?: string;
}

export class ReverseDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}
