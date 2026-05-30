import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ClientStatus, ClientType } from '@prisma/client';
import { IsEmail, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateClientDto {
  @ApiProperty({ example: 'OOO "Tech"' })
  @IsString()
  @IsNotEmpty({ message: 'Mijoz nomi shart' })
  name: string;

  @ApiProperty({ enum: ClientType })
  @IsEnum(ClientType)
  type: ClientType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail({}, { message: 'Email noto\'g\'ri' })
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  regionId?: number;

  @ApiPropertyOptional({ description: 'Mas\'ul menejer ID' })
  @IsOptional()
  @IsInt()
  managerId?: number;

  @ApiPropertyOptional({ enum: ClientStatus })
  @IsOptional()
  @IsEnum(ClientStatus)
  status?: ClientStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}
