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
    summary: 'Criar novo ticket (tirar senha)',
    description:
      'Endpoint público que permite aos clientes tirarem uma senha na fila especificada',
  })
  @ApiResponse({
    status: 201,
    description: 'Ticket criado com sucesso',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID único do ticket' },
        myCallingToken: {
          type: 'string',
          description: 'Número da senha (ex: A001)',
        },
        position: { type: 'number', description: 'Posição na fila' },
        estimatedTime: {
          type: 'number',
          description: 'Tempo estimado em minutos',
        },
        queueName: { type: 'string', description: 'Nome da fila' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Fila cheia, inativa ou dados inválidos',
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
  @ApiOperation({
    summary: 'Buscar ticket por ID',
    description:
      'Endpoint público para consultar status e dados de um ticket específico',
  })
  @ApiResponse({
    status: 200,
    description: 'Dados completos do ticket',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID do ticket' },
        myCallingToken: { type: 'string', description: 'Número da senha' },
        status: {
          type: 'string',
          description: 'Status do ticket (WAITING, CALLED, COMPLETED, etc.)',
        },
        position: { type: 'number', description: 'Posição atual na fila' },
        estimatedTime: {
          type: 'number',
          description: 'Tempo estimado para atendimento',
        },
        queue: { type: 'object', description: 'Dados da fila' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Ticket não encontrado' })
  async findOne(@Param('id') id: string) {
    return this.ticketsService.findOne(id);
  }

  @Get('queues/:queueId/status')
  @Public()
  @ApiOperation({
    summary: 'Status da fila para clientes',
    description:
      'Endpoint público que retorna informações em tempo real sobre a fila',
  })
  @ApiResponse({
    status: 200,
    description: 'Status completo da fila',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID da fila' },
        name: { type: 'string', description: 'Nome da fila' },
        currentNumber: {
          type: 'string',
          description: 'Número sendo atendido atualmente',
        },
        totalWaiting: {
          type: 'number',
          description: 'Total de pessoas na fila',
        },
        avgServiceTime: {
          type: 'number',
          description: 'Tempo médio de atendimento em segundos',
        },
        isActive: { type: 'boolean', description: 'Se a fila está ativa' },
        capacity: { type: 'number', description: 'Capacidade máxima da fila' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Fila não encontrada' })
  async getQueueStatus(@Param('queueId') queueId: string) {
    return this.ticketsService.getQueueStatus(queueId);
  }

  @Put('tickets/:id/recall')
  @UseGuards(TenantAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Rechamar ticket',
    description:
      'Permite que agentes rechamem um ticket que já foi chamado anteriormente',
  })
  @ApiResponse({
    status: 200,
    description: 'Ticket rechamado com sucesso',
    schema: {
      type: 'object',
      properties: {
        ticket: { type: 'object', description: 'Dados do ticket rechamado' },
        message: { type: 'string', description: 'Mensagem de confirmação' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Ticket não encontrado' })
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
  @ApiOperation({
    summary: 'Pular ticket',
    description:
      'Permite que agentes pulem um ticket na fila (cliente não compareceu)',
  })
  @ApiResponse({
    status: 200,
    description: 'Ticket pulado com sucesso',
    schema: {
      type: 'object',
      properties: {
        ticket: { type: 'object', description: 'Dados do ticket pulado' },
        nextTicket: { type: 'object', description: 'Próximo ticket na fila' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Ticket não encontrado' })
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
  @ApiOperation({
    summary: 'Completar atendimento',
    description:
      'Marca um ticket como completado após o atendimento do cliente',
  })
  @ApiResponse({
    status: 200,
    description: 'Atendimento completado com sucesso',
    schema: {
      type: 'object',
      properties: {
        ticket: { type: 'object', description: 'Dados do ticket completado' },
        serviceTime: {
          type: 'number',
          description: 'Tempo total de atendimento em segundos',
        },
        queueMetrics: {
          type: 'object',
          description: 'Métricas atualizadas da fila',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Ticket não encontrado' })
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
    summary: 'Atualizar token de chamada atual',
    description:
      'Permite que agentes atualizem o número da senha sendo chamada no momento',
  })
  @ApiResponse({
    status: 200,
    description: 'Token de chamada atualizado com sucesso',
    schema: {
      type: 'object',
      properties: {
        ticket: { type: 'object', description: 'Dados do ticket atualizado' },
        currentCallingToken: {
          type: 'string',
          description: 'Novo token de chamada',
        },
      },
    },
  })
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
