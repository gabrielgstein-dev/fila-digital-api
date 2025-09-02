import {
  Controller,
  Get,
  Query,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ClientsService } from './clients.service';
import { CurrentClient } from '../auth/decorators/current-client.decorator';
import { TenantAuthGuard } from '../auth/guards/tenant-auth.guard';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('clients')
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get('my-tickets')
  @UseGuards(TenantAuthGuard)
  @Public()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Buscar todas as senhas ativas de um cliente',
    description:
      'Permite ao cliente ver todas suas senhas. Se logado com Google, busca automaticamente. Se não, usar telefone/email',
  })
  @ApiQuery({
    name: 'phone',
    required: false,
    description: 'Telefone do cliente',
    example: '(11) 99999-1111',
  })
  @ApiQuery({
    name: 'email',
    required: false,
    description: 'Email do cliente',
    example: 'cliente@email.com',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de todas as senhas ativas do cliente',
    schema: {
      type: 'object',
      properties: {
        client: {
          type: 'object',
          properties: {
            identifier: { type: 'string' },
            totalActiveTickets: { type: 'number' },
          },
        },
        tickets: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              myCallingToken: { type: 'string' },
              status: { type: 'string' },
              priority: { type: 'number' },
              position: { type: 'number' },
              estimatedTime: { type: 'number' },
              createdAt: { type: 'string' },
              calledAt: { type: 'string' },
              queue: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  queueType: { type: 'string' },
                  currentNumber: { type: 'number' },
                  avgServiceTime: { type: 'number' },
                  tenant: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      slug: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  })
  async findMyTickets(
    @Query('phone') phone?: string,
    @Query('email') email?: string,
    @CurrentClient() client?: any,
  ) {
    if (client && client.userType === 'client') {
      return this.clientsService.findClientTickets(
        client.phone,
        client.email,
        client.id,
      );
    }

    if (!phone && !email) {
      throw new BadRequestException(
        'É necessário informar telefone ou email, ou fazer login com Google',
      );
    }

    return this.clientsService.findClientTickets(phone, email);
  }

  @Get('dashboard')
  @UseGuards(TenantAuthGuard)
  @Public()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Dashboard consolidado do cliente',
    description:
      'Visão completa das senhas do cliente com métricas em tempo real. Se logado com Google, busca automaticamente',
  })
  @ApiQuery({
    name: 'phone',
    required: false,
    description: 'Telefone do cliente',
  })
  @ApiQuery({
    name: 'email',
    required: false,
    description: 'Email do cliente',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard consolidado do cliente',
    schema: {
      type: 'object',
      properties: {
        client: {
          type: 'object',
          properties: {
            identifier: { type: 'string' },
            totalActiveTickets: { type: 'number' },
          },
        },
        summary: {
          type: 'object',
          properties: {
            totalWaiting: { type: 'number' },
            totalCalled: { type: 'number' },
            avgWaitTime: { type: 'number' },
            nextCallEstimate: { type: 'number' },
            establishmentsCount: { type: 'number' },
          },
        },
        tickets: {
          type: 'array',
          description: 'Senhas agrupadas por estabelecimento',
        },
        realTimeMetrics: {
          type: 'object',
          properties: {
            currentServiceSpeed: { type: 'number' },
            timeSinceLastCall: { type: 'number' },
            trendDirection: { type: 'string' },
          },
        },
      },
    },
  })
  async getClientDashboard(
    @Query('phone') phone?: string,
    @Query('email') email?: string,
    @CurrentClient() client?: any,
  ) {
    if (client && client.userType === 'client') {
      return this.clientsService.getClientDashboard(
        client.phone,
        client.email,
        client.id,
      );
    }

    if (!phone && !email) {
      throw new BadRequestException(
        'É necessário informar telefone ou email, ou fazer login com Google',
      );
    }

    return this.clientsService.getClientDashboard(phone, email);
  }

  @Get('queue-metrics')
  @Public()
  @ApiOperation({
    summary: 'Métricas de velocidade de atendimento em tempo real',
    description:
      'Velocidade atual, tempo desde última chamada e tendências por fila',
  })
  @ApiQuery({
    name: 'queueId',
    required: true,
    description: 'ID da fila',
  })
  @ApiResponse({
    status: 200,
    description: 'Métricas de velocidade em tempo real',
    schema: {
      type: 'object',
      properties: {
        queue: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            currentNumber: { type: 'number' },
          },
        },
        currentMetrics: {
          type: 'object',
          properties: {
            serviceSpeed: {
              type: 'number',
              description: 'Atendimentos por hora',
            },
            timeSinceLastCall: {
              type: 'number',
              description: 'Segundos desde última chamada',
            },
            avgCallInterval: {
              type: 'number',
              description: 'Intervalo médio entre chamadas',
            },
            trendDirection: {
              type: 'string',
              enum: ['accelerating', 'stable', 'slowing'],
              description: 'Tendência de velocidade',
            },
          },
        },
        predictions: {
          type: 'object',
          properties: {
            nextCallIn: {
              type: 'number',
              description: 'Próxima chamada em X segundos',
            },
            queueClearTime: {
              type: 'number',
              description: 'Tempo para limpar fila',
            },
          },
        },
      },
    },
  })
  async getQueueMetrics(@Query('queueId') queueId: string) {
    if (!queueId) {
      throw new BadRequestException('queueId é obrigatório');
    }
    return this.clientsService.getQueueRealTimeMetrics(queueId);
  }

  @Get('me')
  @UseGuards(TenantAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Informações do cliente logado',
    description: 'Retorna dados do cliente autenticado via Google',
  })
  @ApiResponse({
    status: 200,
    description: 'Dados do cliente',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        email: { type: 'string' },
        name: { type: 'string' },
        picture: { type: 'string' },
        phone: { type: 'string' },
        userType: { type: 'string' },
      },
    },
  })
  async getCurrentClient(@CurrentClient() client: any) {
    if (!client || client.userType !== 'client') {
      throw new BadRequestException(
        'Apenas clientes autenticados podem acessar',
      );
    }

    return client;
  }
}
