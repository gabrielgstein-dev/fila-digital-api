import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { TicketsService } from './tickets.service';
import { PublicTicketStatusDto } from './dto/public-ticket-status.dto';

@ApiTags('tickets-public')
@Controller('tickets/public')
export class TicketsPublicController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get(':guestToken')
  @Public()
  @ApiParam({
    name: 'guestToken',
    description: 'Token público seguro do ticket',
    example: 'a4b1c2d3-e4f5-6789-0123-456789abcdef',
  })
  @ApiOperation({
    summary: 'Consultar status público de um ticket',
    description:
      'Endpoint público que retorna apenas informações não sensíveis do ticket para acompanhamento pelo cliente final.',
  })
  @ApiResponse({
    status: 200,
    description: 'Status público do ticket retornado com sucesso',
    type: PublicTicketStatusDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Ticket não encontrado ou expirado',
  })
  async getPublicStatus(
    @Param('guestToken') guestToken: string,
  ): Promise<PublicTicketStatusDto> {
    try {
      return await this.ticketsService.getPublicTicketStatusByGuestToken(
        guestToken,
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException('Ticket não encontrado ou expirado');
    }
  }
}
