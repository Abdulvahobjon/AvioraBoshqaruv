import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateClientDocumentDto {
  @ApiProperty({ description: 'Hujjat nomi' })
  @IsString()
  @IsNotEmpty({ message: 'Hujjat nomi shart' })
  name: string;

  @ApiProperty({ description: 'Fayl URL (avval /clients/upload orqali yuklangan)' })
  @IsString()
  @IsNotEmpty({ message: 'Fayl URL shart' })
  url: string;
}
