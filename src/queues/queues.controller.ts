import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
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
import { RequireTenant } from '../auth/decorators/require-tenant.decorator';
import { TenantAuthGuard } from '../auth/guards/tenant-auth.guard';
import { CreateQueueDto } from '../common/dto/create-queue.dto';
import { TicketCleanupService } from '../tickets/ticket-cleanup.service';
import { QueuesService } from './queues.service';

@ApiTags('queues')
@Controller()
export class QueuesController {
  constructor(
    private readonly queuesService: QueuesService,
    private readonly ticketCleanupService: TicketCleanupService,
  ) {}

  @Post('tenants/:tenantId/queues')
  @UseGuards(TenantAuthGuard)
  @RequireTenant()
  @ApiBearerAuth()
  @ApiParam({
    name: 'tenantId',
    description: 'ID do tenant',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOperation({
    summary: 'Criar nova fila',
    description:
      'Cria uma nova fila de atendimento no tenant especificado. Use este endpoint quando precisar criar uma nova fila para organizar o atendimento de clientes. Requer autenticação e permissão no tenant. A fila pode ter capacidade limitada ou ilimitada, tipo específico (GENERAL, PRIORITARY, etc.) e tempo médio de atendimento configurável.',
  })
  @ApiBody({ type: CreateQueueDto })
  @ApiResponse({
    status: 201,
    description:
      'Fila criada com sucesso. Retorna os dados completos da fila criada.',
    schema: {
      type: 'object',
      example: {
        id: '123e4567-e89b-12d3-a456-426614174010',
        name: 'Atendimento Geral',
        description: 'Fila para atendimento geral de clientes',
        queueType: 'GENERAL',
        capacity: 50,
        avgServiceTime: 300,
        isActive: true,
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        currentNumber: null,
        totalWaiting: 0,
        createdAt: '2024-01-15T10:00:00.000Z',
        updatedAt: '2024-01-15T10:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description:
      'Acesso negado - usuário não pertence a este tenant ou não tem permissão.',
    schema: {
      type: 'object',
      example: {
        statusCode: 403,
        message: 'Acesso negado',
        error: 'Forbidden',
      },
    },
  })
  async create(
    @Param('tenantId') tenantId: string,
    @Body() createQueueDto: CreateQueueDto,
  ) {
    return this.queuesService.create(tenantId, createQueueDto);
  }

  @Get('tenants/:tenantId/queues')
  @UseGuards(TenantAuthGuard)
  @RequireTenant()
  @ApiBearerAuth()
  @ApiParam({
    name: 'tenantId',
    description: 'ID do tenant',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOperation({
    summary: 'Listar todas as filas do tenant',
    description:
      'Retorna lista completa de todas as filas de atendimento do tenant. Use este endpoint para obter uma visão geral de todas as filas disponíveis no sistema do tenant. Inclui informações como status atual, quantidade de pessoas aguardando, número sendo atendido e métricas básicas.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de filas com dados completos.',
    schema: {
      type: 'array',
      example: [
        {
          id: '123e4567-e89b-12d3-a456-426614174010',
          name: 'Atendimento Geral',
          description: 'Fila para atendimento geral',
          queueType: 'GENERAL',
          capacity: 50,
          isActive: true,
          currentNumber: 'A015',
          totalWaiting: 5,
          avgServiceTime: 300,
          tenantId: '123e4567-e89b-12d3-a456-426614174000',
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174011',
          name: 'Atendimento Prioritário',
          description: 'Fila para clientes prioritários',
          queueType: 'PRIORITARY',
          capacity: 20,
          isActive: true,
          currentNumber: 'P003',
          totalWaiting: 2,
          avgServiceTime: 450,
          tenantId: '123e4567-e89b-12d3-a456-426614174000',
        },
      ],
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado - usuário não pertence a este tenant.',
    schema: {
      type: 'object',
      example: {
        statusCode: 403,
        message: 'Acesso negado',
        error: 'Forbidden',
      },
    },
  })
  async findAll(@Param('tenantId') tenantId: string) {
    return this.queuesService.findAll(tenantId);
  }

  @Get('tenants/:tenantId/queues/:id')
  @UseGuards(TenantAuthGuard)
  @RequireTenant()
  @ApiBearerAuth()
  @ApiParam({
    name: 'tenantId',
    description: 'ID do tenant',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'id',
    description: 'ID da fila',
    example: '123e4567-e89b-12d3-a456-426614174010',
  })
  @ApiOperation({
    summary: 'Buscar fila por ID',
    description:
      'Retorna dados detalhados de uma fila específica, incluindo configurações, status atual, métricas em tempo real e informações dos tickets em espera. Use este endpoint quando precisar visualizar informações detalhadas de uma fila específica.',
  })
  @ApiResponse({
    status: 200,
    description: 'Dados completos da fila.',
    schema: {
      type: 'object',
      example: {
        id: '123e4567-e89b-12d3-a456-426614174010',
        name: 'Atendimento Geral',
        description: 'Fila para atendimento geral de clientes',
        queueType: 'GENERAL',
        capacity: 50,
        avgServiceTime: 300,
        isActive: true,
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        currentNumber: 'A015',
        totalWaiting: 5,
        toleranceMinutes: 15,
        createdAt: '2024-01-15T10:00:00.000Z',
        updatedAt: '2024-01-15T14:30:00.000Z',
        tenant: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Empresa ABC',
          slug: 'empresa-abc',
        },
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
  @ApiResponse({
    status: 403,
    description: 'Acesso negado - usuário não pertence a este tenant.',
    schema: {
      type: 'object',
      example: {
        statusCode: 403,
        message: 'Acesso negado',
        error: 'Forbidden',
      },
    },
  })
  async findOne(@Param('tenantId') tenantId: string, @Param('id') id: string) {
    return this.queuesService.findOne(tenantId, id);
  }

  @Get('queues/:id/qrcode')
  @ApiParam({
    name: 'id',
    description: 'ID da fila',
    example: '123e4567-e89b-12d3-a456-426614174010',
  })
  @ApiOperation({
    summary: 'Gerar QR Code para a fila',
    description:
      'Gera um QR Code que permite aos clientes acessarem diretamente a fila para tirar senha. Este endpoint é público e não requer autenticação. Use este endpoint quando precisar gerar um QR Code para impressão e disponibilização física no estabelecimento, permitindo que clientes escaneiem e entrem diretamente na fila.',
  })
  @ApiResponse({
    status: 200,
    description:
      'QR Code da fila gerado com sucesso. Retorna o QR Code em base64 e a URL da fila.',
    schema: {
      type: 'object',
      example: {
        qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
        url: 'https://app.fila-digital.com/queues/123e4567-e89b-12d3-a456-426614174010',
        queueId: '123e4567-e89b-12d3-a456-426614174010',
        queueName: 'Atendimento Geral',
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
  async generateQRCode(@Param('id') id: string) {
    return this.queuesService.generateQRCode(id);
  }

  @Put('tenants/:tenantId/queues/:id')
  @UseGuards(TenantAuthGuard)
  @RequireTenant()
  @ApiBearerAuth()
  @ApiParam({
    name: 'tenantId',
    description: 'ID do tenant',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'id',
    description: 'ID da fila',
    example: '123e4567-e89b-12d3-a456-426614174010',
  })
  @ApiOperation({
    summary: 'Atualizar fila',
    description:
      'Atualiza os dados de uma fila existente. Permite modificar nome, descrição, tipo, capacidade, tempo médio de atendimento e status ativo. Use este endpoint quando precisar ajustar as configurações de uma fila em funcionamento ou pausar/ativar uma fila.',
  })
  @ApiBody({ type: CreateQueueDto })
  @ApiResponse({
    status: 200,
    description:
      'Fila atualizada com sucesso. Retorna os dados atualizados da fila.',
    schema: {
      type: 'object',
      example: {
        id: '123e4567-e89b-12d3-a456-426614174010',
        name: 'Atendimento Geral Atualizado',
        description: 'Nova descrição da fila',
        queueType: 'GENERAL',
        capacity: 60,
        avgServiceTime: 350,
        isActive: true,
        updatedAt: '2024-01-15T15:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description:
      'Acesso negado - usuário não pertence a este tenant ou não tem permissão.',
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
  async update(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() updateQueueDto: CreateQueueDto,
  ) {
    return this.queuesService.update(tenantId, id, updateQueueDto);
  }

  @Delete('tenants/:tenantId/queues/:id')
  @UseGuards(TenantAuthGuard)
  @RequireTenant()
  @ApiBearerAuth()
  @ApiParam({
    name: 'tenantId',
    description: 'ID do tenant',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'id',
    description: 'ID da fila',
    example: '123e4567-e89b-12d3-a456-426614174010',
  })
  @ApiOperation({
    summary: 'Desativar fila',
    description:
      'Desativa uma fila, marcando-a como inativa. Uma fila desativada não aceita novos tickets. Use este endpoint quando uma fila não for mais necessária ou precisar ser temporariamente desabilitada. Os tickets existentes na fila não são removidos.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Fila desativada com sucesso. Retorna os dados atualizados da fila.',
    schema: {
      type: 'object',
      example: {
        id: '123e4567-e89b-12d3-a456-426614174010',
        name: 'Atendimento Geral',
        isActive: false,
        updatedAt: '2024-01-15T16:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description:
      'Acesso negado - usuário não pertence a este tenant ou não tem permissão.',
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
  async remove(@Param('tenantId') tenantId: string, @Param('id') id: string) {
    return this.queuesService.remove(tenantId, id);
  }

  @Post('tenants/:tenantId/queues/:id/call-next')
  @UseGuards(TenantAuthGuard)
  @RequireTenant()
  @ApiBearerAuth()
  @ApiParam({
    name: 'tenantId',
    description: 'ID do tenant',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'id',
    description: 'ID da fila',
    example: '123e4567-e89b-12d3-a456-426614174010',
  })
  @ApiOperation({
    summary: 'Chamar próximo ticket da fila',
    description:
      'Chama o próximo ticket (cliente) na fila de atendimento. O ticket mais antigo com status WAITING será marcado como CALLED e retornado. Use este endpoint quando um atendente estiver pronto para atender o próximo cliente na fila. Notificações podem ser enviadas ao cliente via SMS/Telegram quando configurado.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Próximo ticket chamado com sucesso. Retorna os dados do ticket chamado e status atualizado da fila.',
    schema: {
      type: 'object',
      example: {
        ticket: {
          id: '123e4567-e89b-12d3-a456-426614174020',
          myCallingToken: 'A016',
          status: 'CALLED',
          position: 0,
          priority: 1,
          calledAt: '2024-01-15T16:30:00.000Z',
          queueId: '123e4567-e89b-12d3-a456-426614174010',
        },
        queueStatus: {
          id: '123e4567-e89b-12d3-a456-426614174010',
          currentNumber: 'A016',
          totalWaiting: 4,
          avgServiceTime: 300,
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description:
      'Fila não encontrada ou não há tickets na fila aguardando atendimento.',
    schema: {
      type: 'object',
      example: {
        statusCode: 404,
        message: 'Não há tickets na fila aguardando atendimento',
        error: 'Not Found',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description:
      'Acesso negado - usuário não pertence a este tenant ou não tem permissão.',
    schema: {
      type: 'object',
      example: {
        statusCode: 403,
        message: 'Acesso negado',
        error: 'Forbidden',
      },
    },
  })
  async callNext(@Param('tenantId') tenantId: string, @Param('id') id: string) {
    return this.queuesService.callNext(tenantId, id);
  }

  @Post('tenants/:tenantId/queues/:id/recall')
  @UseGuards(TenantAuthGuard)
  @RequireTenant()
  @ApiBearerAuth()
  @ApiParam({
    name: 'tenantId',
    description: 'ID do tenant',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'id',
    description: 'ID da fila',
    example: '123e4567-e89b-12d3-a456-426614174010',
  })
  @ApiOperation({
    summary: 'Rechamar último ticket da fila',
    description:
      'Rechama o último ticket que foi chamado na fila. Use este endpoint quando um cliente não compareceu quando foi chamado e o atendente precisa rechamá-lo. O ticket volta para o status CALLED e pode ser chamado novamente.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Ticket rechamado com sucesso. Retorna os dados do ticket rechamado.',
    schema: {
      type: 'object',
      example: {
        ticket: {
          id: '123e4567-e89b-12d3-a456-426614174020',
          myCallingToken: 'A016',
          status: 'CALLED',
          calledAt: '2024-01-15T16:35:00.000Z',
        },
        message: 'Ticket A016 rechamado com sucesso',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description:
      'Fila não encontrada ou nenhum ticket foi chamado anteriormente.',
    schema: {
      type: 'object',
      example: {
        statusCode: 404,
        message: 'Nenhum ticket para rechamar',
        error: 'Not Found',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description:
      'Acesso negado - usuário não pertence a este tenant ou não tem permissão.',
    schema: {
      type: 'object',
      example: {
        statusCode: 403,
        message: 'Acesso negado',
        error: 'Forbidden',
      },
    },
  })
  async recall(@Param('tenantId') tenantId: string, @Param('id') id: string) {
    return this.queuesService.recall(tenantId, id);
  }

  // Endpoint de limpeza removido - expiração de tickets desabilitada
  // @Post('tenants/:tenantId/queues/:queueId/cleanup')

  @Get('tenants/:tenantId/queues/:queueId/abandonment-stats')
  @UseGuards(TenantAuthGuard)
  @RequireTenant()
  @ApiBearerAuth()
  @ApiParam({
    name: 'tenantId',
    description: 'ID do tenant',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'queueId',
    description: 'ID da fila',
    example: '123e4567-e89b-12d3-a456-426614174010',
  })
  @ApiOperation({
    summary: 'Estatísticas de abandono da fila',
    description:
      'Retorna estatísticas de tickets abandonados (cliente não compareceu quando chamado) nos últimos dias. Use este endpoint para analisar a taxa de abandono da fila e entender quantos clientes não comparecem quando são chamados. Útil para ajustes operacionais e melhorias no atendimento.',
  })
  @ApiResponse({
    status: 200,
    description: 'Estatísticas de abandono retornadas com sucesso.',
    schema: {
      type: 'object',
      example: {
        totalTickets: 150,
        noShowTickets: 15,
        abandonmentRate: 10.0,
        period: 'Últimos 7 dias',
        queueId: '123e4567-e89b-12d3-a456-426614174010',
        queueName: 'Atendimento Geral',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado - usuário não pertence a este tenant.',
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
  async getAbandonmentStats(
    @Param('tenantId') tenantId: string,
    @Param('queueId') queueId: string,
  ) {
    return this.ticketCleanupService.getAbandonmentStats(queueId);
  }

  @Get('tenants/:tenantId/queues/:queueId/stats')
  @UseGuards(TenantAuthGuard)
  @RequireTenant()
  @ApiBearerAuth()
  @ApiParam({
    name: 'tenantId',
    description: 'ID do tenant',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'queueId',
    description: 'ID da fila',
    example: '123e4567-e89b-12d3-a456-426614174010',
  })
  @ApiOperation({
    summary: 'Estatísticas detalhadas da fila',
    description:
      'Retorna estatísticas completas e consolidadas de uma fila específica, incluindo informações da fila (capacidade, tolerância), estatísticas atuais (quantidade aguardando, chamados, completados hoje), performance (tempo médio de espera, taxa de abandono) e estimativas (tempo para próximo atendimento, taxa de conclusão). Use este endpoint para dashboards, relatórios gerenciais e análises de performance da fila.',
  })
  @ApiResponse({
    status: 200,
    description: 'Estatísticas completas da fila retornadas com sucesso.',
    schema: {
      type: 'object',
      example: {
        queueInfo: {
          id: '123e4567-e89b-12d3-a456-426614174010',
          name: 'Atendimento Geral',
          description: 'Fila para atendimento geral de clientes',
          capacity: 50,
          toleranceMinutes: 15,
          avgServiceTime: 300,
          status: 'ativa',
        },
        currentStats: {
          waitingCount: 5,
          calledCount: 2,
          completedToday: 45,
          nextEstimatedTime: 25,
          completionRate: 90.0,
        },
        performance: {
          avgWaitTime: 1200,
          totalProcessedToday: 52,
          abandonmentRate: 5.5,
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado - usuário não pertence a este tenant.',
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
  async getQueueStats(
    @Param('tenantId') tenantId: string,
    @Param('queueId') queueId: string,
  ) {
    return this.queuesService.getQueueDetailedStats(tenantId, queueId);
  }
}
