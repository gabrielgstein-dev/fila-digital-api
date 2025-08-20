import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from '../common/dto/create-ticket.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('tickets')
@Controller()
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post('queues/:queueId/tickets')
  @ApiOperation({ summary: 'Criar novo ticket (tirar senha)' })
  @ApiResponse({ status: 201, description: 'Ticket criado com sucesso' })
  async create(
    @Param('queueId') queueId: string,
    @Body() createTicketDto: CreateTicketDto,
  ) {
    return this.ticketsService.create(queueId, createTicketDto);
  }

  @Get('tickets/:id')
  @ApiOperation({ summary: 'Buscar ticket por ID' })
  @ApiResponse({ status: 200, description: 'Dados do ticket' })
  async findOne(@Param('id') id: string) {
    return this.ticketsService.findOne(id);
  }

  @Put('tickets/:id/recall')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Rechamar ticket' })
  @ApiResponse({ status: 200, description: 'Ticket rechamado' })
  async recall(@Param('id') id: string) {
    return this.ticketsService.recall(id);
  }

  @Put('tickets/:id/skip')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Pular ticket' })
  @ApiResponse({ status: 200, description: 'Ticket pulado' })
  async skip(@Param('id') id: string) {
    return this.ticketsService.skip(id);
  }

  @Put('tickets/:id/complete')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Completar atendimento' })
  @ApiResponse({ status: 200, description: 'Atendimento completado' })
  async complete(@Param('id') id: string) {
    return this.ticketsService.complete(id);
  }
}
