import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { TicketChangeService } from './ticket-change.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import {
  ChangeTicketDto,
  ChangeTicketResponseDto,
} from '../common/dto/change-ticket.dto';
import { CurrentUser } from './decorators/current-user.decorator';

@ApiTags('auth')
@Controller('auth')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TicketChangeController {
  constructor(private readonly ticketChangeService: TicketChangeService) {}

  @Post('change-ticket')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 300000 } }) // 3 tentativas por 5 minutos
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Alterar ticket do usuário',
    description:
      'Permite que o usuário altere seu próprio ticket. Requer autenticação e valida o ticket atual.',
  })
  @ApiBody({ type: ChangeTicketDto })
  @ApiResponse({
    status: 200,
    description: 'Ticket alterado com sucesso',
    type: ChangeTicketResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos (tickets não coincidem, ticket fraco, etc.)',
  })
  @ApiResponse({
    status: 401,
    description: 'Não autorizado (token inválido ou ticket atual incorreto)',
  })
  @ApiResponse({
    status: 429,
    description: 'Muitas tentativas - tente novamente em alguns minutos',
  })
  async changeTicket(
    @Body() changeTicketDto: ChangeTicketDto,
    @CurrentUser() user: any,
    @Request() req: any,
  ): Promise<ChangeTicketResponseDto> {
    // Extrair sessionId do header ou gerar um
    const sessionId =
      req.headers['x-session-id'] || req.sessionID || `session-${Date.now()}`;

    // Determinar o tipo de usuário e chamar o método apropriado
    switch (user.userType) {
      case 'corporate_user':
        return this.ticketChangeService.changeCorporateUserTicket(
          user.id,
          changeTicketDto,
          sessionId,
        );
      case 'agent':
        return this.ticketChangeService.changeAgentTicket(
          user.id,
          changeTicketDto,
          sessionId,
        );
      case 'client':
        return this.ticketChangeService.changeClientTicket(
          user.id,
          changeTicketDto,
          sessionId,
        );
      default:
        throw new Error('Tipo de usuário não suportado');
    }
  }
}



