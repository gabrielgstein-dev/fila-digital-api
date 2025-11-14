import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  Response,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { QueueReportsService } from './queue-reports.service';
import { Response as ExpressResponse } from 'express';

@Controller('api/v1/queues/:queueId/reports')
@UseGuards(JwtAuthGuard)
export class QueueReportsController {
  constructor(private readonly reportsService: QueueReportsService) {}

  /**
   * GET /api/v1/queues/:queueId/reports/history
   * Obter histórico de chamadas da fila
   */
  @Get('history')
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

  /**
   * GET /api/v1/queues/:queueId/reports/statistics
   * Obter estatísticas consolidadas da fila
   */
  @Get('statistics')
  async getStatistics(
    @Param('queueId') queueId: string,
    @Query('days', new DefaultValuePipe(7), ParseIntPipe) days?: number,
  ) {
    return this.reportsService.getQueueStatistics(queueId, days);
  }

  /**
   * GET /api/v1/queues/:queueId/reports/avg-service-time
   * Obter tempo médio de atendimento
   */
  @Get('avg-service-time')
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

  /**
   * GET /api/v1/queues/:queueId/reports/avg-call-interval
   * Obter tempo médio entre chamadas
   */
  @Get('avg-call-interval')
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

  /**
   * GET /api/v1/queues/:queueId/reports/avg-wait-time
   * Obter tempo médio de espera
   */
  @Get('avg-wait-time')
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

  /**
   * GET /api/v1/queues/:queueId/reports/slowest-tickets
   * Obter tickets mais demorados
   */
  @Get('slowest-tickets')
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

  /**
   * GET /api/v1/queues/:queueId/reports/export
   * Exportar histórico para CSV
   */
  @Get('export')
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


