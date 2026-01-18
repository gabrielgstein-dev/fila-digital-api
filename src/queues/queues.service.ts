import {
    BadRequestException,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TicketStatus } from '@prisma/client';
import { ERROR_CODES } from '../common/constants/error-codes';
import { CreateQueueDto } from '../common/dto/create-queue.dto';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import { WhatsAppQueueService } from '../whatsapp/whatsapp-queue.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { QueueCallService } from './helpers/queue-call.service';
import { QueueStatsService } from './helpers/queue-stats.service';
import { QueueValidationService } from './helpers/queue-validation.service';
import { QueueRepository } from './repositories/queue.repository';

@Injectable()
export class QueuesService {
  private readonly logger = new Logger(QueuesService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private whatsappService: WhatsAppService,
    private whatsappQueueService: WhatsAppQueueService,
    private telegramService: TelegramService,
    private queueRepository: QueueRepository,
    private validationService: QueueValidationService,
    private statsService: QueueStatsService,
    private callService: QueueCallService,
  ) {}

  /**
   * Cria uma nova fila para o tenant
   * @param tenantId - ID do tenant
   * @param createQueueDto - Dados da fila (nome, tipo, capacidade)
   * @returns Fila criada com tickets aguardando
   */
  async create(tenantId: string, createQueueDto: CreateQueueDto) {
    const { isActive, ...queueData } = createQueueDto;

    return this.prisma.queue.create({
      data: {
        ...queueData,
        tenantId,
        isActive: isActive === undefined ? true : Boolean(isActive),
      },
      include: {
        tenant: true,
        tickets: {
          where: { status: TicketStatus.WAITING },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.queue.findMany({
      where: { tenantId, isActive: true },
      include: {
        tickets: {
          where: { status: TicketStatus.WAITING },
          orderBy: { createdAt: 'asc' },
        },
        _count: {
          select: { tickets: true },
        },
      },
    });
  }

  async findOne(tenantId: string, id: string) {
    const queue = await this.prisma.queue.findFirst({
      where: { id, tenantId },
      include: {
        tenant: true,
        tickets: {
          orderBy: { createdAt: 'asc' },
        },
        _count: {
          select: { tickets: true },
        },
      },
    });

    if (!queue) {
      throw new NotFoundException('Fila não encontrada');
    }

    return queue;
  }

  async update(tenantId: string, id: string, updateQueueDto: CreateQueueDto) {
    const queue = await this.findOne(tenantId, id);

    return this.prisma.queue.update({
      where: { id: queue.id },
      data: updateQueueDto,
      include: {
        tenant: true,
        tickets: {
          where: { status: TicketStatus.WAITING },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async remove(tenantId: string, id: string) {
    const queue = await this.findOne(tenantId, id);

    const activeTickets = await this.prisma.ticket.count({
      where: {
        queueId: queue.id,
        status: {
          in: [TicketStatus.WAITING, TicketStatus.CALLED],
        },
      },
    });

    if (activeTickets > 0) {
      throw new BadRequestException(ERROR_CODES.QUEUE_HAS_ACTIVE_TICKETS);
    }

    return this.prisma.queue.update({
      where: { id: queue.id },
      data: { isActive: false },
    });
  }

  /**
   * Chama o próximo ticket na fila (respeitando prioridade + FIFO)
   * @param tenantId - ID do tenant
   * @param queueId - ID da fila
   * @param agentId - ID do agente chamando (opcional)
   * @returns Ticket chamado com status CALLED
   * @throws NotFoundException se não houver tickets na fila
   * @throws BadRequestException se a fila estiver inativa
   */
  async callNext(tenantId: string, queueId: string, agentId?: string) {
    this.logger.log(`Chamando próximo ticket na fila: ${queueId}`);

    const queue = await this.validationService.validateQueueForCall(
      queueId,
      tenantId,
    );

    const updatedTicket = await this.callService.callNextTicket(queueId, agentId);

    await this.notifyTicketCalled(updatedTicket);
    await this.notifyWaitingTicketsUpTo3Positions(queue.id);

    this.logger.log(
      `Fila ${queueId} atualizada: senha atual = ${updatedTicket.myCallingToken}`,
    );

    return updatedTicket;
  }

  private async notifyTicketCalled(ticket: any): Promise<void> {
    const telegramChatId = ticket.telegramChatId;

    if (telegramChatId && this.telegramService.isConfigured()) {
      try {
        await this.telegramService.sendTicketNotification(
          telegramChatId,
          ticket.myCallingToken,
          ticket.queue.name,
        );
      } catch (error) {
        this.logger.error(
          `Erro ao enviar notificação Telegram: ${error instanceof Error ? error.message : String(error)}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }

    this.logger.debug(
      `Notificação SSE disparada automaticamente via trigger para fila ${ticket.queueId}`,
    );
  }

  private async notifyWaitingTicketsUpTo3Positions(queueId: string) {
    try {
      const queue = await this.prisma.queue.findUnique({
        where: { id: queueId },
        include: { tenant: true },
      });

      if (!queue) {
        return;
      }

      const waitingTickets = await this.prisma.ticket.findMany({
        where: {
          queueId,
          status: TicketStatus.WAITING,
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
        take: 3,
        include: {
          queue: {
            include: {
              tenant: true,
            },
          },
        },
      });

      if (waitingTickets.length === 0) {
        return;
      }

      const avgServiceTime =
        (await this.queueRepository.getAverageServiceTimeRecent(queueId)) ||
        queue.avgServiceTime ||
        300;

      const baseUrl =
        this.configService.get<string>('FRONTEND_URL') ||
        'http://localhost:3000';

      for (let i = 0; i < waitingTickets.length; i++) {
        const ticket = waitingTickets[i];
        const position = i + 1;
        const estimatedTimeSeconds = position * avgServiceTime;
        const estimatedMinutes = Math.ceil(estimatedTimeSeconds / 60);

        if (ticket.clientPhone && this.whatsappService.isConfigured()) {
          this.whatsappQueueService
            .enqueuePositionUpdate(
              ticket.clientPhone,
              ticket.queue.tenant.name,
              ticket.myCallingToken,
              position,
              estimatedMinutes,
              ticket.id,
              baseUrl,
              ticket.clientName || undefined,
              ticket.queue.name,
            )
            .then((result) => {
              if (result.success) {
                this.logger.log(
                  `Atualização de posição WhatsApp enviada para ${ticket.clientPhone} - Senha: ${ticket.myCallingToken}`,
                );
              } else {
                this.logger.error(
                  `Erro ao enviar atualização de posição WhatsApp para ${ticket.clientPhone}: ${result.error}`,
                );
              }
            })
            .catch((error) => {
              this.logger.error(
                `Erro ao enviar atualização de posição WhatsApp para ticket ${ticket.id}: ${error instanceof Error ? error.message : String(error)}`,
                error instanceof Error ? error.stack : undefined,
              );
            });
        }
      }
    } catch (error) {
      this.logger.error(
        `Erro ao notificar tickets aguardando: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  async getQueueStats(tenantId: string, queueId: string) {
    const queue = await this.findOne(tenantId, queueId);

    const [waiting, called, completed] = await Promise.all([
      this.prisma.ticket.count({
        where: { queueId: queue.id, status: TicketStatus.WAITING },
      }),
      this.prisma.ticket.count({
        where: { queueId: queue.id, status: TicketStatus.CALLED },
      }),
      this.prisma.ticket.count({
        where: {
          queueId: queue.id,
          status: TicketStatus.COMPLETED,
          completedAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
    ]);

    return {
      waiting,
      called,
      completed,
      avgServiceTime: queue.avgServiceTime,
    };
  }

  async getAllTickets(tenantId: string) {
    const queues = await this.prisma.queue.findMany({
      where: {
        tenantId,
        isActive: true,
      },
      include: {
        tickets: {
          where: {
            status: {
              in: [TicketStatus.WAITING, TicketStatus.CALLED],
            },
          },
          orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
        },
      },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayStats = await this.prisma.ticket.groupBy({
      by: ['status'],
      where: {
        queue: {
          tenantId,
        },
        createdAt: {
          gte: today,
        },
      },
      _count: {
        status: true,
      },
    });

    const totalWaiting = queues.reduce(
      (sum, queue) =>
        sum +
        queue.tickets.filter((t) => t.status === TicketStatus.WAITING).length,
      0,
    );

    const totalCalled = queues.reduce(
      (sum, queue) =>
        sum +
        queue.tickets.filter((t) => t.status === TicketStatus.CALLED).length,
      0,
    );

    const totalCompleted =
      todayStats.find((s) => s.status === TicketStatus.COMPLETED)?._count
        .status || 0;

    const allWaitingTickets = queues.flatMap((queue) =>
      queue.tickets.filter((t) => t.status === TicketStatus.WAITING),
    );

    const avgWaitTime =
      allWaitingTickets.length > 0
        ? allWaitingTickets.reduce(
            (sum, ticket) => sum + (ticket.estimatedTime || 0),
            0,
          ) / allWaitingTickets.length
        : 0;

    const queuesWithCurrentNumber = await Promise.all(
      queues.map(async (queue) => {
        const [currentTicket, previousTicket, lastCalledTicket, totalProcessed] =
          await Promise.all([
            this.prisma.ticket.findFirst({
              where: {
                queueId: queue.id,
                status: TicketStatus.CALLED,
              },
              orderBy: { calledAt: 'desc' },
              select: { myCallingToken: true },
            }),
            this.prisma.ticket.findFirst({
              where: {
                queueId: queue.id,
                status: { in: [TicketStatus.COMPLETED, TicketStatus.NO_SHOW] },
              },
              orderBy: { calledAt: 'desc' },
              select: { myCallingToken: true },
            }),
            this.prisma.ticket.findFirst({
              where: {
                queueId: queue.id,
                calledAt: { not: null },
              },
              orderBy: { calledAt: 'desc' },
              select: { calledAt: true },
            }),
            this.prisma.ticket.count({
              where: {
                queueId: queue.id,
                status: { in: [TicketStatus.COMPLETED, TicketStatus.NO_SHOW] },
              },
            }),
          ]);

        return {
          id: queue.id,
          name: queue.name,
          description: queue.description,
          queueType: queue.queueType,
          capacity: queue.capacity,
          avgServiceTime: queue.avgServiceTime,
          currentNumber: currentTicket?.myCallingToken || 'Aguardando...',
          previousNumber: previousTicket?.myCallingToken || '-',
          totalProcessed,
          lastCalledAt: lastCalledTicket?.calledAt || null,
          totalWaiting: queue.tickets.filter(
            (t) => t.status === TicketStatus.WAITING,
          ).length,
          totalCalled: queue.tickets.filter(
            (t) => t.status === TicketStatus.CALLED,
          ).length,
          tickets: queue.tickets.map((ticket) => ({
            id: ticket.id,
            myCallingToken: ticket.myCallingToken,
            clientName: ticket.clientName,
            clientPhone: ticket.clientPhone,
            clientEmail: ticket.clientEmail,
            status: ticket.status,
            priority: ticket.priority,
            estimatedTime: ticket.estimatedTime,
            position: this.calculatePosition(queue.tickets, ticket),
            createdAt: ticket.createdAt,
            calledAt: ticket.calledAt,
          })),
        };
      }),
    );

    return {
      summary: {
        totalQueues: queues.length,
        totalWaiting,
        totalCalled,
        totalCompleted,
        avgWaitTime: Math.round(avgWaitTime),
        lastUpdated: new Date(),
      },
      queues: queuesWithCurrentNumber,
    };
  }

  private calculatePosition(allTickets: any[], currentTicket: any): number {
    const waitingTickets = allTickets
      .filter((t) => t.status === TicketStatus.WAITING)
      .sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }
        return (
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      });

    const position =
      waitingTickets.findIndex((t) => t.id === currentTicket.id) + 1;
    return position > 0 ? position : 0;
  }

  async generateQRCode(queueId: string) {
    const queue = await this.prisma.queue.findUnique({
      where: { id: queueId },
      include: { tenant: true },
    });

    if (!queue) {
      throw new NotFoundException('Fila não encontrada');
    }

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const apiUrl =
      process.env.API_URL ||
      process.env.FRONTEND_URL ||
      'http://localhost:3001';
    const botUsername = process.env.TELEGRAM_BOT_USERNAME;

    const qrCodeUrl = `${baseUrl}/queue/${queue.id}`;
    const telegramDeepLink = botUsername
      ? `https://t.me/${botUsername}?start=queue_${queue.id}`
      : null;

    const qrCodeDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrCodeUrl)}`;

    return {
      queueId: queue.id,
      queueName: queue.name,
      tenantName: queue.tenant.name,
      qrCodeUrl: qrCodeDataUrl,
      directUrl: qrCodeUrl,
      telegramDeepLink,
      apiJoinUrl: `${apiUrl}/api/v1/queues/${queue.id}/join-telegram`,
      createdAt: new Date(),
    };
  }

  async recall(tenantId: string, queueId: string) {
    const queue = await this.findOne(tenantId, queueId);

    const lastCalledTicket = await this.prisma.ticket.findFirst({
      where: {
        queueId: queue.id,
        status: TicketStatus.CALLED,
      },
      orderBy: { calledAt: 'desc' },
    });

    if (!lastCalledTicket) {
      throw new NotFoundException('Nenhum ticket foi chamado ainda nesta fila');
    }

    const updatedTicket = await this.prisma.ticket.update({
      where: { id: lastCalledTicket.id },
      data: {
        calledAt: new Date(),
      },
      include: {
        queue: {
          include: {
            tenant: true,
          },
        },
      },
    });

    return {
      message: 'Ticket rechamado com sucesso',
      ticket: updatedTicket,
    };
  }

  /**
   * Retorna estatísticas detalhadas da fila
   * @param tenantId - ID do tenant
   * @param queueId - ID da fila
   * @returns Estatísticas completas (aguardando, completados, tempo médio, etc)
   * @throws NotFoundException se a fila não existir
   */
  async getQueueDetailedStats(tenantId: string, queueId: string) {
    await this.validationService.validateQueueAccess(queueId, tenantId);

    const detailedStats = await this.statsService.getDetailedStats(
      queueId,
      tenantId,
    );

    if (!detailedStats) {
      throw new NotFoundException('Fila não encontrada');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [dailyStatsFromDb, waitingTickets, calledTickets, nextTicket] =
      await Promise.all([
        this.getDailyStatsFromDb(queueId),
        this.prisma.ticket.findMany({
          where: { queueId, status: TicketStatus.WAITING },
          orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
        }),
        this.prisma.ticket.count({
          where: { queueId, status: TicketStatus.CALLED },
        }),
        this.prisma.ticket.findFirst({
          where: { queueId, status: TicketStatus.WAITING },
          orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
        }),
      ]);

    const nextEstimatedTime = nextTicket
      ? await this.queueRepository.getAverageServiceTimeRecent(queueId)
      : 0;

    const queueStatus = this.determineQueueStatus(
      detailedStats.queue,
      waitingTickets.length,
      calledTickets,
    );

    return {
      queueInfo: {
        id: detailedStats.queue.id,
        name: detailedStats.queue.name,
        capacity: detailedStats.queue.capacity,
        avgServiceTime: detailedStats.stats.avgServiceTimeRecent,
        status: queueStatus,
      },
      currentStats: {
        waitingCount: waitingTickets.length,
        calledCount: calledTickets,
        completedToday: detailedStats.stats.completedToday,
        nextEstimatedTime,
        nextEstimatedTimeMinutes: Math.round(nextEstimatedTime / 60),
        completionRate:
          detailedStats.stats.dailyStats.total_tickets > 0
            ? Math.round(
                (detailedStats.stats.dailyStats.completed_tickets /
                  detailedStats.stats.dailyStats.total_tickets) *
                  100,
              )
            : 0,
      },
      performance: {
        avgWaitTime: detailedStats.stats.dailyStats.avg_wait_time || 0,
        avgWaitTimeMinutes: Math.round(
          (detailedStats.stats.dailyStats.avg_wait_time || 0) / 60,
        ),
        totalProcessedToday:
          detailedStats.stats.dailyStats.completed_tickets || 0,
        abandonmentRate: 0,
      },
      lastUpdated: new Date(),
    };
  }

  private async getDailyStatsFromDb(queueId: string) {
    try {
      const result = await this.prisma.$queryRaw<
        Array<{
          totalProcessed: number;
          totalCompleted: number;
          totalNoShow: number;
          avgServiceTime: number;
          avgWaitTime: number;
        }>
      >`
        SELECT
          "totalProcessed",
          "totalCompleted",
          "totalNoShow",
          "avgServiceTime",
          "avgWaitTime"
        FROM queue_daily_stats
        WHERE "queueId" = ${queueId}
          AND "date" = CURRENT_DATE
        LIMIT 1
      `;
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      this.logger.error(
        `Erro ao buscar daily stats: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      return null;
    }
  }

  private determineQueueStatus(
    queue: any,
    waitingCount: number,
    calledCount: number,
  ): string {
    if (!queue.isActive) return 'inativa';
    if (waitingCount === 0 && calledCount === 0) return 'pausada';
    return 'ativa';
  }
}
