import { PartialType } from '@nestjs/mapped-types';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEmail, IsEnum, IsBoolean } from 'class-validator';
import { CreateCorporateUserDto, CorporateUserRole } from './create-corporate-user.dto';

export class UpdateCorporateUserDto extends PartialType(
  CreateCorporateUserDto,
) {
  @ApiPropertyOptional({
    description: 'Email do usuário corporativo',
    example: 'usuario@empresa.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'Nome completo do usuário',
    example: 'João da Silva',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'CPF do usuário (apenas números)',
    example: '12345678901',
  })
  @IsOptional()
  @IsString()
  cpf?: string;

  @ApiPropertyOptional({
    description: 'Senha do usuário',
    example: 'novaSenha123',
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

  @ApiPropertyOptional({
    description: 'Papel do usuário no sistema',
    enum: CorporateUserRole,
    example: CorporateUserRole.OPERADOR,
  })
  @IsOptional()
  @IsEnum(CorporateUserRole)
  role?: CorporateUserRole;

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

