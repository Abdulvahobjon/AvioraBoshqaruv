import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateClientContactDto {
  @ApiProperty({ example: 'Akmal Karimov' })
  @IsString()
  @IsNotEmpty({ message: 'Kontakt ismi shart' })
  name: string;

  @ApiPropertyOptional({ description: 'Lavozim' })
  @IsOptional()
  @IsString()
  position?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail({}, { message: 'Email noto\'g\'ri' })
  email?: string;

  @ApiPropertyOptional({ description: 'Asosiy kontakt' })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class UpdateClientContactDto extends PartialType(CreateClientContactDto) {}
