import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Currency, PaymentStatus, ProjectRole, ProjectStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
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

export class ProjectDocumentDto {
  @ApiProperty({ description: 'Hujjat nomi (masalan "Frontend")' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Havola (URL)' })
  @IsString()
  @IsNotEmpty()
  url: string;
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

  @ApiPropertyOptional({ description: 'Jarima foizi (%)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  penaltyPercent?: number;

  @ApiPropertyOptional({ description: 'Muzlatilganmi (tahrirlash bloklanadi)' })
  @IsOptional()
  @IsBoolean()
  isFrozen?: boolean;

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

  @ApiPropertyOptional({ description: 'Sinovchilar (foydalanuvchi ID lari) — xodimlardan alohida', type: [Number] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  testerIds?: number[];

  @ApiPropertyOptional({ type: [ProjectDocumentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProjectDocumentDto)
  documents?: ProjectDocumentDto[];
}
