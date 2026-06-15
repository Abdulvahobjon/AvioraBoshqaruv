import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ClientActivityType } from '@prisma/client';
import { IsEnum, IsISO8601, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateClientActivityDto {
  @ApiProperty({ enum: ClientActivityType })
  @IsEnum(ClientActivityType)
  type: ClientActivityType;

  @ApiProperty({ description: 'Izoh / tafsilot' })
  @IsString()
  @IsNotEmpty({ message: 'Izoh kiritilishi shart' })
  note: string;

  @ApiPropertyOptional({ description: 'Sana (ISO) — bo\'sh bo\'lsa hozir' })
  @IsOptional()
  @IsISO8601()
  date?: string;
}
