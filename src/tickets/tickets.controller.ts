import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentAgent } from '../auth/decorators/current-agent.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { TenantAuthGuard } from '../auth/guards/tenant-auth.guard';
import { CreateTicketDto } from '../common/dto/create-ticket.dto';
import { UpdateCurrentCallingTokenDto } from '../common/dto/update-current-calling-token.dto';
import { TicketsService } from './tickets.service';

@ApiTags('tickets')
@Controller()
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post('queues/:queueId/tickets')
  @Public()
  @ApiParam({
    name: 'queueId',
    description: 'ID da fila',
    example: '123e4567-e89b-12d3-a456-426614174010',
  })
  @ApiOperation({
    summary: 'Criar novo ticket (tirar senha)',
    description:
      'Endpoint público que permite aos clientes tirarem uma senha na fila especificada. Este é o endpoint principal usado pelos clientes para entrar na fila. Use este endpoint quando um cliente quiser pegar uma senha na fila. O ticket é criado com posição na fila e tempo estimado de atendimento calculado automaticamente.',
  })
  @ApiBody({ type: CreateTicketDto })
  @ApiResponse({
    status: 201,
    description:
      'Ticket criado com sucesso. Retorna os dados do ticket criado incluindo número da senha, posição na fila e tempo estimado.',
    schema: {
      type: 'object',
      example: {
        id: '123e4567-e89b-12d3-a456-426614174020',
        myCallingToken: 'A016',
        position: 5,
        estimatedTime: 25,
        queueName: 'Atendimento Geral',
        createdAt: '2024-01-15T16:30:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Fila cheia, inativa ou dados inválidos.',
    schema: {
      type: 'object',
      example: {
        statusCode: 400,
        message: 'Fila cheia ou inativa',
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Fila não encontrada.',
    schema: {
      type: 'object',
      example: {
        statusCode: 404,
        message: 'Fila não encontrada',
        error: 'Not Found',
      },
    },
  })
  async create(
    @Param('queueId') queueId: string,
    @Body() createTicketDto: CreateTicketDto,
  ) {
    const userId = null;
    return this.ticketsService.create(queueId, createTicketDto, userId);
  }

  @Get('queues/:queueId/join-telegram')
  @Public()
  @ApiOperation({
    summary: 'Entrar na fila via Telegram (QR Code)',
    description:
      'Endpoint público que cria ticket automaticamente quando acessado via QR Code do Telegram. Requer chatId como query parameter.',
  })
  @ApiResponse({
    status: 200,
    description: 'Ticket criado com sucesso - redireciona para Telegram',
  })
  @ApiResponse({
    status: 400,
    description: 'Fila cheia, inativa ou chatId não fornecido',
  })
  @ApiResponse({
    status: 404,
    description: 'Fila não encontrada',
  })
  async joinViaTelegram(
    @Param('queueId') queueId: string,
    @Query('chatId') chatId?: string,
  ) {
    if (!chatId) {
      throw new BadRequestException(
        'chatId é obrigatório. Use o link do Telegram para acessar este endpoint.',
      );
    }

    const createTicketDto: CreateTicketDto = {
      telegramChatId: chatId,
    };

    const ticket = await this.ticketsService.create(
      queueId,
      createTicketDto,
      undefined,
    );

    const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'seu_bot';
    const telegramUrl = `https://t.me/${botUsername}?start=ticket_${ticket.id}`;

    return {
      success: true,
      message: 'Ticket criado com sucesso!',
      ticket: {
        id: ticket.id,
        myCallingToken: ticket.myCallingToken,
        position: (ticket as { position?: number }).position,
        estimatedTime: ticket.estimatedTime,
      },
      telegramUrl,
      redirect: telegramUrl,
    };
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

  @Get('tickets/:id/status')
  @Public()
  @ApiOperation({
    summary: 'Consultar status detalhado da senha com tempo estimado',
    description:
      'Endpoint público para consultar status da senha, posição na fila e tempo estimado para ser chamado. Usa tempo médio real dos últimos atendimentos.',
  })
  @ApiResponse({
    status: 200,
    description: 'Status detalhado da senha com tempo estimado',
    schema: {
      type: 'object',
      properties: {
        ticket: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            myCallingToken: { type: 'string' },
            status: { type: 'string' },
            priority: { type: 'number' },
            createdAt: { type: 'string' },
            calledAt: { type: 'string', nullable: true },
            completedAt: { type: 'string', nullable: true },
          },
        },
        queue: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            queueType: { type: 'string' },
          },
        },
        position: {
          type: 'number',
          description: 'Posição na fila (0 se já foi chamado)',
        },
        avgServiceTimeReal: {
          type: 'number',
          nullable: true,
          description:
            'Tempo médio real de atendimento calculado com base nas últimas chamadas (em segundos). Null se não houver dados históricos.',
        },
        avgServiceTimeRealMinutes: {
          type: 'number',
          nullable: true,
          description: 'Tempo médio real de atendimento em minutos',
        },
        estimatedTimeToCall: {
          type: 'number',
          description:
            'Tempo estimado em segundos para ser chamado. Calculado usando tempo médio real dos últimos atendimentos.',
        },
        estimatedTimeToCallMinutes: {
          type: 'number',
          description:
            'Tempo estimado em minutos para ser chamado. Calculado usando tempo médio real dos últimos atendimentos.',
        },
        currentTicket: {
          type: 'string',
          nullable: true,
          description: 'Senha sendo atendida no momento',
        },
        isBeingServed: { type: 'boolean' },
        isWaiting: { type: 'boolean' },
        isCompleted: { type: 'boolean' },
        lastUpdated: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Ticket não encontrado' })
  async getTicketStatus(@Param('id') id: string) {
    return this.ticketsService.getTicketStatusWithEstimate(id);
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
  @ApiParam({
    name: 'id',
    description: 'ID do ticket',
    example: '123e4567-e89b-12d3-a456-426614174020',
  })
  @ApiOperation({
    summary: 'Atualizar token de chamada atual',
    description:
      'Permite que agentes atualizem manualmente o número da senha sendo chamada no momento. Use este endpoint quando um atendente precisar atualizar manualmente qual senha está sendo chamada, por exemplo, quando usar um sistema de chamada externo ou quando precisar corrigir o número atual na fila.',
  })
  @ApiBody({ type: UpdateCurrentCallingTokenDto })
  @ApiResponse({
    status: 200,
    description:
      'Token de chamada atualizado com sucesso. Retorna os dados do ticket atualizado.',
    schema: {
      type: 'object',
      example: {
        ticket: {
          id: '123e4567-e89b-12d3-a456-426614174020',
          myCallingToken: 'A016',
          status: 'CALLED',
          currentCallingToken: 'A016',
        },
        currentCallingToken: 'A016',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado: usuário não pertence ao tenant do ticket.',
    schema: {
      type: 'object',
      example: {
        statusCode: 403,
        message: 'Acesso negado',
        error: 'Forbidden',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Ticket não encontrado.',
    schema: {
      type: 'object',
      example: {
        statusCode: 404,
        message: 'Ticket não encontrado',
        error: 'Not Found',
      },
    },
  })
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
