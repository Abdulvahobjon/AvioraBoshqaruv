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

export class FinishMeetingDto {
  @ApiPropertyOptional({ type: [Number], description: 'Qatnashgan foydalanuvchilar ID lari' })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  attendedUserIds?: number[];
}

export class SetAttendanceDto {
  @ApiProperty({ description: 'Qaysi ishtirokchi' })
  @IsInt()
  userId: number;

  @ApiPropertyOptional({ description: 'Qatnashdimi' })
  @IsOptional()
  @IsBoolean()
  attended?: boolean;

  @ApiPropertyOptional({ description: 'Qatnashmagan bo\'lsa sabab' })
  @IsOptional()
  @IsString()
  absenceReason?: string;

  @ApiPropertyOptional({ description: 'Tashkilotchi qarori: true=sababli, false=sababsiz' })
  @IsOptional()
  @IsBoolean()
  excused?: boolean;
}

export class SubmitReasonDto {
  @ApiProperty({ description: 'Qatnashmaslik sababi' })
  @IsString()
  @IsNotEmpty({ message: 'Sabab kiriting' })
  reason: string;
}
