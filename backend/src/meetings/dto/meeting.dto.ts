import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsArray, IsBoolean, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min,
} from 'class-validator';

export class CreateMeetingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ description: 'Boshlanish vaqti (ISO yoki YYYY-MM-DDTHH:mm)' })
  @IsString()
  @IsNotEmpty({ message: 'Boshlanish vaqti kiritilsin' })
  startAt: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  projectId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  link?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: 'Davomiyligi (daqiqa)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  duration?: number;

  @ApiPropertyOptional({ description: 'Jarima foizi (%)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  penaltyPercent?: number;

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  participantIds?: number[];
}

export class UpdateMeetingDto extends PartialType(CreateMeetingDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  finished?: boolean;
}
