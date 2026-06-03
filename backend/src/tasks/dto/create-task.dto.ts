import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskPriority, TaskStatus, TaskType } from '@prisma/client';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateTaskDto {
  @ApiProperty()
  @IsInt()
  projectId: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Sarlavha shart' })
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  assigneeId?: number;

  @ApiPropertyOptional({ enum: TaskStatus })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({ enum: TaskPriority })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional({ enum: TaskType })
  @IsOptional()
  @IsEnum(TaskType)
  type?: TaskType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  positionId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deadline?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  estimatedMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  sprint?: number;

  @ApiPropertyOptional({ description: 'Vazifa narxi (tiyin)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ description: 'Jarima foizi (%)' })
  @IsOptional()
  @Min(0)
  penaltyPercent?: number;
}
