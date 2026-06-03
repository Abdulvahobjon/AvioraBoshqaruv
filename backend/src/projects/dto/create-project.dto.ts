import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Currency, PaymentStatus, ProjectRole, ProjectStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class ProjectMemberDto {
  @ApiProperty()
  @IsInt()
  userId: number;

  @ApiProperty({ enum: ProjectRole })
  @IsEnum(ProjectRole)
  roleInProject: ProjectRole;

  @ApiProperty({ description: 'Ulush summasi (tiyin)' })
  @IsInt()
  @Min(0)
  shareAmount: number;

  @ApiPropertyOptional({ enum: Currency })
  @IsOptional()
  @IsEnum(Currency)
  shareCurrency?: Currency;
}

export class CreateProjectDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Loyiha nomi shart' })
  name: string;

  @ApiPropertyOptional({ description: 'Qisqa kod (meeting UID uchun, masalan "DSR")' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  typeId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deadline?: string;

  @ApiPropertyOptional({ enum: ProjectStatus })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @ApiProperty({ description: 'Summa (tiyin)' })
  @IsInt()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ enum: Currency })
  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  clientId?: number;

  @ApiPropertyOptional({ type: [ProjectMemberDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProjectMemberDto)
  members?: ProjectMemberDto[];
}
