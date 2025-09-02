import { IsString, MinLength, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CorporateUserLoginDto {
  @ApiProperty({ description: 'Email do usuário corporativo' })
  @IsEmail({}, { message: 'Email deve ser um endereço válido' })
  email: string;

  @ApiProperty({ description: 'Senha do usuário corporativo' })
  @IsString()
  @MinLength(6, { message: 'Senha deve ter pelo menos 6 caracteres' })
  password: string;
}
