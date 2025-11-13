import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Get } from './core/decorators';
import { PostgresListenerService } from './postgres-listener.service';

interface TicketNotification {
  id: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  queueId: string;
  timestamp: number;
}

interface TicketStreamQuery {
  queueId?: string;
  status?: string;
  userId?: string;
  watchId?: string;
}

@Injectable()
export class TicketRealtimeOptimizedController {
  private readonly logger = new Logger(TicketRealtimeOptimizedController.name);
  private readonly activeStreams = new Map<
    string,
    ReadableStreamDefaultController
  >();
  private readonly ticketWatchers = new Map<string, Set<string>>(); // queueId -> Set<streamId>
  private readonly specificTicketWatchers = new Map<string, Set<string>>(); // ticketId -> Set<streamId>
  private readonly processedNotifications = new Map<string, number>(); // notificationKey -> timestamp

  constructor(
    private readonly postgresListener: PostgresListenerService | null,
    private readonly prisma: PrismaService,
  ) {
    if (this.postgresListener) {
      this.setupNotificationHandling();
    }
  }

  @Get('/api/rt/tickets/stream')
  async streamTickets(req: Request): Promise<Response> {
    console.log(
      '🔍 [TICKET CONTROLLER] Stream de Tickets solicitado:',
      req.url,
    );
    const url = new URL(req.url);
    const queueId = url.searchParams.get('queueId');
    const status = url.searchParams.get('status');
    const userId = url.searchParams.get('userId');
    const watchId =
      url.searchParams.get('watchId') ||
      `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const query: TicketStreamQuery = {
      queueId: queueId || undefined,
      status: status || undefined,
      userId: userId || undefined,
      watchId,
    };
    console.log('🔍 [TICKET CONTROLLER] Query:', query);

    this.logger.log(
      `🎫 Iniciando stream otimizado de tickets para watchId: ${watchId}, query:`,
      query,
    );

    const stream = new ReadableStream({
      start: async (controller) => {
        this.activeStreams.set(watchId, controller);
        console.log('🔍 [TICKET CONTROLLER] Stream iniciado:', watchId);
        console.log('🔍 [TICKET CONTROLLER] QueueId:', queueId);

        if (queueId) {
          if (!this.ticketWatchers.has(queueId)) {
            this.ticketWatchers.set(queueId, new Set());
          }
          this.ticketWatchers.get(queueId)!.add(watchId);
        }

        // Enviar evento de conexão estabelecida
        this.sendEvent(controller, {
          event: 'stream_opened',
          watchId,
          query,
          timestamp: new Date().toISOString(),
        });

        // 🎯 Se tiver queueId, enviar estado inicial da fila imediatamente
        if (queueId && this.postgresListener) {
          try {
            const queueState = await this.getQueueStateData(queueId);
            console.log(
              '🎯 [TICKET CONTROLLER] Enviando estado inicial da fila:',
              queueState,
            );

            this.logger.debug(
              `📤 Enviando queue_state para watchId ${watchId}:`,
              JSON.stringify(queueState, null, 2),
            );
            this.sendEvent(controller, {
              event: 'queue_state',
              queueId,
              data: queueState,
              timestamp: new Date().toISOString(),
            });
          } catch (error) {
            this.logger.error('Erro ao buscar estado inicial da fila:', error);
          }
        }

        (controller as any)._cleanup = () => {
          this.activeStreams.delete(watchId);
          if (queueId) {
            this.ticketWatchers.get(queueId)?.delete(watchId);
          }
        };
      },
      cancel: () => {
        const controller = this.activeStreams.get(watchId);
        if (controller) {
          (controller as any)._cleanup?.();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'content-type': 'text/event-stream; charset=utf-8',
        'cache-control': 'no-cache, no-transform',
        connection: 'keep-alive',
        'x-accel-buffering': 'no',
        'access-control-allow-origin': '*',
        'access-control-allow-headers': 'cache-control',
      },
    });
  }

  @Get('/api/rt/tickets/:ticketId/stream')
  async streamSpecificTicket(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const ticketId = url.pathname.split('/')[4]; // /api/rt/tickets/:ticketId/stream
    const watchId =
      url.searchParams.get('watchId') ||
      `ticket_${ticketId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    if (!ticketId) {
      return new Response(
        JSON.stringify({ error: 'Ticket ID é obrigatório' }),
        {
          status: 400,
          headers: { 'content-type': 'application/json' },
        },
      );
    }

    this.logger.log(`🎫 Iniciando stream para ticket específico: ${ticketId}`);

    const stream = new ReadableStream({
      start: (controller) => {
        this.activeStreams.set(watchId, controller);

        if (!this.specificTicketWatchers.has(ticketId)) {
          this.specificTicketWatchers.set(ticketId, new Set());
        }
        this.specificTicketWatchers.get(ticketId)!.add(watchId);

        this.sendEvent(controller, {
          event: 'ticket_watch_started',
          watchId,
          ticketId,
          timestamp: new Date().toISOString(),
        });

        (controller as any)._cleanup = () => {
          this.activeStreams.delete(watchId);
          this.specificTicketWatchers.get(ticketId)?.delete(watchId);
        };
      },
      cancel: () => {
        const controller = this.activeStreams.get(watchId);
        if (controller) {
          (controller as any)._cleanup?.();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'content-type': 'text/event-stream; charset=utf-8',
        'cache-control': 'no-cache, no-transform',
        connection: 'keep-alive',
        'x-accel-buffering': 'no',
        'access-control-allow-origin': '*',
      },
    });
  }

  @Get('/api/rt/tickets/:ticketId')
  async getTicket(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const ticketId = url.pathname.split('/')[4];

    if (!ticketId) {
      return new Response(
        JSON.stringify({ error: 'Ticket ID é obrigatório' }),
        {
          status: 400,
          headers: { 'content-type': 'application/json' },
        },
      );
    }

    try {
      if (!this.postgresListener) {
        return new Response(
          JSON.stringify({ error: 'PostgresListenerService não disponível' }),
          { status: 503, headers: { 'content-type': 'application/json' } },
        );
      }

      const ticket = await this.postgresListener.getTicketById(ticketId);

      if (!ticket) {
        return new Response(
          JSON.stringify({ error: 'Ticket não encontrado' }),
          {
            status: 404,
            headers: { 'content-type': 'application/json' },
          },
        );
      }

      return new Response(JSON.stringify(ticket), {
        headers: { 'content-type': 'application/json' },
      });
    } catch (error) {
      this.logger.error('Erro ao buscar ticket:', error);
      return new Response(
        JSON.stringify({
          error: 'Erro interno do servidor',
          message: error instanceof Error ? error.message : 'Erro desconhecido',
        }),
        {
          status: 500,
          headers: { 'content-type': 'application/json' },
        },
      );
    }
  }

  @Get('/api/rt/tickets/queue/:queueId')
  async getTicketsByQueue(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const queueId = url.pathname.split('/')[5];
    const status = url.searchParams.get('status');

    if (!queueId) {
      return new Response(JSON.stringify({ error: 'Queue ID é obrigatório' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }

    try {
      if (!this.postgresListener) {
        return new Response(
          JSON.stringify({ error: 'PostgresListenerService não disponível' }),
          { status: 503, headers: { 'content-type': 'application/json' } },
        );
      }

      const tickets = await this.postgresListener.getTicketsByQueue(
        queueId,
        status || undefined,
      );

      return new Response(
        JSON.stringify({
          queueId,
          status: status || 'all',
          tickets,
          count: tickets.length,
          timestamp: new Date().toISOString(),
        }),
        {
          headers: { 'content-type': 'application/json' },
        },
      );
    } catch (error) {
      this.logger.error('Erro ao buscar tickets da fila:', error);
      return new Response(
        JSON.stringify({
          error: 'Erro interno do servidor',
          message: error instanceof Error ? error.message : 'Erro desconhecido',
        }),
        {
          status: 500,
          headers: { 'content-type': 'application/json' },
        },
      );
    }
  }

  @Get('/api/rt/tickets/stats')
  async getStats(): Promise<Response> {
    try {
      const stats = {
        streams: this.getStreamStats(),
        postgres: this.postgresListener?.getStats() || {
          error: 'PostgresListenerService não disponível',
        },
        timestamp: new Date().toISOString(),
      };

      return new Response(JSON.stringify(stats), {
        headers: { 'content-type': 'application/json' },
      });
    } catch (error) {
      this.logger.error('Erro ao obter estatísticas:', error);
      return new Response(
        JSON.stringify({
          error: 'Erro interno do servidor',
          message: error instanceof Error ? error.message : 'Erro desconhecido',
        }),
        {
          status: 500,
          headers: { 'content-type': 'application/json' },
        },
      );
    }
  }

  @Get('/api/rt/queues/:queueId/state')
  async getQueueState(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const queueId = url.pathname.split('/')[5];
    console.log('🔍 [TICKET CONTROLLER] QueueId:', queueId);

    if (!queueId) {
      return new Response(JSON.stringify({ error: 'Queue ID é obrigatório' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }

    try {
      if (!this.postgresListener) {
        return new Response(
          JSON.stringify({ error: 'PostgresListenerService não disponível' }),
          { status: 503, headers: { 'content-type': 'application/json' } },
        );
      }

      const tickets = await this.postgresListener.getTicketsByQueue(queueId);
      console.log('🔍 [TICKET CONTROLLER] Tickets:', tickets);

      const currentTicket = tickets.find((t) => t.status === 'CALLED');
      console.log('🔍 [TICKET CONTROLLER] Current Ticket:', currentTicket);
      const waitingTickets = tickets
        .filter((t) => t.status === 'WAITING')
        .sort((a, b) => {
          if (a.priority !== b.priority) {
            return b.priority - a.priority;
          }
          return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        });
      console.log('🔍 [TICKET CONTROLLER] Waiting Tickets:', waitingTickets);
      const completedTickets = tickets
        .filter((t) => t.status === 'COMPLETED')
        .sort(
          (a, b) =>
            new Date(b.completedAt).getTime() -
            new Date(a.completedAt).getTime(),
        )
        .slice(0, 10);

      const nextTickets = waitingTickets.slice(0, 5);
      console.log('🔍 [TICKET CONTROLLER] Next Tickets:', nextTickets);
      const lastCalledTickets = tickets
        .filter((t) => t.status === 'CALLED' && t.calledAt)
        .sort(
          (a, b) =>
            new Date(b.calledAt).getTime() - new Date(a.calledAt).getTime(),
        )
        .slice(0, 5);

      console.log(
        '🔍 [TICKET CONTROLLER] Last Called Tickets:',
        lastCalledTickets,
      );

      const queueState = {
        queueId,
        currentTicket: currentTicket
          ? {
              id: currentTicket.id,
              myCallingToken: currentTicket.myCallingToken,
              status: currentTicket.status,
              calledAt: currentTicket.calledAt,
              clientName: currentTicket.clientName,
              clientPhone: currentTicket.clientPhone,
              priority: currentTicket.priority,
            }
          : null,
        nextTickets: nextTickets.map((t) => ({
          id: t.id,
          myCallingToken: t.myCallingToken,
          status: t.status,
          createdAt: t.createdAt,
          clientName: t.clientName,
          clientPhone: t.clientPhone,
          priority: t.priority,
          estimatedTime: t.estimatedTime,
        })),
        lastCalledTickets: lastCalledTickets.map((t) => ({
          id: t.id,
          myCallingToken: t.myCallingToken,
          status: t.status,
          calledAt: t.calledAt,
          clientName: t.clientName,
          clientPhone: t.clientPhone,
          priority: t.priority,
        })),
        completedTickets: completedTickets.map((t) => ({
          id: t.id,
          myCallingToken: t.myCallingToken,
          status: t.status,
          completedAt: t.completedAt,
          clientName: t.clientName,
          clientPhone: t.clientPhone,
          priority: t.priority,
        })),
        statistics: {
          totalWaiting: waitingTickets.length,
          totalCalled: tickets.filter((t) => t.status === 'CALLED').length,
          totalCompleted: tickets.filter((t) => t.status === 'COMPLETED')
            .length,
          totalTickets: tickets.length,
        },
        timestamp: new Date().toISOString(),
      };

      console.log('🔍 [TICKET CONTROLLER] Queue State:', queueState);

      return new Response(JSON.stringify(queueState), {
        headers: { 'content-type': 'application/json' },
      });
    } catch (error) {
      this.logger.error('Erro ao obter estado da fila:', error);
      return new Response(
        JSON.stringify({
          error: 'Erro interno do servidor',
          message: error instanceof Error ? error.message : 'Erro desconhecido',
        }),
        {
          status: 500,
          headers: { 'content-type': 'application/json' },
        },
      );
    }
  }

  /**
   * Buscar estado completo da fila (ticket atual, anterior, próximos)
   */
  private async getQueueStateData(queueId: string): Promise<any> {
    if (!this.postgresListener) {
      throw new Error('PostgresListenerService não disponível');
    }

    // Buscar informações da fila do banco
    const queueData = await this.postgresListener.getQueueById(queueId);
    if (!queueData) {
      throw new Error('Fila não encontrada');
    }

    // Buscar todos os tickets da fila
    const tickets = await this.postgresListener.getTicketsByQueue(queueId);

    // Buscar ticket atual (status CALLED mais recente)
    const currentTicketData = tickets
      .filter((t) => t.status === 'CALLED' && t.calledAt)
      .sort(
        (a, b) =>
          new Date(b.calledAt).getTime() - new Date(a.calledAt).getTime(),
      )[0];

    let currentTicket = null;
    if (currentTicketData) {
      currentTicket = {
        id: currentTicketData.id,
        myCallingToken: currentTicketData.myCallingToken,
        status: currentTicketData.status,
        calledAt: currentTicketData.calledAt,
        clientName: currentTicketData.clientName,
        clientPhone: currentTicketData.clientPhone,
        priority: currentTicketData.priority,
      };
    }

    // Buscar ticket anterior (mais recente entre COMPLETED ou NO_SHOW)
    const previousTicketData = tickets
      .filter(
        (t) =>
          (t.status === 'COMPLETED' || t.status === 'NO_SHOW') && t.calledAt,
      )
      .sort(
        (a, b) =>
          new Date(b.calledAt).getTime() - new Date(a.calledAt).getTime(),
      )[0];

    let previousTicket = null;
    if (previousTicketData) {
      previousTicket = {
        id: previousTicketData.id,
        myCallingToken: previousTicketData.myCallingToken,
        status: previousTicketData.status,
        calledAt: previousTicketData.calledAt,
        clientName: previousTicketData.clientName,
        clientPhone: previousTicketData.clientPhone,
        priority: previousTicketData.priority,
      };
    }

    // Buscar próximos tickets (ordenados por prioridade e data)
    const waitingTickets = tickets
      .filter((t) => t.status === 'WAITING')
      .sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }
        return (
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      });

    const nextTickets = waitingTickets.slice(0, 5).map((t) => ({
      id: t.id,
      myCallingToken: t.myCallingToken,
      status: t.status,
      createdAt: t.createdAt,
      clientName: t.clientName,
      clientPhone: t.clientPhone,
      priority: t.priority,
      estimatedTime: t.estimatedTime,
    }));

    // Últimos tickets chamados
    const lastCalledTickets = tickets
      .filter((t) => t.status === 'CALLED' && t.calledAt)
      .sort(
        (a, b) =>
          new Date(b.calledAt).getTime() - new Date(a.calledAt).getTime(),
      )
      .slice(0, 5)
      .map((t) => ({
        id: t.id,
        myCallingToken: t.myCallingToken,
        status: t.status,
        calledAt: t.calledAt,
        clientName: t.clientName,
        clientPhone: t.clientPhone,
        priority: t.priority,
      }));

    const nextTicket = nextTickets.length > 0 ? nextTickets[0] : null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let completedTodayCount = 0;
    let noShowTodayCount = 0;
    let totalProcessedToday = 0;
    let avgWaitTime = 0;
    let nextEstimatedTime = 0;

    try {
      const completedToday = tickets.filter(
        (t) =>
          t.status === 'COMPLETED' &&
          t.completedAt &&
          new Date(t.completedAt) >= today &&
          new Date(t.completedAt) < tomorrow,
      );
      completedTodayCount = completedToday.length;

      const noShowToday = tickets.filter(
        (t) =>
          t.status === 'NO_SHOW' &&
          t.completedAt &&
          new Date(t.completedAt) >= today &&
          new Date(t.completedAt) < tomorrow,
      );
      noShowTodayCount = noShowToday.length;

      totalProcessedToday = completedTodayCount + noShowTodayCount;

      if (completedToday.length > 0) {
        const validTickets = completedToday.filter(
          (t) => t.calledAt && t.completedAt,
        );
        if (validTickets.length > 0) {
          const totalWaitTime = validTickets.reduce((sum, ticket) => {
            if (!ticket.calledAt || !ticket.completedAt) return sum;
            return (
              sum +
              (new Date(ticket.completedAt).getTime() -
                new Date(ticket.calledAt).getTime()) /
                1000
            );
          }, 0);
          avgWaitTime = Math.round(totalWaitTime / validTickets.length);
        }
      }

      if (waitingTickets.length > 0) {
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
            nextEstimatedTime = waitingTickets.length * avgRecentServiceTime;
          } else {
            const queue = await this.postgresListener.getQueueById(queueId);
            nextEstimatedTime =
              waitingTickets.length * (queue?.avgServiceTime || 600);
          }
        } catch (error) {
          console.error('Erro ao calcular próxima estimativa:', error);
        }
      }

      const totalTodayTickets = tickets.filter(
        (t) =>
          t.createdAt &&
          new Date(t.createdAt) >= today &&
          new Date(t.createdAt) < tomorrow,
      ).length;

      const completionRate =
        totalTodayTickets > 0
          ? Math.round((completedTodayCount / totalTodayTickets) * 100)
          : 0;

      const abandonmentRate =
        totalProcessedToday > 0
          ? Math.round((noShowTodayCount / totalProcessedToday) * 100)
          : 0;

      return {
        queueId,
        queueName: queueData.name,
        currentTicket: currentTicket || null,
        previousTicket: previousTicket || null,
        nextTicket,
        nextTickets,
        lastCalledTickets,
        statistics: {
          totalWaiting: waitingTickets.length,
          totalCalled: tickets.filter((t) => t.status === 'CALLED').length,
          totalCompleted: tickets.filter((t) => t.status === 'COMPLETED')
            .length,
          totalTickets: tickets.length,
          completedToday: completedTodayCount,
          noShowToday: noShowTodayCount,
          totalProcessedToday,
          avgWaitTime,
          avgWaitTimeMinutes: Math.round(avgWaitTime / 60),
          nextEstimatedTime,
          nextEstimatedTimeMinutes: Math.round(nextEstimatedTime / 60),
          completionRate,
          abandonmentRate,
        },
      };
    } catch (error) {
      console.error('Erro ao calcular estatísticas:', error);
      return {
        queueId,
        queueName: queueData.name,
        currentTicket: currentTicket || null,
        previousTicket: previousTicket || null,
        nextTicket,
        nextTickets,
        lastCalledTickets,
        statistics: {
          totalWaiting: waitingTickets.length,
          totalCalled: tickets.filter((t) => t.status === 'CALLED').length,
          totalCompleted: tickets.filter((t) => t.status === 'COMPLETED')
            .length,
          totalTickets: tickets.length,
          completedToday: 0,
          noShowToday: 0,
          totalProcessedToday: 0,
          avgWaitTime: 0,
          avgWaitTimeMinutes: 0,
          nextEstimatedTime: 0,
          nextEstimatedTimeMinutes: 0,
          completionRate: 0,
          abandonmentRate: 0,
        },
      };
    }
  }

  private setupNotificationHandling(): void {
    if (!this.postgresListener) {
      this.logger.warn(
        '⚠️ PostgresListenerService não disponível - notificações em tempo real desabilitadas',
      );
      return;
    }

    this.logger.log('🔍 Configurando tratamento de notificações PostgreSQL');
    this.postgresListener.addChangeListener((notification) => {
      this.handleTicketNotification(notification);
    });
  }

  private async handleTicketNotification(
    notification: TicketNotification,
  ): Promise<void> {
    const notificationKey = `${notification.id}-${notification.action}-${notification.timestamp}`;
    const now = Date.now();
    const lastProcessed = this.processedNotifications.get(notificationKey);

    if (lastProcessed && now - lastProcessed < 1000) {
      this.logger.debug(
        `⏭️ Notificação duplicada ignorada: ${notificationKey}`,
      );
      return;
    }

    this.processedNotifications.set(notificationKey, now);

    setTimeout(() => {
      this.processedNotifications.delete(notificationKey);
    }, 5000);

    this.logger.debug(
      `🎫 Processando notificação: ${notification.action} ticket ${notification.id}`,
    );

    // Notificar streams gerais
    for (const [watchId, controller] of this.activeStreams.entries()) {
      try {
        this.sendEvent(controller, {
          event: 'ticket_notification',
          data: {
            id: notification.id,
            action: notification.action,
            queueId: notification.queueId,
            timestamp: new Date(notification.timestamp * 1000).toISOString(),
          },
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        this.logger.error(`Erro ao notificar stream ${watchId}:`, error);
        this.activeStreams.delete(watchId);
      }
    }

    // Notificar watchers da fila específica com estado completo
    if (this.ticketWatchers.has(notification.queueId)) {
      const queueWatchers = this.ticketWatchers.get(notification.queueId)!;

      let queueState = null;
      try {
        queueState = await this.getQueueStateData(notification.queueId);
      } catch (error) {
        this.logger.error(
          `Erro ao buscar estado da fila ${notification.queueId}:`,
          error,
        );
      }

      for (const watchId of queueWatchers) {
        const controller = this.activeStreams.get(watchId);
        if (controller) {
          try {
            this.sendEvent(controller, {
              event: 'queue_ticket_notification',
              queueId: notification.queueId,
              data: {
                id: notification.id,
                action: notification.action,
                timestamp: new Date(
                  notification.timestamp * 1000,
                ).toISOString(),
              },
              timestamp: new Date().toISOString(),
            });

            if (queueState) {
              this.logger.debug(
                `📤 Enviando queue_state atualizado para watchId ${watchId} após notificação ${notification.action}:`,
                JSON.stringify(queueState, null, 2),
              );
              this.sendEvent(controller, {
                event: 'queue_state',
                queueId: notification.queueId,
                data: queueState,
                timestamp: new Date().toISOString(),
              });
            }
          } catch (error) {
            this.logger.error(
              `Erro ao notificar watcher da fila ${watchId}:`,
              error,
            );
            this.activeStreams.delete(watchId);
            queueWatchers.delete(watchId);
          }
        }
      }
    }

    // Notificar watchers do ticket específico
    if (this.specificTicketWatchers.has(notification.id)) {
      const ticketWatchers = this.specificTicketWatchers.get(notification.id)!;
      for (const watchId of ticketWatchers) {
        const controller = this.activeStreams.get(watchId);
        if (controller) {
          try {
            this.sendEvent(controller, {
              event: 'ticket_specific_notification',
              ticketId: notification.id,
              data: {
                id: notification.id,
                action: notification.action,
                queueId: notification.queueId,
                timestamp: new Date(
                  notification.timestamp * 1000,
                ).toISOString(),
              },
              timestamp: new Date().toISOString(),
            });
          } catch (error) {
            this.logger.error(
              `Erro ao notificar watcher do ticket ${watchId}:`,
              error,
            );
            this.activeStreams.delete(watchId);
            ticketWatchers.delete(watchId);
          }
        }
      }
    }
  }

  private sendEvent(
    controller: ReadableStreamDefaultController,
    data: any,
  ): void {
    try {
      const eventData = `data: ${JSON.stringify(data)}\n\n`;
      if (data.event === 'queue_state') {
        this.logger.debug(
          `📡 Enviando SSE queue_state: ${eventData.substring(0, 200)}...`,
        );
      }
      controller.enqueue(new TextEncoder().encode(eventData));
    } catch (error) {
      this.logger.error('Erro ao enviar evento SSE:', error);
    }
  }

  getActiveStreamsCount(): number {
    return this.activeStreams.size;
  }

  getQueueWatchersCount(queueId: string): number {
    return this.ticketWatchers.get(queueId)?.size || 0;
  }

  getTicketWatchersCount(ticketId: string): number {
    return this.specificTicketWatchers.get(ticketId)?.size || 0;
  }

  getStreamStats(): {
    activeStreams: number;
    queueWatchers: Record<string, number>;
    ticketWatchers: Record<string, number>;
    totalQueueWatchers: number;
    totalTicketWatchers: number;
  } {
    const queueWatchers: Record<string, number> = {};
    const ticketWatchers: Record<string, number> = {};
    let totalQueueWatchers = 0;
    let totalTicketWatchers = 0;

    for (const [queueId, watchers] of this.ticketWatchers.entries()) {
      queueWatchers[queueId] = watchers.size;
      totalQueueWatchers += watchers.size;
    }

    for (const [ticketId, watchers] of this.specificTicketWatchers.entries()) {
      ticketWatchers[ticketId] = watchers.size;
      totalTicketWatchers += watchers.size;
    }

    return {
      activeStreams: this.activeStreams.size,
      queueWatchers,
      ticketWatchers,
      totalQueueWatchers,
      totalTicketWatchers,
    };
  }
}
