import { ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsInt, IsOptional, Min } from 'class-validator';

/** KPI bonus / jarima (tiyin) — MA'LUMOT uchun; pul oqimiga (total/balance) ta'sir qilmaydi. */
export class UpdatePayrollDto {
  @ApiPropertyOptional({ description: 'KPI bonus (tiyin)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  kpiBonus?: number;

  @ApiPropertyOptional({ description: 'Jarima (tiyin, manfiy emas — ko\'rsatkichda qizil)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  penalty?: number;
}

/** Tanlangan oyliklarni ommaviy tasdiqlash (buxgalter "Tasdiqlash"). */
export class PayManyDto {
  @ApiPropertyOptional({ description: 'Tasdiqlanadigan payroll id\'lari' })
  @IsArray()
  @ArrayNotEmpty({ message: 'Hech bo\'lmaganda bitta tanlang' })
  @IsInt({ each: true })
  ids: number[];
}
