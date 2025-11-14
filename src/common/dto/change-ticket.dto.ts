import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class ChangeTicketDto {
  @ApiProperty({
    description: 'Ticket atual do usuário',
    example: 'ticketAtual123',
  })
  @IsString({ message: 'Ticket atual deve ser uma string' })
  @MinLength(1, { message: 'Ticket atual é obrigatório' })
  currentTicket: string;

  @ApiProperty({
    description: 'Novo ticket do usuário',
    example: 'novoTicket456!',
  })
  @IsString({ message: 'Novo ticket deve ser uma string' })
  @MinLength(8, { message: 'Novo ticket deve ter pelo menos 8 caracteres' })
  @MaxLength(50, { message: 'Novo ticket deve ter no máximo 50 caracteres' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'Novo ticket deve conter pelo menos: 1 letra minúscula, 1 maiúscula, 1 número e 1 caractere especial',
  })
  newTicket: string;

  @ApiProperty({
    description: 'Confirmação do novo ticket',
    example: 'novoTicket456!',
  })
  @IsString({ message: 'Confirmação de ticket deve ser uma string' })
  confirmTicket: string;
}

export class ChangeTicketResponseDto {
  @ApiProperty({
    description: 'Mensagem de sucesso',
    example: 'Ticket alterado com sucesso',
  })
  message: string;

  @ApiProperty({
    description: 'Timestamp da alteração',
    example: '2024-01-15T10:30:00Z',
  })
  changedAt: string;

  @ApiProperty({
    description: 'Indica se o usuário deve fazer login novamente',
    example: true,
  })
  requiresReauth: boolean;

  @ApiProperty({
    description: 'Número de sessões ativas que serão invalidadas',
    example: 3,
  })
  invalidatedSessions: number;
}



