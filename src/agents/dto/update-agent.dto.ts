import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { AgentRole } from './create-agent.dto';

export class UpdateAgentDto {
  @ApiPropertyOptional({ description: 'Email do funcionário' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Nome do funcionário' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: 'Senha do funcionário' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @ApiPropertyOptional({
    description: 'Função do funcionário',
    enum: AgentRole,
  })
  @IsOptional()
  @IsEnum(AgentRole)
  role?: AgentRole;

  @ApiPropertyOptional({ description: 'Status ativo do funcionário' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
