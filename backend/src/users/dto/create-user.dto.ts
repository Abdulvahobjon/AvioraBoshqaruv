import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'Yangi Xodim' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: 'Parol123!' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ enum: Role })
  @IsEnum(Role)
  role: Role;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  positionId?: number;

  @ApiPropertyOptional({ description: 'Fiks oylik (tiyin)' })
  @IsOptional()
  @Min(0)
  fixedSalary?: number;

  @ApiPropertyOptional({ description: 'Bank karta raqami' })
  @IsOptional()
  @IsString()
  card?: string;
}
