import { Injectable, NotFoundException } from '@nestjs/common';
import { TicketStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) {}

  async findClientTickets(phone?: string, email?: string, userId?: string) {
    const whereCondition: any = {
      status: {
        in: [TicketStatus.WAITING, TicketStatus.CALLED],
      },
    };

    // Priorizar busca por userId (se usuário logado com Google)
    if (userId) {
      whereCondition.userId = userId;
    } else if (phone && email) {
      // Buscar por telefone OU email
      whereCondition.OR = [{ clientPhone: phone }, { clientEmail: email }];
    } else if (phone) {
      whereCondition.clientPhone = phone;
    } else if (email) {
      whereCondition.clientEmail = email;
    }

    const tickets = await this.prisma.ticket.findMany({
      where: whereCondition,
      include: {
        queue: {
          include: {
            tenant: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });

    if (tickets.length === 0) {
      throw new NotFoundException(
        'Nenhuma senha ativa encontrada para este telefone/email',
      );
    }

    // Calcular posição para cada ticket
    const ticketsWithPosition = await Promise.all(
      tickets.map(async (ticket) => {
        const position = await this.calculateTicketPosition(
          ticket.queueId,
          ticket.id,
        );
        const currentNumber = await this.getCurrentQueueNumber(ticket.queueId);

        return {
          id: ticket.id,
          myCallingToken: ticket.myCallingToken,
          status: ticket.status,
          priority: ticket.priority,
          position,
          estimatedTime: await this.calculateUpdatedEstimatedTime(
            ticket,
            position,
          ),
          createdAt: ticket.createdAt,
          calledAt: ticket.calledAt,
          queue: {
            id: ticket.queue.id,
            name: ticket.queue.name,
            queueType: ticket.queue.queueType,
            currentNumber,
            avgServiceTime: ticket.queue.avgServiceTime,
            tenant: ticket.queue.tenant,
          },
        };
      }),
    );

    return {
      client: {
        identifier: userId ? `user-${userId}` : phone || email,
        totalActiveTickets: tickets.length,
      },
      tickets: ticketsWithPosition,
    };
  }

  async getClientDashboard(phone?: string, email?: string, userId?: string) {
    const clientTickets = await this.findClientTickets(phone, email, userId);

    // Agrupar por estabelecimento
    const ticketsByEstablishment = clientTickets.tickets.reduce(
      (acc, ticket) => {
        const tenantId = ticket.queue.tenant.id;
        if (!acc[tenantId]) {
          acc[tenantId] = {
            tenant: ticket.queue.tenant,
            queues: {},
          };
        }

        const queueId = ticket.queue.id;
        if (!acc[tenantId].queues[queueId]) {
          acc[tenantId].queues[queueId] = {
            queue: ticket.queue,
            tickets: [],
          };
        }

        acc[tenantId].queues[queueId].tickets.push(ticket);
        return acc;
      },
      {} as any,
    );

    // Calcular métricas consolidadas
    const totalWaiting = clientTickets.tickets.filter(
      (t) => t.status === TicketStatus.WAITING,
    ).length;
    const totalCalled = clientTickets.tickets.filter(
      (t) => t.status === TicketStatus.CALLED,
    ).length;
    const avgWaitTime =
      clientTickets.tickets.reduce(
        (sum, t) => sum + (t.estimatedTime || 0),
        0,
      ) / clientTickets.tickets.length;

    // Próxima chamada estimada (menor tempo estimado)
    const nextCallEstimate = Math.min(
      ...clientTickets.tickets
        .filter((t) => t.status === TicketStatus.WAITING)
        .map((t) => t.estimatedTime || Infinity),
    );

    // Métricas em tempo real
    const realTimeMetrics = await this.calculateRealTimeMetrics(
      clientTickets.tickets,
    );

    return {
      client: clientTickets.client,
      summary: {
        totalWaiting,
        totalCalled,
        avgWaitTime: Math.round(avgWaitTime),
        nextCallEstimate:
          nextCallEstimate === Infinity ? null : nextCallEstimate,
        establishmentsCount: Object.keys(ticketsByEstablishment).length,
      },
      tickets: Object.values(ticketsByEstablishment),
      realTimeMetrics,
    };
  }

  async getQueueRealTimeMetrics(queueId: string) {
    const queue = await this.prisma.queue.findUnique({
      where: { id: queueId },
      include: {
        tickets: {
          where: {
            status: TicketStatus.CALLED,
            calledAt: {
              gte: new Date(Date.now() - 3600000), // Última hora
            },
          },
          orderBy: { calledAt: 'desc' },
        },
      },
    });

    if (!queue) {
      throw new NotFoundException('Fila não encontrada');
    }

    const currentNumber = await this.getCurrentQueueNumber(queueId);
    const recentCalls = queue.tickets;

    // Calcular velocidade de atendimento (chamadas por hora)
    const serviceSpeed = recentCalls.length; // chamadas na última hora

    // Tempo desde última chamada
    const lastCall = recentCalls[0];
    const timeSinceLastCall = lastCall
      ? Math.floor((Date.now() - new Date(lastCall.calledAt).getTime()) / 1000)
      : null;

    // Intervalo médio entre chamadas
    let avgCallInterval = queue.avgServiceTime || 300;
    if (recentCalls.length > 1) {
      const intervals = [];
      for (let i = 0; i < recentCalls.length - 1; i++) {
        const interval =
          new Date(recentCalls[i].calledAt).getTime() -
          new Date(recentCalls[i + 1].calledAt).getTime();
        intervals.push(interval / 1000); // converter para segundos
      }
      avgCallInterval =
        intervals.reduce((sum, interval) => sum + interval, 0) /
        intervals.length;
    }

    // Tendência de velocidade
    const trendDirection = this.calculateTrend(recentCalls);

    // Previsões
    const waitingCount = await this.prisma.ticket.count({
      where: {
        queueId,
        status: TicketStatus.WAITING,
      },
    });

    const nextCallIn =
      timeSinceLastCall && avgCallInterval
        ? Math.max(0, avgCallInterval - timeSinceLastCall)
        : avgCallInterval;

    const queueClearTime = waitingCount * avgCallInterval;

    return {
      queue: {
        id: queue.id,
        name: queue.name,
        currentNumber,
      },
      currentMetrics: {
        serviceSpeed,
        timeSinceLastCall,
        avgCallInterval: Math.round(avgCallInterval),
        trendDirection,
      },
      predictions: {
        nextCallIn: Math.round(nextCallIn),
        queueClearTime: Math.round(queueClearTime),
      },
    };
  }

  private async calculateTicketPosition(
    queueId: string,
    ticketId: string,
  ): Promise<number> {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket || ticket.status !== TicketStatus.WAITING) {
      return 0;
    }

    const waitingTickets = await this.prisma.ticket.findMany({
      where: {
        queueId,
        status: TicketStatus.WAITING,
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });

    const position = waitingTickets.findIndex((t) => t.id === ticketId) + 1;
    return position > 0 ? position : 0;
  }

  private async getCurrentQueueNumber(queueId: string): Promise<string> {
    const lastCalled = await this.prisma.ticket.findFirst({
      where: {
        queueId,
        status: TicketStatus.CALLED,
      },
      orderBy: { calledAt: 'desc' },
    });

    return lastCalled?.myCallingToken || 'Aguardando...';
  }

  private async calculateUpdatedEstimatedTime(
    ticket: any,
    position: number,
  ): Promise<number> {
    if (ticket.status === TicketStatus.CALLED) {
      return 0;
    }

    if (position === 0) return 0;

    const queue =
      ticket.queue ||
      (await this.prisma.queue.findUnique({
        where: { id: ticket.queueId },
      }));

    if (!queue) {
      return position * 600;
    }

    try {
      const threeHoursAgo = new Date();
      threeHoursAgo.setHours(threeHoursAgo.getHours() - 3);

      const result = await this.prisma.$queryRaw<
        Array<{ avg_recent_service_time: number | null }>
      >`
        SELECT
          AVG((metadata->>'serviceTime')::numeric)::integer as avg_recent_service_time
        FROM queue_ticket_history
        WHERE "queueId" = ${ticket.queueId}
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

    return position * (queue?.avgServiceTime || 600);
  }

  private async calculateRealTimeMetrics(tickets: any[]) {
    // Calcular métricas baseadas em todas as filas do cliente
    const queueIds = [
      ...new Set(tickets.map((t) => t.queue?.id).filter(Boolean)),
    ];

    if (queueIds.length === 0) {
      return {
        currentServiceSpeed: 0,
        avgTimeSinceLastCall: 0,
        trendDirection: 'stable',
      };
    }

    let totalServiceSpeed = 0;
    let avgTimeSinceLastCall = 0;
    const trendCounts = { accelerating: 0, stable: 0, slowing: 0 };

    for (const queueId of queueIds) {
      if (!queueId) continue; // Pular se queueId for undefined

      try {
        const queueMetrics = await this.getQueueRealTimeMetrics(queueId);
        totalServiceSpeed += queueMetrics.currentMetrics.serviceSpeed;

        if (queueMetrics.currentMetrics.timeSinceLastCall) {
          avgTimeSinceLastCall += queueMetrics.currentMetrics.timeSinceLastCall;
        }

        trendCounts[
          queueMetrics.currentMetrics.trendDirection as keyof typeof trendCounts
        ]++;
      } catch (error) {
        // Log do erro mas continuar com outras filas
        console.warn(`Erro ao calcular métricas para fila ${queueId}:`, error);
      }
    }

    // Tendência geral
    const dominantTrend = Object.entries(trendCounts).reduce((a, b) =>
      trendCounts[a[0] as keyof typeof trendCounts] >
      trendCounts[b[0] as keyof typeof trendCounts]
        ? a
        : b,
    )[0];

    return {
      currentServiceSpeed: Math.round(totalServiceSpeed / queueIds.length),
      avgTimeSinceLastCall: Math.round(avgTimeSinceLastCall / queueIds.length),
      trendDirection: dominantTrend,
    };
  }

  private calculateTrend(
    recentCalls: any[],
  ): 'accelerating' | 'stable' | 'slowing' {
    if (recentCalls.length < 3) {
      return 'stable';
    }

    // Comparar intervalos recentes com anteriores
    const recent = recentCalls.slice(0, Math.floor(recentCalls.length / 2));
    const older = recentCalls.slice(Math.floor(recentCalls.length / 2));

    const recentAvgInterval = this.calculateAvgInterval(recent);
    const olderAvgInterval = this.calculateAvgInterval(older);

    const change = (recentAvgInterval - olderAvgInterval) / olderAvgInterval;

    if (change < -0.1) return 'accelerating'; // 10% mais rápido
    if (change > 0.1) return 'slowing'; // 10% mais lento
    return 'stable';
  }

  private calculateAvgInterval(calls: any[]): number {
    if (calls.length < 2) return 0;

    const intervals = [];
    for (let i = 0; i < calls.length - 1; i++) {
      const interval =
        new Date(calls[i].calledAt).getTime() -
        new Date(calls[i + 1].calledAt).getTime();
      intervals.push(interval);
    }

    return (
      intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length
    );
  }
}
