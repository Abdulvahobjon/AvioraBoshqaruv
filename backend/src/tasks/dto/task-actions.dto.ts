import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskStatus } from '@prisma/client';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/** Kanban drag&drop: move to a column + position. */
export class ChangeStatusDto {
  @ApiProperty({ enum: TaskStatus })
  @IsEnum(TaskStatus)
  status: TaskStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  orderIndex?: number;
}

/** Manager/Admin review of a "done" task. */
export class ReviewTaskDto {
  @ApiProperty({ enum: ['checked', 'rejected'] })
  @IsEnum({ checked: 'checked', rejected: 'rejected' } as any)
  verdict: 'checked' | 'rejected';

  @ApiPropertyOptional({ description: "Rejected bo'lsa izoh majburiy" })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiPropertyOptional({ description: 'Rad etish dalili — rasm URL (ixtiyoriy)' })
  @IsOptional()
  @IsString()
  photoUrl?: string;
}

export class CreateCommentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Izoh bo\'sh bo\'lmasin' })
  body: string;
}
