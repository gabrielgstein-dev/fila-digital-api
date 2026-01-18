import { Injectable, Logger } from '@nestjs/common';
import { TicketStatus } from '@prisma/client';
import { QUEUE_DEFAULTS, TIME_WINDOWS } from '../../common/constants/queue.constants';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TicketEstimateService {
  private readonly logger = new Logger(TicketEstimateService.name);

  constructor(private prisma: PrismaService) {}

  async calculateEstimatedTime(
    queueId: string,
    position: number,
  ): Promise<number> {
    if (position <= 0) {
      return 0;
    }

    const avgServiceTime = await this.getAverageServiceTime(queueId);
    return position * avgServiceTime;
  }

  async getTicketPosition(
    queueId: string,
    ticketId: string,
  ): Promise<number> {
    const waitingTickets = await this.prisma.ticket.findMany({
      where: {
        queueId,
        status: TicketStatus.WAITING,
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });

    const position = waitingTickets.findIndex(
      (ticket) => ticket.id === ticketId,
    );
    return position >= 0 ? position + 1 : 0;
  }

  async getAverageServiceTime(queueId: string): Promise<number> {
    const avgRecent = await this.getAverageServiceTimeRecent(queueId);
    if (avgRecent > 0) {
      return avgRecent;
    }

    const avgFallback = await this.getAverageServiceTimeFallback(queueId);
    if (avgFallback > 0) {
      return avgFallback;
    }

    return QUEUE_DEFAULTS.AVG_SERVICE_TIME;
  }

  private async getAverageServiceTimeRecent(
    queueId: string,
  ): Promise<number> {
    try {
      const hoursAgo = new Date();
      hoursAgo.setHours(hoursAgo.getHours() - TIME_WINDOWS.RECENT_SERVICE_HOURS);

      const result = await this.prisma.callLog.aggregate({
        where: {
          queueId,
          action: 'COMPLETED',
          calledAt: { gte: hoursAgo },
          serviceTime: { not: null, gt: 0 },
        },
        _avg: {
          serviceTime: true,
        },
      });

      return Math.round(result._avg.serviceTime || 0);
    } catch (error) {
      this.logger.error(
        `Erro ao calcular tempo médio recente: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      return 0;
    }
  }

  private async getAverageServiceTimeFallback(
    queueId: string,
  ): Promise<number> {
    try {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - TIME_WINDOWS.FALLBACK_SERVICE_DAYS);

      const result = await this.prisma.callLog.aggregate({
        where: {
          queueId,
          action: 'COMPLETED',
          calledAt: { gte: daysAgo },
          serviceTime: { not: null, gt: 0 },
        },
        _avg: {
          serviceTime: true,
        },
      });

      return Math.round(result._avg.serviceTime || 0);
    } catch (error) {
      this.logger.error(
        `Erro ao calcular tempo médio fallback: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      return 0;
    }
  }
}
