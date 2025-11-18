import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateTicketDto {
  @ApiPropertyOptional({ description: 'Nome do cliente' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  clientName?: string;

  @ApiPropertyOptional({ description: 'CPF do cliente' })
  @IsOptional()
  @IsString()
  @MaxLength(11)
  clientCpf?: string;

  @ApiPropertyOptional({ description: 'Telefone do cliente' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  clientPhone?: string;

  @ApiPropertyOptional({ description: 'Email do cliente' })
  @IsOptional()
  @IsEmail()
  clientEmail?: string;

  @ApiPropertyOptional({ description: 'Chat ID do Telegram' })
  @IsOptional()
  @IsString()
  telegramChatId?: string;

  @ApiPropertyOptional({
    description: 'Prioridade do ticket',
    default: 1,
    minimum: 1,
    maximum: 10,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  priority?: number;
}
