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
import { UpdateCurrentCallingTokenDto } from '../common/dto/update-current-calling-token.dto';
import { TenantAuthGuard } from '../auth/guards/tenant-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentAgent } from '../auth/decorators/current-agent.decorator';

@ApiTags('tickets')
@Controller()
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post('queues/:queueId/tickets')
  @Public()
  @ApiOperation({
    summary: 'Criar novo ticket (tirar senha) - Público para clientes',
  })
  @ApiResponse({ status: 201, description: 'Ticket criado com sucesso' })
  @ApiResponse({
    status: 400,
    description: 'Fila cheia ou inativa',
  })
  @ApiResponse({
    status: 404,
    description: 'Fila não encontrada',
  })
  async create(
    @Param('queueId') queueId: string,
    @Body() createTicketDto: CreateTicketDto,
  ) {
    // Este endpoint é público para permitir que clientes criem tickets
    // sem necessidade de autenticação
    const userId = null;
    return this.ticketsService.create(queueId, createTicketDto, userId);
  }

  @Get('tickets/:id')
  @Public()
  @ApiOperation({ summary: 'Buscar ticket por ID - Público' })
  @ApiResponse({ status: 200, description: 'Dados do ticket' })
  async findOne(@Param('id') id: string) {
    return this.ticketsService.findOne(id);
  }

  @Get('queues/:queueId/status')
  @Public()
  @ApiOperation({ summary: 'Status da fila para clientes - Público' })
  @ApiResponse({ status: 200, description: 'Status da fila' })
  async getQueueStatus(@Param('queueId') queueId: string) {
    return this.ticketsService.getQueueStatus(queueId);
  }

  @Put('tickets/:id/recall')
  @UseGuards(TenantAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Rechamar ticket - Apenas agentes do tenant' })
  @ApiResponse({ status: 200, description: 'Ticket rechamado' })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado - apenas agentes podem rechamar tickets',
  })
  async recall(@Param('id') id: string) {
    return this.ticketsService.recall(id);
  }

  @Put('tickets/:id/skip')
  @UseGuards(TenantAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Pular ticket - Apenas agentes do tenant' })
  @ApiResponse({ status: 200, description: 'Ticket pulado' })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado - apenas agentes podem pular tickets',
  })
  async skip(@Param('id') id: string) {
    return this.ticketsService.skip(id);
  }

  @Put('tickets/:id/complete')
  @UseGuards(TenantAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Completar atendimento - Apenas agentes do tenant' })
  @ApiResponse({ status: 200, description: 'Atendimento completado' })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado - apenas agentes podem completar atendimentos',
  })
  async complete(
    @Param('id') id: string,
    @CurrentAgent('id') currentAgentId: string,
  ) {
    return this.ticketsService.complete(id, currentAgentId);
  }

  @Put('tickets/:id/current-calling-token')
  @UseGuards(TenantAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Atualizar token de chamada atual - Apenas agentes do tenant',
  })
  @ApiResponse({ status: 200, description: 'Token de chamada atualizado' })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado: usuário não pertence ao tenant do ticket',
  })
  @ApiResponse({ status: 404, description: 'Ticket não encontrado' })
  async updateCurrentCallingToken(
    @Param('id') id: string,
    @Body() updateCurrentCallingTokenDto: UpdateCurrentCallingTokenDto,
    @CurrentAgent('id') currentAgentId: string,
  ) {
    return this.ticketsService.updateCurrentCallingToken(
      id,
      updateCurrentCallingTokenDto.currentCallingToken,
      currentAgentId,
    );
  }
}
