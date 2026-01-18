import { Injectable, Logger } from '@nestjs/common';
import { Ticket, TicketStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TicketCleanupService {
  private readonly logger = new Logger(TicketCleanupService.name);

  constructor(
    private prisma: PrismaService,
  ) {}

  /**
   * Executa limpeza de tickets abandonados a cada 5 minutos
   * DESABILITADO: Expiração automática de tickets removida
   */
  // @Cron(CronExpression.EVERY_5_MINUTES)
  async cleanupAbandonedTickets() {
    try {
      this.logger.log('🧹 Iniciando limpeza de tickets abandonados...');

      // Buscar todos os tickets CALLED que ultrapassaram a tolerância
      const abandonedTickets = await this.prisma.ticket.findMany({
        where: {
          status: TicketStatus.CALLED,
          calledAt: {
            not: null,
          },
        },
        include: {
          queue: true,
        },
      });

      let cleanedCount = 0;

      for (const ticket of abandonedTickets) {
        if (!ticket.calledAt || !ticket.queue) continue;

        // Calcular tempo desde que foi chamado (em minutos)
        const timeElapsed = Math.floor(
          (Date.now() - ticket.calledAt.getTime()) / (1000 * 60),
        );

        // DESABILITADO: Expiração automática removida
        // if (timeElapsed >= TICKET_TIMEOUT_MINUTES) {
        if (false) {
          await this.prisma.ticket.update({
            where: { id: ticket.id },
            data: {
              status: TicketStatus.NO_SHOW,
              completedAt: new Date(),
            },
          });

          cleanedCount++;
          this.logger.warn(
            `⏰ Ticket ${ticket.myCallingToken} marcado como NO_SHOW (DESABILITADO)`,
          );
        }
      }

      if (cleanedCount > 0) {
        this.logger.log(
          `✅ Limpeza concluída: ${cleanedCount} tickets abandonados`,
        );
      } else {
        this.logger.log('✅ Nenhum ticket abandonado encontrado');
      }
    } catch (error) {
      this.logger.error('❌ Erro na limpeza de tickets:', error);
    }
  }

  /**
   * Limpeza manual de tickets abandonados para uma fila específica
   */
  async cleanupQueueAbandonedTickets(queueId: string): Promise<number> {
    try {
      const queue = await this.prisma.queue.findUnique({
        where: { id: queueId },
      });

      if (!queue) {
        throw new Error('Fila não encontrada');
      }

      // DESABILITADO: Expiração automática removida
      // Não buscar tickets abandonados automaticamente
      const abandonedTickets: Ticket[] = [];

      let cleanedCount = 0;

      for (const ticket of abandonedTickets) {
        await this.prisma.ticket.update({
          where: { id: ticket.id },
          data: {
            status: TicketStatus.NO_SHOW,
            completedAt: new Date(),
          },
        });

        cleanedCount++;
      }

      this.logger.log(
        `🧹 Limpeza manual da fila ${queue.name}: ${cleanedCount} tickets`,
      );

      return cleanedCount;
    } catch (error) {
      this.logger.error('❌ Erro na limpeza manual:', error);
      throw error;
    }
  }

  /**
   * Estatísticas de abandono para uma fila
   */
  async getAbandonmentStats(queueId: string, days: number = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stats = await this.prisma.ticket.groupBy({
      by: ['status'],
      where: {
        queueId,
        createdAt: {
          gte: startDate,
        },
      },
      _count: {
        status: true,
      },
    });

    const totalTickets = stats.reduce(
      (sum, stat) => sum + stat._count.status,
      0,
    );
    const noShowTickets =
      stats.find((s) => s.status === TicketStatus.NO_SHOW)?._count.status || 0;
    const abandonmentRate =
      totalTickets > 0 ? (noShowTickets / totalTickets) * 100 : 0;

    return {
      totalTickets,
      noShowTickets,
      abandonmentRate: Math.round(abandonmentRate * 100) / 100,
      period: `${days} dias`,
    };
  }
}
