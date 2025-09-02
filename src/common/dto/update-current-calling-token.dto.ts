import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class UpdateCurrentCallingTokenDto {
  @ApiProperty({
    description: 'Novo token de chamada',
    example: 'B123',
  })
  @IsString()
  @IsNotEmpty()
  currentCallingToken: string;
}
