import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TicketStatus } from '@prisma/client';
import { ERROR_CODES } from '../common/constants/error-codes';
import { CreateQueueDto } from '../common/dto/create-queue.dto';
import { TicketNotificationService } from '../messaging/ticket-notification.service';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import { WhatsAppQueueService } from '../whatsapp/whatsapp-queue.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';

@Injectable()
export class QueuesService {
  constructor(
    private prisma: PrismaService,
    private ticketNotificationService: TicketNotificationService,
    private configService: ConfigService,
    private whatsappService: WhatsAppService,
    private whatsappQueueService: WhatsAppQueueService,
    @Inject(forwardRef(() => TelegramService))
    private telegramService: TelegramService,
  ) {}

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

  async callNext(tenantId: string, queueId: string) {
    const queue = await this.findOne(tenantId, queueId);

    const nextTicket = await this.prisma.ticket.findFirst({
      where: {
        queueId: queue.id,
        status: TicketStatus.WAITING,
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });

    if (!nextTicket) {
      throw new NotFoundException('Nenhum ticket disponível na fila');
    }

    if (!nextTicket.id || typeof nextTicket.id !== 'string') {
      console.error('❌ Ticket encontrado mas sem ID válido:', {
        ticket: nextTicket,
        id: nextTicket.id,
        idType: typeof nextTicket.id,
      });
      throw new BadRequestException('Ticket encontrado mas sem ID válido');
    }

    const ticketId = String(nextTicket.id).trim();

    if (!ticketId || ticketId.length === 0) {
      throw new BadRequestException('ID do ticket está vazio');
    }

    console.log(
      `🎫 [CALL NEXT] Chamando próximo ticket: ${ticketId} (${nextTicket.myCallingToken})`,
    );

    console.log(`🔍 [CALL NEXT] Verificando ticket no banco: ${ticketId}`);

    const ticketExists = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true, status: true, queueId: true },
    });

    console.log(`🔍 [CALL NEXT] Ticket encontrado:`, ticketExists);

    if (!ticketExists) {
      console.error(
        `❌ [CALL NEXT] Ticket ${ticketId} não encontrado no banco`,
      );
      throw new NotFoundException(
        `Ticket ${ticketId} não encontrado no banco de dados`,
      );
    }

    if (ticketExists.status !== TicketStatus.WAITING) {
      console.error(
        `❌ [CALL NEXT] Ticket ${ticketId} não está WAITING. Status atual: ${ticketExists.status}`,
      );
      throw new BadRequestException(
        `Ticket ${ticketId} não está com status WAITING (status atual: ${ticketExists.status})`,
      );
    }

    console.log(
      `✅ [CALL NEXT] Ticket válido. Atualizando status para CALLED...`,
    );

    try {
      const updateResult = await this.prisma.ticket.update({
        where: { id: ticketId },
        data: {
          status: TicketStatus.CALLED,
          calledAt: new Date(),
        },
      });

      console.log(
        `✅ [CALL NEXT] Ticket atualizado com sucesso:`,
        updateResult.id,
        updateResult.status,
      );
    } catch (updateError) {
      console.error(`❌ [CALL NEXT] Erro ao atualizar ticket:`, updateError);
      throw updateError;
    }

    const updatedTicket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        queue: true,
        user: true,
      },
    });

    if (!updatedTicket) {
      throw new NotFoundException(
        `Ticket ${ticketId} não encontrado após atualização`,
      );
    }

    console.log(
      `✅ Fila ${queueId} atualizada: senha atual = ${updatedTicket.myCallingToken}`,
    );

    // 🚀 ENVIAR NOTIFICAÇÃO via RabbitMQ
    try {
      await this.ticketNotificationService.notifyTicketCalled({
        ticketId: updatedTicket.id,
        queueName: updatedTicket.queue.name,
        ticketNumber: updatedTicket.myCallingToken,
        clientPhone: updatedTicket.clientPhone,
        clientEmail: updatedTicket.clientEmail,
        userId: updatedTicket.userId,
      });
    } catch (error) {
      // Log erro mas não quebra o fluxo principal
      console.error('Erro ao enviar notificação:', error);
    }

    // 📱 ENVIAR NOTIFICAÇÃO TELEGRAM
    const telegramChatId = (updatedTicket as { telegramChatId?: string })
      .telegramChatId;
    if (telegramChatId && this.telegramService.isConfigured()) {
      try {
        await this.telegramService.sendTicketNotification(
          telegramChatId,
          updatedTicket.myCallingToken,
          updatedTicket.queue.name,
        );
      } catch (error) {
        console.error('Erro ao enviar notificação Telegram:', error);
      }
    }

    // 🔄 PostgreSQL Trigger já disparou notificação SSE via LISTEN/NOTIFY
    console.log(
      `📡 Notificação SSE disparada automaticamente via trigger para fila ${queueId}`,
    );

    await this.notifyWaitingTicketsUpTo3Positions(queue.id);

    return updatedTicket;
  }

  private async notifyWaitingTicketsUpTo3Positions(queueId: string) {
    try {
      const queue = await this.prisma.queue.findUnique({
        where: { id: queueId },
        include: {
          tenant: true,
        },
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

      let avgServiceTimeReal: number | null = null;

      try {
        const threeHoursAgo = new Date();
        threeHoursAgo.setHours(threeHoursAgo.getHours() - 3);

        const result = await this.prisma.$queryRaw<
          Array<{ avg_recent_service_time: number | null }>
        >`
          SELECT
            AVG((metadata->>'serviceTime')::numeric)::integer as avg_recent_service_time
          FROM queue_ticket_history
          WHERE "queueId" = ${queueId}
            AND action = 'COMPLETED'
            AND "calledAt" >= ${threeHoursAgo}
            AND metadata->>'serviceTime' IS NOT NULL
            AND (metadata->>'serviceTime')::numeric > 0
        `;

        avgServiceTimeReal = result[0]?.avg_recent_service_time;

        if (!avgServiceTimeReal || avgServiceTimeReal <= 0) {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

          const result7Days = await this.prisma.$queryRaw<
            Array<{ avg_service_time: number | null }>
          >`
            SELECT
              AVG((metadata->>'serviceTime')::numeric)::integer as avg_service_time
            FROM queue_ticket_history
            WHERE "queueId" = ${queueId}
              AND action = 'COMPLETED'
              AND "calledAt" >= ${sevenDaysAgo}
              AND metadata->>'serviceTime' IS NOT NULL
              AND (metadata->>'serviceTime')::numeric > 0
          `;

          avgServiceTimeReal = result7Days[0]?.avg_service_time;
        }
      } catch (error) {
        console.error('Erro ao calcular tempo médio real:', error);
      }

      const avgServiceTime = avgServiceTimeReal || queue.avgServiceTime || 300;
      const baseUrl =
        this.configService.get<string>('FRONTEND_URL') ||
        'http://localhost:3000';

      for (let i = 0; i < waitingTickets.length; i++) {
        const ticket = waitingTickets[i];
        const position = i + 1;
        const estimatedTimeSeconds = position * avgServiceTime;
        const estimatedMinutes = Math.ceil(estimatedTimeSeconds / 60);

        if (ticket.clientPhone && this.whatsappService.isConfigured()) {
          try {
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
                  console.log(
                    `✅ Atualização de posição WhatsApp enviada para ${ticket.clientPhone} - Senha: ${ticket.myCallingToken}`,
                  );
                } else {
                  console.error(
                    `❌ Erro ao enviar atualização de posição WhatsApp para ${ticket.clientPhone}:`,
                    result.error,
                  );
                }
              })
              .catch((error) => {
                console.error(
                  `❌ Erro ao enviar atualização de posição WhatsApp para ticket ${ticket.id}:`,
                  error,
                );
              });
          } catch (error) {
            console.error(
              `❌ Erro ao adicionar atualização de posição à fila WhatsApp para ticket ${ticket.id}:`,
              error,
            );
          }
        }
      }
    } catch (error) {
      console.error(
        'Erro ao notificar tickets aguardando sobre atualização de posição:',
        error,
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
    // Buscar todas as filas do tenant com seus tickets
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

    // Buscar estatísticas do dia
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

    // Calcular estatísticas consolidadas
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

    // Calcular tempo médio de espera
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

    // Buscar dados completos de cada fila incluindo ticket atual e anterior
    const queuesWithCurrentNumber = await Promise.all(
      queues.map(async (queue) => {
        const currentTicket = await this.prisma.ticket.findFirst({
          where: {
            queueId: queue.id,
            status: TicketStatus.CALLED,
          },
          orderBy: { calledAt: 'desc' },
          select: { myCallingToken: true },
        });

        const previousTicket = await this.prisma.ticket.findFirst({
          where: {
            queueId: queue.id,
            status: { in: [TicketStatus.COMPLETED, TicketStatus.NO_SHOW] },
          },
          orderBy: { calledAt: 'desc' },
          select: { myCallingToken: true },
        });

        const lastCalledTicket = await this.prisma.ticket.findFirst({
          where: {
            queueId: queue.id,
            calledAt: { not: null },
          },
          orderBy: { calledAt: 'desc' },
          select: { calledAt: true },
        });

        const totalProcessed = await this.prisma.ticket.count({
          where: {
            queueId: queue.id,
            status: { in: [TicketStatus.COMPLETED, TicketStatus.NO_SHOW] },
          },
        });

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
        // Ordenar por prioridade (desc) e depois por data de criação (asc)
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

    await this.ticketNotificationService.notifyTicketCalled({
      ticketId: updatedTicket.id,
      queueName: updatedTicket.queue.name,
      ticketNumber: updatedTicket.myCallingToken,
      clientPhone: updatedTicket.clientPhone,
      clientEmail: updatedTicket.clientEmail,
      userId: updatedTicket.userId,
    });

    return {
      message: 'Ticket rechamado com sucesso',
      ticket: updatedTicket,
    };
  }

  async getQueueDetailedStats(tenantId: string, queueId: string) {
    const queue = await this.prisma.queue.findFirst({
      where: { id: queueId, tenantId },
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

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let dailyStats = null;
    try {
      const statsResult = await this.prisma.$queryRaw<
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
      if (statsResult.length > 0) {
        dailyStats = statsResult[0];
      }
    } catch (error) {
      console.error('Erro ao buscar daily stats:', error);
    }

    const [
      waitingTickets,
      calledTickets,
      completedTodayTickets,
      totalTodayTickets,
      noShowTodayTickets,
      nextTicket,
    ] = await Promise.all([
      // Tickets aguardando
      this.prisma.ticket.findMany({
        where: { queueId: queue.id, status: TicketStatus.WAITING },
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      }),
      // Tickets chamados
      this.prisma.ticket.count({
        where: { queueId: queue.id, status: TicketStatus.CALLED },
      }),
      // Tickets completados hoje
      this.prisma.ticket.findMany({
        where: {
          queueId: queue.id,
          status: TicketStatus.COMPLETED,
          completedAt: { gte: today, lt: tomorrow },
        },
        select: { completedAt: true, calledAt: true },
      }),
      // Total de tickets criados hoje
      this.prisma.ticket.count({
        where: {
          queueId: queue.id,
          createdAt: { gte: today, lt: tomorrow },
        },
      }),
      // Tickets no-show hoje
      this.prisma.ticket.count({
        where: {
          queueId: queue.id,
          status: TicketStatus.NO_SHOW,
          completedAt: { gte: today, lt: tomorrow },
        },
      }),
      // Próximo ticket na fila
      this.prisma.ticket.findFirst({
        where: { queueId: queue.id, status: TicketStatus.WAITING },
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      }),
    ]);

    // Calcular próxima estimativa usando tempo médio real dos últimos atendimentos
    const nextEstimatedTime = nextTicket
      ? await this.calculateNextEstimatedTime(
          queue.id,
          waitingTickets.length,
          (queue as any).avgServiceTime || 300,
        )
      : 0;

    // Calcular taxa de conclusão (completados vs total criados hoje)
    const completionRate =
      totalTodayTickets > 0
        ? Math.round((completedTodayTickets.length / totalTodayTickets) * 100)
        : 0;

    // Usar daily stats se disponível, senão calcular em tempo real
    let avgWaitTime = dailyStats?.avgWaitTime || 0;
    let totalProcessedToday = dailyStats?.totalProcessed || 0;

    if (!dailyStats) {
      // Calcular tempo médio de espera usando queue_ticket_history
      try {
        const waitTimeResult = await this.prisma.$queryRaw<
          Array<{ avg_wait_time: number | null }>
        >`
          SELECT
            AVG((metadata->>'serviceTime')::numeric)::integer as avg_wait_time
          FROM queue_ticket_history
          WHERE "queueId" = ${queue.id}
            AND action = 'COMPLETED'
            AND DATE("calledAt") = CURRENT_DATE
            AND metadata->>'serviceTime' IS NOT NULL
            AND (metadata->>'serviceTime')::numeric > 0
        `;
        avgWaitTime = waitTimeResult[0]?.avg_wait_time || 0;
      } catch (error) {
        console.error('Erro ao calcular espera média do histórico:', error);
        avgWaitTime = this.calculateAverageWaitTime(completedTodayTickets);
      }

      // Calcular total processado hoje usando queue_ticket_history
      try {
        const processedResult = await this.prisma.$queryRaw<
          Array<{ total_processed: bigint }>
        >`
          SELECT COUNT(*)::bigint as total_processed
          FROM queue_ticket_history
          WHERE "queueId" = ${queue.id}
            AND action IN ('COMPLETED', 'NO_SHOW')
            AND DATE("calledAt") = CURRENT_DATE
        `;
        totalProcessedToday = Number(processedResult[0]?.total_processed || 0);
      } catch (error) {
        console.error('Erro ao calcular total processado do histórico:', error);
        totalProcessedToday = completedTodayTickets.length + noShowTodayTickets;
      }
    }

    // Garantir que totalProcessedToday seja calculado corretamente
    // Sempre usar a mesma fonte de dados (tabela tickets) para garantir consistência
    // totalProcessedToday = COMPLETED + NO_SHOW (apenas tickets realmente processados)
    const totalProcessedFromTickets =
      completedTodayTickets.length + noShowTodayTickets;

    // Se dailyStats existe e tem valor, usar ele (mais performático)
    // Mas se for diferente do cálculo direto, usar o cálculo direto (mais confiável)
    if (
      totalProcessedToday === 0 ||
      Math.abs(totalProcessedToday - totalProcessedFromTickets) > 0
    ) {
      totalProcessedToday = totalProcessedFromTickets;
    }

    // Calcular taxa de abandono apenas se houver tickets processados
    // Taxa de abandono = (NO_SHOW / (COMPLETED + NO_SHOW)) * 100
    // Só calcular se houver pelo menos 1 ticket processado
    let abandonmentRate = 0;
    if (totalProcessedToday > 0) {
      abandonmentRate = Math.round(
        (noShowTodayTickets / totalProcessedToday) * 100,
      );
    }

    // Determinar status da fila
    const queueStatus = this.determineQueueStatus(
      queue,
      waitingTickets.length,
      calledTickets,
    );

    return {
      queueInfo: {
        id: queue.id,
        name: queue.name,
        description: queue.description || 'Sem descrição',
        capacity: queue.capacity,
        toleranceMinutes: (queue as any).toleranceMinutes,
        avgServiceTime: (queue as any).avgServiceTime,
        status: queueStatus,
      },
      currentStats: {
        waitingCount: waitingTickets.length,
        calledCount: calledTickets,
        completedToday:
          dailyStats?.totalCompleted || completedTodayTickets.length,
        nextEstimatedTime,
        nextEstimatedTimeMinutes: Math.round(nextEstimatedTime / 60),
        completionRate,
      },
      performance: {
        avgWaitTime,
        avgWaitTimeMinutes: Math.round(avgWaitTime / 60),
        totalProcessedToday,
        abandonmentRate,
      },
      lastUpdated: new Date(),
    };
  }

  private async calculateNextEstimatedTime(
    queueId: string,
    position: number,
    avgServiceTime: number,
  ): Promise<number> {
    if (position === 0) return 0;

    try {
      const threeHoursAgo = new Date();
      threeHoursAgo.setHours(threeHoursAgo.getHours() - 3);

      const result = await this.prisma.$queryRaw<
        Array<{ avg_recent_service_time: number | null }>
      >`
        SELECT
          AVG((metadata->>'serviceTime')::numeric)::integer as avg_recent_service_time
        FROM queue_ticket_history
        WHERE "queueId" = ${queueId}
          AND action = 'COMPLETED'
          AND "calledAt" >= ${threeHoursAgo}
          AND metadata->>'serviceTime' IS NOT NULL
          AND (metadata->>'serviceTime')::numeric > 0
      `;

      const avgRecentServiceTime = result[0]?.avg_recent_service_time;

      if (avgRecentServiceTime && avgRecentServiceTime > 0) {
        return position * avgRecentServiceTime;
      }
    } catch (error) {
      console.error('Erro ao calcular tempo médio recente:', error);
    }

    return position * (avgServiceTime || 300);
  }

  private calculateAverageWaitTime(
    completedTickets: Array<{
      completedAt: Date | null;
      calledAt: Date | null;
    }>,
  ): number {
    if (completedTickets.length === 0) return 0;

    const validTickets = completedTickets.filter(
      (ticket) => ticket.calledAt && ticket.completedAt,
    );

    if (validTickets.length === 0) return 0;

    const totalWaitTime = validTickets.reduce((sum, ticket) => {
      if (!ticket.calledAt || !ticket.completedAt) return sum;
      return sum + (ticket.completedAt.getTime() - ticket.calledAt.getTime());
    }, 0);

    return Math.round(totalWaitTime / validTickets.length / 1000);
  }

  private determineQueueStatus(
    queue: any,
    waitingCount: number,
    calledCount: number,
  ): string {
    if (!queue.isActive) return 'inativa';

    // Considerar pausada se não há movimento há muito tempo
    // Aqui podemos implementar lógica mais sofisticada se necessário
    if (waitingCount === 0 && calledCount === 0) {
      return 'pausada';
    }

    return 'ativa';
  }
}
