import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class QueueReportsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Obter histórico completo de chamadas de uma fila
   */
  async getQueueHistory(
    queueId: string,
    options: {
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    } = {},
  ) {
    const { startDate, endDate, limit = 100, offset = 0 } = options;

    const where: any = { queueId };

    if (startDate || endDate) {
      where.calledAt = {};
      if (startDate) where.calledAt.gte = startDate;
      if (endDate) where.calledAt.lte = endDate;
    }

    const [history, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where: {
          queueId,
          calledAt: where.calledAt || undefined,
        },
        select: {
          id: true,
          myCallingToken: true,
          clientName: true,
          clientPhone: true,
          priority: true,
          calledAt: true,
          status: true,
        },
        orderBy: { calledAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.ticket.count({
        where: {
          queueId,
          calledAt: where.calledAt || undefined,
        },
      }),
    ]);

    return {
      data: history,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  }

  /**
   * Calcular tempo médio de atendimento usando queue_ticket_history
   */
  async getAverageServiceTime(
    queueId: string,
    days: number = 7,
  ): Promise<number> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const result = await this.prisma.$queryRaw<
      Array<{ avg_service_time: number | null }>
    >`
      SELECT
        AVG((metadata->>'serviceTime')::numeric)::integer as avg_service_time
      FROM queue_ticket_history
      WHERE "queueId" = ${queueId}
        AND action = 'COMPLETED'
        AND "calledAt" >= ${startDate}
        AND metadata->>'serviceTime' IS NOT NULL
        AND (metadata->>'serviceTime')::numeric > 0
    `;

    const avgServiceTime = result[0]?.avg_service_time;

    if (avgServiceTime && avgServiceTime > 0) {
      return Math.round(avgServiceTime);
    }

    const completedTickets = await this.prisma.ticket.findMany({
      where: {
        queueId,
        status: 'COMPLETED',
        completedAt: {
          gte: startDate,
        },
        calledAt: {
          not: null,
        },
      },
      select: {
        calledAt: true,
        completedAt: true,
      },
    });

    if (completedTickets.length === 0) return 0;

    const totalServiceTime = completedTickets.reduce((sum, ticket) => {
      if (!ticket.calledAt || !ticket.completedAt) return sum;
      const serviceTime = Math.floor(
        (ticket.completedAt.getTime() - ticket.calledAt.getTime()) / 1000,
      );
      return sum + serviceTime;
    }, 0);

    return Math.round(totalServiceTime / completedTickets.length);
  }

  /**
   * Calcular tempo médio de troca de senha (intervalo entre chamadas)
   */
  async getAverageCallInterval(
    queueId: string,
    days: number = 7,
  ): Promise<number> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const calls = await this.prisma.ticket.findMany({
      where: {
        queueId,
        calledAt: {
          gte: startDate,
          not: null,
        },
      },
      select: {
        calledAt: true,
      },
      orderBy: {
        calledAt: 'asc',
      },
    });

    if (calls.length < 2) return 0;

    let totalInterval = 0;
    let intervalCount = 0;

    for (let i = 1; i < calls.length; i++) {
      const intervalSeconds =
        (calls[i].calledAt.getTime() - calls[i - 1].calledAt.getTime()) / 1000;
      totalInterval += intervalSeconds;
      intervalCount++;
    }

    return intervalCount > 0 ? Math.round(totalInterval / intervalCount) : 0;
  }

  /**
   * Calcular tempo médio de espera
   */
  async getAverageWaitTime(queueId: string, days: number = 7): Promise<number> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const result = await this.prisma.$queryRaw<
      Array<{ avg_wait_time: number }>
    >`
      SELECT AVG(
        EXTRACT(EPOCH FROM (t."calledAt" - t."createdAt"))
      )::integer as avg_wait_time
      FROM tickets t
      WHERE t."queueId" = ${queueId}
        AND t."calledAt" IS NOT NULL
        AND t."calledAt" >= ${startDate}
    `;

    return result[0]?.avg_wait_time || 0;
  }

  /**
   * Obter estatísticas consolidadas de uma fila
   */
  async getQueueStatistics(
    queueId: string,
    days: number = 7,
  ): Promise<{
    totalProcessed: number;
    avgServiceTime: number;
    avgCallInterval: number;
    avgWaitTime: number;
    callsByHour: Array<{ hour: number; count: number }>;
    completionRate: number;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Total processado
    const totalProcessed = await this.prisma.ticket.count({
      where: {
        queueId,
        status: { in: ['COMPLETED', 'NO_SHOW'] },
      },
    });

    // Estatísticas de tempo
    const [avgServiceTime, avgCallInterval, avgWaitTime] = await Promise.all([
      this.getAverageServiceTime(queueId, days),
      this.getAverageCallInterval(queueId, days),
      this.getAverageWaitTime(queueId, days),
    ]);

    // Chamadas por hora (últimas 24 horas)
    const last24Hours = new Date();
    last24Hours.setHours(last24Hours.getHours() - 24);

    const callsByHourData = await this.prisma.$queryRaw<
      Array<{ hour: number; count: bigint }>
    >`
      SELECT
        EXTRACT(HOUR FROM "calledAt")::integer as hour,
        COUNT(*)::bigint as count
      FROM tickets
      WHERE "queueId" = ${queueId}
        AND "calledAt" IS NOT NULL
        AND "calledAt" >= ${last24Hours}
      GROUP BY EXTRACT(HOUR FROM "calledAt")
      ORDER BY hour
    `;

    const callsByHour = callsByHourData.map((item) => ({
      hour: item.hour,
      count: Number(item.count),
    }));

    // Taxa de conclusão (completed vs no_show + cancelled)
    const completionData = await this.prisma.$queryRaw<
      Array<{ status: string; count: bigint }>
    >`
      SELECT status, COUNT(*)::bigint as count
      FROM tickets
      WHERE "queueId" = ${queueId}
        AND status IN ('COMPLETED', 'NO_SHOW', 'CANCELLED')
        AND "calledAt" >= ${startDate}
      GROUP BY status
    `;

    const completed =
      Number(
        completionData.find((d) => d.status === 'COMPLETED')?.count || 0,
      ) || 0;
    const noShow =
      Number(completionData.find((d) => d.status === 'NO_SHOW')?.count || 0) ||
      0;
    const cancelled =
      Number(
        completionData.find((d) => d.status === 'CANCELLED')?.count || 0,
      ) || 0;

    const total = completed + noShow + cancelled;
    const completionRate = total > 0 ? (completed / total) * 100 : 0;

    return {
      totalProcessed,
      avgServiceTime,
      avgCallInterval,
      avgWaitTime,
      callsByHour,
      completionRate: Math.round(completionRate * 100) / 100,
    };
  }

  /**
   * Exportar histórico para CSV
   */
  async exportHistoryToCSV(
    queueId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<string> {
    const history = await this.prisma.ticket.findMany({
      where: {
        queueId,
        calledAt: {
          ...(startDate && { gte: startDate }),
          ...(endDate && { lte: endDate }),
          not: null,
        },
      },
      select: {
        myCallingToken: true,
        clientName: true,
        clientPhone: true,
        priority: true,
        calledAt: true,
        status: true,
        completedAt: true,
      },
      orderBy: { calledAt: 'desc' },
    });

    const csvHeader = [
      'Data/Hora',
      'Status',
      'Senha',
      'Cliente',
      'Telefone',
      'Prioridade',
      'Tempo de Serviço (s)',
    ].join(',');

    const csvRows = history.map((item) => {
      let serviceTime = '-';
      if (item.calledAt && item.completedAt) {
        serviceTime = Math.floor(
          (item.completedAt.getTime() - item.calledAt.getTime()) / 1000,
        ).toString();
      }
      return [
        item.calledAt?.toISOString() || '-',
        item.status,
        item.myCallingToken,
        item.clientName || '-',
        item.clientPhone || '-',
        item.priority,
        serviceTime,
      ]
        .map((value) => `"${value}"`)
        .join(',');
    });

    return [csvHeader, ...csvRows].join('\n');
  }

  /**
   * Obter tickets mais demorados (outliers)
   */
  async getSlowestTickets(
    queueId: string,
    limit: number = 10,
    days: number = 7,
  ) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const result = await this.prisma.$queryRaw<
      Array<{
        ticket_id: string;
        calling_token: string;
        service_time: number;
        called_at: Date;
      }>
    >`
      SELECT
        t.id as ticket_id,
        t."myCallingToken" as calling_token,
        EXTRACT(EPOCH FROM (t."completedAt" - t."calledAt"))::integer as service_time,
        t."calledAt" as called_at
      FROM tickets t
      WHERE t."queueId" = ${queueId}
        AND t.status = 'COMPLETED'
        AND t."calledAt" >= ${startDate}
        AND t."calledAt" IS NOT NULL
        AND t."completedAt" IS NOT NULL
      ORDER BY service_time DESC
      LIMIT ${limit}
    `;

    return result;
  }
}
