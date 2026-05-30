import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  oldPassword: string;

  @ApiProperty({ example: 'YangiParol123!' })
  @IsString()
  @MinLength(6, { message: 'Yangi parol kamida 6 belgidan iborat bo\'lsin' })
  newPassword: string;
}
