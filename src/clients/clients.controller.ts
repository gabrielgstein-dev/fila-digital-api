import {
  BadRequestException,
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentClient } from '../auth/decorators/current-client.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { TenantAuthGuard } from '../auth/guards/tenant-auth.guard';
import { ClientsService } from './clients.service';

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
      'Retorna todas as senhas (tickets) ativas de um cliente. Se o cliente estiver logado com Google, busca automaticamente usando os dados da sessão. Caso contrário, é necessário informar telefone ou email como query parameter. Use este endpoint para permitir que clientes visualizem todas suas senhas em diferentes filas/estabelecimentos.',
  })
  @ApiQuery({
    name: 'phone',
    required: false,
    description: 'Telefone do cliente (formato: (11) 99999-1111)',
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
    description:
      'Lista de todas as senhas ativas do cliente retornada com sucesso. Retorna informações do cliente e array de tickets ativos.',
    schema: {
      type: 'object',
      example: {
        client: {
          identifier: '+5511999998888',
          totalActiveTickets: 2,
        },
        tickets: [
          {
            id: '123e4567-e89b-12d3-a456-426614174020',
            myCallingToken: 'A016',
            status: 'WAITING',
            priority: 1,
            position: 5,
            estimatedTime: 25,
            createdAt: '2024-01-15T16:30:00.000Z',
            calledAt: null,
            queue: {
              id: '123e4567-e89b-12d3-a456-426614174010',
              name: 'Atendimento Geral',
              queueType: 'GENERAL',
              currentNumber: 'A011',
              avgServiceTime: 300,
              tenant: {
                name: 'Empresa ABC',
                slug: 'empresa-abc',
              },
            },
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'É necessário informar telefone ou email, ou fazer login com Google.',
    schema: {
      type: 'object',
      example: {
        statusCode: 400,
        message:
          'É necessário informar telefone ou email, ou fazer login com Google',
        error: 'Bad Request',
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
      'Retorna dashboard consolidado com todas as senhas do cliente e métricas em tempo real. Inclui resumo de todas as filas, estatísticas consolidadas e métricas de velocidade de atendimento. Se logado com Google, busca automaticamente. Use este endpoint para criar um dashboard pessoal do cliente mostrando todas suas senhas em diferentes estabelecimentos.',
  })
  @ApiQuery({
    name: 'phone',
    required: false,
    description: 'Telefone do cliente (formato: (11) 99999-1111)',
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
    description:
      'Dashboard consolidado do cliente retornado com sucesso. Retorna informações completas do cliente, resumo estatístico, tickets agrupados por estabelecimento e métricas em tempo real.',
    schema: {
      type: 'object',
      example: {
        client: {
          identifier: '+5511999998888',
          totalActiveTickets: 2,
        },
        summary: {
          totalWaiting: 2,
          totalCalled: 0,
          avgWaitTime: 1200,
          nextCallEstimate: 1800,
          establishmentsCount: 2,
        },
        tickets: [
          {
            queueId: '123e4567-e89b-12d3-a456-426614174010',
            queueName: 'Atendimento Geral',
            tickets: [
              {
                id: '123e4567-e89b-12d3-a456-426614174020',
                myCallingToken: 'A016',
                position: 5,
                estimatedTime: 25,
              },
            ],
          },
        ],
        realTimeMetrics: {
          currentServiceSpeed: 12,
          timeSinceLastCall: 180,
          trendDirection: 'stable',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'É necessário informar telefone ou email, ou fazer login com Google.',
    schema: {
      type: 'object',
      example: {
        statusCode: 400,
        message:
          'É necessário informar telefone ou email, ou fazer login com Google',
        error: 'Bad Request',
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
    description:
      'Retorna dados completos do cliente autenticado via Google. Use este endpoint quando o cliente estiver logado para obter suas informações de perfil, incluindo ID, email, nome, foto e telefone.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Dados do cliente retornados com sucesso. Retorna objeto com informações completas do perfil do cliente.',
    schema: {
      type: 'object',
      example: {
        id: '123e4567-e89b-12d3-a456-426614174003',
        email: 'cliente@gmail.com',
        name: 'João Silva',
        picture: 'https://lh3.googleusercontent.com/a/default-user',
        phone: '+5511999998888',
        userType: 'client',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Apenas clientes autenticados podem acessar este endpoint.',
    schema: {
      type: 'object',
      example: {
        statusCode: 400,
        message: 'Apenas clientes autenticados podem acessar',
        error: 'Bad Request',
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
