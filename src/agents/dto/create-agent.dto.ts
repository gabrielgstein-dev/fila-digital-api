import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export enum AgentRole {
  OPERADOR = 'OPERADOR',
  GERENTE = 'GERENTE',
  GESTOR = 'GESTOR',
  ADMINISTRADOR = 'ADMINISTRADOR',
}

export class CreateAgentDto {
  @ApiProperty({ description: 'Email do funcionário' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'Nome do funcionário' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ description: 'Senha do funcionário' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @ApiPropertyOptional({ description: 'Google ID (para login com Google)' })
  @IsOptional()
  @IsString()
  googleId?: string;

  @ApiProperty({
    description: 'Função do funcionário',
    enum: AgentRole,
    default: AgentRole.OPERADOR,
  })
  @IsEnum(AgentRole)
  @IsNotEmpty()
  role: AgentRole;

  @ApiProperty({ description: 'ID do tenant' })
  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @ApiProperty({ description: 'CPF do funcionário (apenas números)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(11)
  cpf: string;
}
