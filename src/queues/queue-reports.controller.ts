import {
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Query,
  Response,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Response as ExpressResponse } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { QueueReportsService } from './queue-reports.service';

@ApiTags('reports')
@Controller('api/v1/queues/:queueId/reports')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class QueueReportsController {
  constructor(private readonly reportsService: QueueReportsService) {}

  @Get('history')
  @ApiParam({
    name: 'queueId',
    description: 'ID da fila',
    example: '123e4567-e89b-12d3-a456-426614174010',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Data de início (ISO 8601)',
    example: '2024-01-01T00:00:00Z',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'Data de fim (ISO 8601)',
    example: '2024-01-31T23:59:59Z',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Limite de registros por página',
    example: 100,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    description: 'Offset para paginação',
    example: 0,
  })
  @ApiOperation({
    summary: 'Obter histórico de chamadas da fila',
    description:
      'Retorna o histórico completo de tickets chamados na fila dentro de um período específico. Use este endpoint para gerar relatórios de atendimento, análise de performance, auditoria e visualização de dados históricos. Permite filtrar por período e paginar os resultados.',
  })
  @ApiResponse({
    status: 200,
    description: 'Histórico de chamadas retornado com sucesso.',
    schema: {
      type: 'object',
      example: {
        queueId: '123e4567-e89b-12d3-a456-426614174010',
        total: 250,
        limit: 100,
        offset: 0,
        data: [
          {
            id: '123e4567-e89b-12d3-a456-426614174020',
            myCallingToken: 'A001',
            status: 'COMPLETED',
            priority: 1,
            createdAt: '2024-01-15T08:00:00.000Z',
            calledAt: '2024-01-15T08:05:00.000Z',
            completedAt: '2024-01-15T08:10:00.000Z',
            waitTimeSeconds: 300,
            serviceTimeSeconds: 300,
          },
        ],
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
  async getHistory(
    @Param('queueId') queueId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit?: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset?: number,
  ) {
    return this.reportsService.getQueueHistory(queueId, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit,
      offset,
    });
  }

  @Get('statistics')
  @ApiParam({
    name: 'queueId',
    description: 'ID da fila',
    example: '123e4567-e89b-12d3-a456-426614174010',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    description: 'Número de dias para análise (padrão: 7)',
    example: 7,
  })
  @ApiOperation({
    summary: 'Obter estatísticas consolidadas da fila',
    description:
      'Retorna estatísticas consolidadas e agregadas da fila em um período específico. Inclui totais, médias, taxas de conclusão e abandono. Use este endpoint para dashboards gerenciais, relatórios executivos e análises de performance da fila em períodos específicos.',
  })
  @ApiResponse({
    status: 200,
    description: 'Estatísticas consolidadas retornadas com sucesso.',
    schema: {
      type: 'object',
      example: {
        queueId: '123e4567-e89b-12d3-a456-426614174010',
        period: {
          startDate: '2024-01-08T00:00:00.000Z',
          endDate: '2024-01-15T23:59:59.999Z',
          days: 7,
        },
        totals: {
          ticketsCreated: 350,
          ticketsCalled: 320,
          ticketsCompleted: 300,
          ticketsAbandoned: 20,
        },
        averages: {
          waitTimeSeconds: 1200,
          serviceTimeSeconds: 300,
          callIntervalSeconds: 180,
        },
        rates: {
          completionRate: 93.75,
          abandonmentRate: 6.25,
          callRate: 91.43,
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
  async getStatistics(
    @Param('queueId') queueId: string,
    @Query('days', new DefaultValuePipe(7), ParseIntPipe) days?: number,
  ) {
    return this.reportsService.getQueueStatistics(queueId, days);
  }

  @Get('avg-service-time')
  @ApiParam({
    name: 'queueId',
    description: 'ID da fila',
    example: '123e4567-e89b-12d3-a456-426614174010',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    description: 'Número de dias para análise (padrão: 7)',
    example: 7,
  })
  @ApiOperation({
    summary: 'Obter tempo médio de atendimento',
    description:
      'Calcula e retorna o tempo médio de atendimento (service time) dos tickets completados em um período específico. O tempo de atendimento é calculado desde quando o ticket foi chamado até ser completado. Use este endpoint para entender a eficiência do atendimento e fazer estimativas mais precisas para clientes.',
  })
  @ApiResponse({
    status: 200,
    description: 'Tempo médio de atendimento calculado com sucesso.',
    schema: {
      type: 'object',
      example: {
        queueId: '123e4567-e89b-12d3-a456-426614174010',
        avgServiceTimeSeconds: 300,
        avgServiceTimeMinutes: 5.0,
        periodDays: 7,
        totalSamples: 300,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Fila não encontrada.',
  })
  async getAvgServiceTime(
    @Param('queueId') queueId: string,
    @Query('days', new DefaultValuePipe(7), ParseIntPipe) days?: number,
  ) {
    const avgTime = await this.reportsService.getAverageServiceTime(
      queueId,
      days,
    );
    return {
      queueId,
      avgServiceTimeSeconds: avgTime,
      avgServiceTimeMinutes: Math.round((avgTime / 60) * 100) / 100,
      periodDays: days,
    };
  }

  @Get('avg-call-interval')
  @ApiParam({
    name: 'queueId',
    description: 'ID da fila',
    example: '123e4567-e89b-12d3-a456-426614174010',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    description: 'Número de dias para análise (padrão: 7)',
    example: 7,
  })
  @ApiOperation({
    summary: 'Obter tempo médio entre chamadas',
    description:
      'Calcula o tempo médio decorrido entre uma chamada e a próxima chamada na fila. Use este endpoint para entender o ritmo de atendimento da fila, identificar gargalos e calcular a velocidade de processamento dos tickets.',
  })
  @ApiResponse({
    status: 200,
    description: 'Tempo médio entre chamadas calculado com sucesso.',
    schema: {
      type: 'object',
      example: {
        queueId: '123e4567-e89b-12d3-a456-426614174010',
        avgCallIntervalSeconds: 180,
        avgCallIntervalMinutes: 3.0,
        periodDays: 7,
        totalIntervals: 319,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Fila não encontrada.',
  })
  async getAvgCallInterval(
    @Param('queueId') queueId: string,
    @Query('days', new DefaultValuePipe(7), ParseIntPipe) days?: number,
  ) {
    const avgInterval = await this.reportsService.getAverageCallInterval(
      queueId,
      days,
    );
    return {
      queueId,
      avgCallIntervalSeconds: avgInterval,
      avgCallIntervalMinutes: Math.round((avgInterval / 60) * 100) / 100,
      periodDays: days,
    };
  }

  @Get('avg-wait-time')
  @ApiParam({
    name: 'queueId',
    description: 'ID da fila',
    example: '123e4567-e89b-12d3-a456-426614174010',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    description: 'Número de dias para análise (padrão: 7)',
    example: 7,
  })
  @ApiOperation({
    summary: 'Obter tempo médio de espera',
    description:
      'Calcula o tempo médio que os clientes aguardam na fila antes de serem chamados. O tempo de espera é medido desde a criação do ticket até ser chamado. Use este endpoint para avaliar a experiência do cliente, identificar necessidades de mais atendentes e melhorar a satisfação.',
  })
  @ApiResponse({
    status: 200,
    description: 'Tempo médio de espera calculado com sucesso.',
    schema: {
      type: 'object',
      example: {
        queueId: '123e4567-e89b-12d3-a456-426614174010',
        avgWaitTimeSeconds: 1200,
        avgWaitTimeMinutes: 20.0,
        periodDays: 7,
        totalSamples: 320,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Fila não encontrada.',
  })
  async getAvgWaitTime(
    @Param('queueId') queueId: string,
    @Query('days', new DefaultValuePipe(7), ParseIntPipe) days?: number,
  ) {
    const avgWait = await this.reportsService.getAverageWaitTime(queueId, days);
    return {
      queueId,
      avgWaitTimeSeconds: avgWait,
      avgWaitTimeMinutes: Math.round((avgWait / 60) * 100) / 100,
      periodDays: days,
    };
  }

  @Get('slowest-tickets')
  @ApiParam({
    name: 'queueId',
    description: 'ID da fila',
    example: '123e4567-e89b-12d3-a456-426614174010',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Número máximo de tickets a retornar (padrão: 10)',
    example: 10,
  })
  @ApiQuery({
    name: 'days',
    required: false,
    description: 'Número de dias para análise (padrão: 7)',
    example: 7,
  })
  @ApiOperation({
    summary: 'Obter tickets mais demorados',
    description:
      'Retorna a lista dos tickets que tiveram maior tempo de atendimento em um período específico. Use este endpoint para identificar casos que demandaram mais tempo, entender complexidade dos atendimentos e melhorar estimativas de tempo para casos similares.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de tickets mais demorados retornada com sucesso.',
    schema: {
      type: 'object',
      example: {
        queueId: '123e4567-e89b-12d3-a456-426614174010',
        periodDays: 7,
        tickets: [
          {
            id: '123e4567-e89b-12d3-a456-426614174021',
            myCallingToken: 'A050',
            serviceTimeSeconds: 1800,
            serviceTimeMinutes: 30.0,
            calledAt: '2024-01-15T10:00:00.000Z',
            completedAt: '2024-01-15T10:30:00.000Z',
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Fila não encontrada.',
  })
  async getSlowestTickets(
    @Param('queueId') queueId: string,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit?: number,
    @Query('days', new DefaultValuePipe(7), ParseIntPipe) days?: number,
  ) {
    const tickets = await this.reportsService.getSlowestTickets(
      queueId,
      limit,
      days,
    );
    return {
      queueId,
      tickets,
      periodDays: days,
    };
  }

  @Get('export')
  @ApiParam({
    name: 'queueId',
    description: 'ID da fila',
    example: '123e4567-e89b-12d3-a456-426614174010',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Data de início (ISO 8601)',
    example: '2024-01-01T00:00:00Z',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'Data de fim (ISO 8601)',
    example: '2024-01-31T23:59:59Z',
  })
  @ApiOperation({
    summary: 'Exportar histórico para CSV',
    description:
      'Exporta o histórico completo de tickets da fila para um arquivo CSV. O arquivo é retornado como download direto. Use este endpoint para gerar relatórios em Excel, análises externas, backup de dados e compartilhamento com equipes que precisam trabalhar com os dados em outras ferramentas.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Arquivo CSV gerado com sucesso. Retorna o arquivo CSV para download.',
    headers: {
      'Content-Type': {
        description: 'text/csv',
        schema: { type: 'string' },
      },
      'Content-Disposition': {
        description: 'attachment; filename="queue-{queueId}-history.csv"',
        schema: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Fila não encontrada.',
  })
  async exportHistory(
    @Param('queueId') queueId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Response() res?: ExpressResponse,
  ) {
    const csv = await this.reportsService.exportHistoryToCSV(
      queueId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );

    res.header('Content-Type', 'text/csv');
    res.header(
      'Content-Disposition',
      `attachment; filename="queue-${queueId}-history.csv"`,
    );
    res.send(csv);
  }
}
