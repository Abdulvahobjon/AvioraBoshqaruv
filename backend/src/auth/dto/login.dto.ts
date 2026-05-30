import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'Asadbek Superadmin', description: 'Login (Ism Familiya)' })
  @IsString()
  @IsNotEmpty({ message: 'Login kiritilishi shart' })
  fullName: string;

  @ApiProperty({ example: 'Aviora2026!' })
  @IsString()
  @MinLength(4, { message: 'Parol kamida 4 belgidan iborat bo\'lsin' })
  password: string;
}
