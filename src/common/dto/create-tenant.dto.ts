import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateTenantDto {
  @ApiProperty({ description: 'Nome da empresa' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: 'Slug único da empresa' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  slug: string;

  @ApiPropertyOptional({ description: 'Email da empresa' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Telefone da empresa' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    description:
      'Email do administrador inicial da conta (será criado automaticamente)',
    example: 'admin@empresa.com',
  })
  @IsOptional()
  @IsEmail()
  adminEmail?: string;

  @ApiPropertyOptional({
    description: 'Nome do administrador inicial',
    example: 'João Silva',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  adminName?: string;

  @ApiPropertyOptional({
    description:
      'Senha do administrador (se não informada, será gerada uma temporária)',
    example: 'SenhaSegura123!',
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  adminPassword?: string;
}
