import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DailyPlanPriority } from '@prisma/client';
import { IsBoolean, IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class CreateDailyPlanDto {
  @ApiProperty({ example: 'Hisobotni tayyorlash' })
  @IsString()
  @IsNotEmpty({ message: 'Reja nomi shart' })
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: '2026-06-02', description: 'Reja sanasi (YYYY-MM-DD)' })
  @IsDateString({}, { message: 'Sana noto\'g\'ri' })
  date: string;

  @ApiPropertyOptional({ example: '14:30', description: 'Vaqt (HH:MM)' })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'Vaqt formati HH:MM bo\'lishi kerak' })
  time?: string;

  @ApiPropertyOptional({ enum: DailyPlanPriority })
  @IsOptional()
  @IsEnum(DailyPlanPriority)
  priority?: DailyPlanPriority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDone?: boolean;
}
