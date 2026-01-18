import { Injectable, Logger } from '@nestjs/common';
import { QueueRepository } from '../repositories/queue.repository';

@Injectable()
export class QueueStatsService {
  private readonly logger = new Logger(QueueStatsService.name);

  constructor(private queueRepository: QueueRepository) {}

  async getDetailedStats(queueId: string, tenantId: string) {
    try {
      const queue = await this.queueRepository.findQueueWithStats(
        queueId,
        tenantId,
      );

      if (!queue) {
        return null;
      }

      const [
        avgServiceTimeRecent,
        avgServiceTimeFallback,
        dailyStats,
        completedToday,
        calledToday,
      ] = await Promise.all([
        this.queueRepository.getAverageServiceTimeRecent(queueId),
        this.queueRepository.getAverageServiceTimeFallback(queueId),
        this.queueRepository.getDailyStats(queueId, new Date()),
        this.queueRepository.getCompletedTicketsToday(queueId),
        this.queueRepository.getCalledTicketsToday(queueId),
      ]);

      return {
        queue: {
          id: queue.id,
          name: queue.name,
          queueType: queue.queueType,
          isActive: queue.isActive,
          capacity: queue.capacity,
        },
        stats: {
          waitingTickets: queue.tickets.length,
          completedToday,
          calledToday,
          avgServiceTimeRecent,
          avgServiceTimeFallback,
          dailyStats,
        },
        tenant: {
          id: queue.tenant.id,
          name: queue.tenant.name,
        },
      };
    } catch (error) {
      this.logger.error(
        `Erro ao obter estatísticas detalhadas: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async getDailyMetrics(queueId: string, date: Date) {
    const dailyStats = await this.queueRepository.getDailyStats(queueId, date);

    return {
      date,
      totalTickets: dailyStats.total_tickets,
      completedTickets: dailyStats.completed_tickets,
      avgServiceTime: dailyStats.avg_service_time,
      avgWaitTime: dailyStats.avg_wait_time,
      completionRate:
        dailyStats.total_tickets > 0
          ? (dailyStats.completed_tickets / dailyStats.total_tickets) * 100
          : 0,
    };
  }
}
