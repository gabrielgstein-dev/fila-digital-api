import { Injectable, Logger } from '@nestjs/common';
import { TicketStatus } from '@prisma/client';
import { TIME_WINDOWS } from '../../common/constants/queue.constants';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class QueueRepository {
  private readonly logger = new Logger(QueueRepository.name);

  constructor(private prisma: PrismaService) {}

  async findQueueWithStats(queueId: string, tenantId: string) {
    return this.prisma.queue.findFirst({
      where: { id: queueId, tenantId },
      include: {
        tenant: true,
        tickets: {
          where: { status: TicketStatus.WAITING },
          orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
        },
        _count: {
          select: { tickets: true },
        },
      },
    });
  }

  async getAverageServiceTimeRecent(
    queueId: string,
    hours: number = TIME_WINDOWS.RECENT_SERVICE_HOURS,
  ): Promise<number> {
    try {
      const hoursAgo = new Date();
      hoursAgo.setHours(hoursAgo.getHours() - hours);

      const result = await this.prisma.$queryRaw<
        Array<{ avg_service_time: number | null }>
      >`
        SELECT
          AVG((metadata->>'serviceTime')::numeric)::integer as avg_service_time
        FROM queue_ticket_history
        WHERE "queueId" = ${queueId}
          AND action = 'COMPLETED'
          AND "calledAt" >= ${hoursAgo}
          AND metadata->>'serviceTime' IS NOT NULL
          AND (metadata->>'serviceTime')::numeric > 0
      `;

      return result[0]?.avg_service_time || 0;
    } catch (error) {
      this.logger.error(
        `Erro ao calcular tempo médio recente: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      return 0;
    }
  }

  async getAverageServiceTimeFallback(
    queueId: string,
    days: number = TIME_WINDOWS.FALLBACK_SERVICE_DAYS,
  ): Promise<number> {
    try {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - days);

      const result = await this.prisma.$queryRaw<
        Array<{ avg_service_time: number | null }>
      >`
        SELECT
          AVG((metadata->>'serviceTime')::numeric)::integer as avg_service_time
        FROM queue_ticket_history
        WHERE "queueId" = ${queueId}
          AND action = 'COMPLETED'
          AND "calledAt" >= ${daysAgo}
          AND metadata->>'serviceTime' IS NOT NULL
          AND (metadata->>'serviceTime')::numeric > 0
      `;

      return result[0]?.avg_service_time || 0;
    } catch (error) {
      this.logger.error(
        `Erro ao calcular tempo médio fallback: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      return 0;
    }
  }

  async getDailyStats(queueId: string, date: Date) {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const result = await this.prisma.$queryRaw<
        Array<{
          total_tickets: number;
          completed_tickets: number;
          avg_service_time: number | null;
          avg_wait_time: number | null;
        }>
      >`
        SELECT
          COUNT(DISTINCT t.id) as total_tickets,
          COUNT(DISTINCT CASE WHEN t.status = 'COMPLETED' THEN t.id END) as completed_tickets,
          AVG(CASE
            WHEN qth.metadata->>'serviceTime' IS NOT NULL
            THEN (qth.metadata->>'serviceTime')::numeric
          END)::integer as avg_service_time,
          AVG(EXTRACT(EPOCH FROM (t."calledAt" - t."createdAt")))::integer as avg_wait_time
        FROM tickets t
        LEFT JOIN queue_ticket_history qth ON qth."ticketId" = t.id AND qth.action = 'COMPLETED'
        WHERE t."queueId" = ${queueId}
          AND t."createdAt" >= ${startOfDay}
          AND t."createdAt" <= ${endOfDay}
      `;

      return result[0] || {
        total_tickets: 0,
        completed_tickets: 0,
        avg_service_time: null,
        avg_wait_time: null,
      };
    } catch (error) {
      this.logger.error(
        `Erro ao calcular estatísticas diárias: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      return {
        total_tickets: 0,
        completed_tickets: 0,
        avg_service_time: null,
        avg_wait_time: null,
      };
    }
  }

  async getWaitingTicketsCount(queueId: string): Promise<number> {
    return this.prisma.ticket.count({
      where: {
        queueId,
        status: TicketStatus.WAITING,
      },
    });
  }

  async getNextTicketInQueue(queueId: string) {
    return this.prisma.ticket.findFirst({
      where: {
        queueId,
        status: TicketStatus.WAITING,
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      include: {
        queue: {
          include: {
            tenant: true,
          },
        },
      },
    });
  }

  async getCompletedTicketsToday(queueId: string): Promise<number> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    return this.prisma.ticket.count({
      where: {
        queueId,
        status: TicketStatus.COMPLETED,
        completedAt: {
          gte: startOfDay,
        },
      },
    });
  }

  async getCalledTicketsToday(queueId: string): Promise<number> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    return this.prisma.ticket.count({
      where: {
        queueId,
        status: {
          in: [TicketStatus.CALLED, TicketStatus.IN_SERVICE],
        },
        calledAt: {
          gte: startOfDay,
        },
      },
    });
  }
}
