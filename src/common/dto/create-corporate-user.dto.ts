import {
  IsEmail,
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum CorporateUserRole {
  OPERADOR = 'OPERADOR',
  GERENTE = 'GERENTE',
  GESTOR = 'GESTOR',
  ADMINISTRADOR = 'ADMINISTRADOR',
}

export class CreateCorporateUserDto {
  @ApiProperty({
    description: 'Email do usuário corporativo',
    example: 'usuario@empresa.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Nome completo do usuário',
    example: 'João da Silva',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'CPF do usuário (apenas números)',
    example: '12345678901',
  })
  @IsString()
  cpf: string;

  @ApiPropertyOptional({
    description: 'Senha do usuário (obrigatória se não tiver Google ID)',
    example: 'senha123',
  })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional({
    description: 'ID do Google (para login OAuth)',
    example: 'google_id_123',
  })
  @IsOptional()
  @IsString()
  googleId?: string;

  @ApiProperty({
    description: 'Papel do usuário no sistema',
    enum: CorporateUserRole,
    example: CorporateUserRole.OPERADOR,
  })
  @IsEnum(CorporateUserRole)
  role: CorporateUserRole;

  @ApiPropertyOptional({
    description: 'ID do tenant (será injetado automaticamente pelo controller)',
  })
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiPropertyOptional({
    description: 'Telefone do usuário',
    example: '(11) 99999-9999',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Departamento do usuário',
    example: 'Atendimento',
  })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({
    description: 'Cargo do usuário',
    example: 'Atendente',
  })
  @IsOptional()
  @IsString()
  position?: string;

  @ApiPropertyOptional({
    description: 'Status ativo do usuário',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
