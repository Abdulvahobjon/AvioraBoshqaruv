import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApplicationStatus } from '@prisma/client';

/** Arizani ko'rib chiqish (review) DTO — status o'zgartirish + xulosa. */
export class ReviewApplicationDto {
  @ApiProperty({ enum: ApplicationStatus })
  @IsEnum(ApplicationStatus)
  status: ApplicationStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'Xulosa kamida 3 belgidan iborat bo\'lsin' })
  @MaxLength(2000)
  conclusion?: string;
}
