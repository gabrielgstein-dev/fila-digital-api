import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class QueueDailyStatsService {
  private readonly logger = new Logger(QueueDailyStatsService.name);

  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async generateDailyStats() {
    this.logger.log('Iniciando geração de estatísticas diárias...');

    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const today = new Date(yesterday);
      today.setDate(today.getDate() + 1);

      const queues = await this.prisma.queue.findMany({
        where: { isActive: true },
        select: { id: true },
      });

      for (const queue of queues) {
        try {
          await this.generateStatsForQueue(queue.id, yesterday, today);
        } catch (error) {
          this.logger.error(
            `Erro ao gerar estatísticas para fila ${queue.id}:`,
            error,
          );
        }
      }

      this.logger.log(
        `Estatísticas diárias geradas para ${queues.length} filas`,
      );
    } catch (error) {
      this.logger.error('Erro ao gerar estatísticas diárias:', error);
    }
  }

  async generateStatsForQueue(queueId: string, startDate: Date, endDate: Date) {
    const stats = await this.prisma.$queryRaw<
      Array<{
        total_processed: bigint;
        total_completed: bigint;
        total_no_show: bigint;
        total_cancelled: bigint;
        avg_service_time: number | null;
        avg_wait_time: number | null;
        peak_hour: number | null;
        total_tickets_created: bigint;
      }>
    >`
      WITH daily_stats AS (
        SELECT
          COUNT(*) FILTER (WHERE action IN ('COMPLETED', 'NO_SHOW', 'CANCELLED'))::bigint as total_processed,
          COUNT(*) FILTER (WHERE action = 'COMPLETED')::bigint as total_completed,
          COUNT(*) FILTER (WHERE action = 'NO_SHOW')::bigint as total_no_show,
          COUNT(*) FILTER (WHERE action = 'CANCELLED')::bigint as total_cancelled,
          AVG((metadata->>'serviceTime')::numeric) FILTER (
            WHERE action = 'COMPLETED'
            AND metadata->>'serviceTime' IS NOT NULL
            AND (metadata->>'serviceTime')::numeric > 0
          )::integer as avg_service_time,
          AVG(EXTRACT(EPOCH FROM ("calledAt" - (
            SELECT "createdAt" FROM tickets WHERE id = "ticketId"
          )))) FILTER (
            WHERE action = 'COMPLETED'
            AND "calledAt" IS NOT NULL
          )::integer as avg_wait_time
        FROM queue_ticket_history
        WHERE "queueId" = ${queueId}
          AND DATE("calledAt") = DATE(${startDate})
      ),
      peak_hour_stats AS (
        SELECT
          EXTRACT(HOUR FROM "calledAt")::integer as hour,
          COUNT(*) as count
        FROM queue_ticket_history
        WHERE "queueId" = ${queueId}
          AND DATE("calledAt") = DATE(${startDate})
          AND action IN ('COMPLETED', 'NO_SHOW')
        GROUP BY EXTRACT(HOUR FROM "calledAt")
        ORDER BY count DESC
        LIMIT 1
      ),
      tickets_created AS (
        SELECT COUNT(*)::bigint as total_tickets_created
        FROM tickets
        WHERE "queueId" = ${queueId}
          AND DATE("createdAt") = DATE(${startDate})
      )
      SELECT
        COALESCE(ds.total_processed, 0::bigint) as total_processed,
        COALESCE(ds.total_completed, 0::bigint) as total_completed,
        COALESCE(ds.total_no_show, 0::bigint) as total_no_show,
        COALESCE(ds.total_cancelled, 0::bigint) as total_cancelled,
        COALESCE(ds.avg_service_time, 0) as avg_service_time,
        COALESCE(ds.avg_wait_time, 0) as avg_wait_time,
        ph.hour as peak_hour,
        COALESCE(tc.total_tickets_created, 0::bigint) as total_tickets_created
      FROM daily_stats ds
      CROSS JOIN tickets_created tc
      LEFT JOIN peak_hour_stats ph ON true
    `;

    if (stats.length === 0) {
      this.logger.warn(
        `Nenhuma estatística encontrada para fila ${queueId} no dia ${startDate.toISOString()}`,
      );
      return;
    }

    const stat = stats[0];
    const dateStr = startDate.toISOString().split('T')[0];
    const statId = `qds_${queueId}_${dateStr}`;

    await this.prisma.$executeRaw`
      INSERT INTO queue_daily_stats (
        "id",
        "queueId",
        "date",
        "totalProcessed",
        "totalCompleted",
        "totalNoShow",
        "totalCancelled",
        "avgServiceTime",
        "avgWaitTime",
        "peakHour",
        "totalTicketsCreated",
        "updatedAt"
      ) VALUES (
        ${statId},
        ${queueId},
        DATE(${startDate}),
        ${Number(stat.total_processed)},
        ${Number(stat.total_completed)},
        ${Number(stat.total_no_show)},
        ${Number(stat.total_cancelled)},
        ${stat.avg_service_time || 0},
        ${stat.avg_wait_time || 0},
        ${stat.peak_hour},
        ${Number(stat.total_tickets_created)},
        CURRENT_TIMESTAMP
      )
      ON CONFLICT ("queueId", "date")
      DO UPDATE SET
        "totalProcessed" = EXCLUDED."totalProcessed",
        "totalCompleted" = EXCLUDED."totalCompleted",
        "totalNoShow" = EXCLUDED."totalNoShow",
        "totalCancelled" = EXCLUDED."totalCancelled",
        "avgServiceTime" = EXCLUDED."avgServiceTime",
        "avgWaitTime" = EXCLUDED."avgWaitTime",
        "peakHour" = EXCLUDED."peakHour",
        "totalTicketsCreated" = EXCLUDED."totalTicketsCreated",
        "updatedAt" = CURRENT_TIMESTAMP
    `;

    this.logger.debug(
      `Estatísticas geradas para fila ${queueId} no dia ${dateStr}`,
    );
  }

  async generateStatsForDate(queueId: string, date: Date) {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);

    return this.generateStatsForQueue(queueId, startDate, endDate);
  }
}
