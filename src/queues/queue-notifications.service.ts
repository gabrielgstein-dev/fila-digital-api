import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IgniterService } from '../rt/igniter.service';

@Injectable()
export class QueueNotificationsService {
  private readonly logger = new Logger(QueueNotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly igniterService: IgniterService,
  ) {}

  /**
   * Notifica quando um novo ticket é chamado em uma fila
   */
  async notifyTicketCalled(
    queueId: string,
    ticketData: {
      ticketId: string;
      myCallingToken: string;
      position: number;
      tenantId: string;
    },
  ): Promise<void> {
    try {
      // Buscar informações da fila
      const queue = await this.prisma.queue.findUnique({
        where: { id: queueId },
        select: {
          name: true,
          queueType: true,
          avgServiceTime: true,
          capacity: true,
        },
      });

      if (!queue) {
        this.logger.warn(`Fila ${queueId} não encontrada`);
        return;
      }

      const waitingTicketsCount = await this.prisma.ticket.count({
        where: {
          queueId,
          status: { in: ['WAITING', 'CALLED'] },
        },
      });

      const queueLength = waitingTicketsCount;
      const estimatedWait = this.calculateEstimatedWait(
        queueLength,
        queue.avgServiceTime,
      );

      // Notificar via Igniter sobre o ticket chamado
      await this.igniterService.notifyQueueTicketChange(queueId, {
        currentTicket: ticketData.myCallingToken,
        ticketId: ticketData.ticketId,
        callingNumber: ticketData.myCallingToken,
        queueName: queue.name,
        position: ticketData.position,
        estimatedWait,
      });

      // Atualizar posições de todos os usuários na fila
      await this.updateAllUserPositions(queueId);

      this.logger.log(
        `🔔 Notificação de ticket chamado enviada - Fila: ${queue.name}, Ticket: ${ticketData.myCallingToken}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao notificar ticket chamado na fila ${queueId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Notifica quando o status de uma fila muda
   */
  async notifyQueueStatusChange(
    queueId: string,
    status: 'active' | 'paused' | 'closed',
    message?: string,
  ): Promise<void> {
    try {
      // Buscar informações atuais da fila
      const queue = await this.prisma.queue.findUnique({
        where: { id: queueId },
        select: {
          name: true,
          avgServiceTime: true,
          _count: {
            select: {
              tickets: {
                where: {
                  status: { in: ['WAITING', 'CALLED'] },
                },
              },
            },
          },
        },
      });

      if (!queue) return;

      const queueLength = queue._count?.tickets || 0;
      const avgWaitTime = this.calculateEstimatedWait(
        queueLength,
        queue.avgServiceTime,
      );

      await this.igniterService.notifyQueueStatusChange(queueId, {
        status,
        queueLength,
        avgWaitTime,
        message: message || this.getStatusMessage(status),
      });

      this.logger.log(
        `📊 Status da fila ${queue.name} alterado para: ${status}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao notificar mudança de status da fila ${queueId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Notifica a posição específica de um usuário na fila
   */
  async notifyUserPosition(userId: string, queueId: string): Promise<void> {
    try {
      // Buscar ticket do usuário na fila
      const userTicket = await this.prisma.ticket.findFirst({
        where: {
          queueId,
          // Assumindo que há uma relação com o usuário - ajustar conforme o schema
          status: { in: ['WAITING', 'CALLED'] },
        },
        include: {
          queue: {
            select: { name: true, avgServiceTime: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      if (!userTicket) {
        this.logger.debug(
          `Usuário ${userId} não tem ticket ativo na fila ${queueId}`,
        );
        return;
      }

      // Calcular posição do usuário na fila
      const position = await this.calculateUserPosition(userTicket.id, queueId);
      const peopleAhead = Math.max(0, position - 1);
      const estimatedWait = this.calculateEstimatedWait(
        peopleAhead,
        userTicket.queue.avgServiceTime,
      );

      await this.igniterService.notifyUserQueuePosition(userId, queueId, {
        position,
        estimatedWait,
        peopleAhead,
        ticketNumber: userTicket.myCallingToken || 'N/A',
      });

      this.logger.debug(
        `📍 Posição atualizada para usuário ${userId} na fila ${queueId}: ${position}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao notificar posição do usuário ${userId} na fila ${queueId}:`,
        error,
      );
    }
  }

  /**
   * Atualiza as posições de todos os usuários em uma fila
   */
  private async updateAllUserPositions(queueId: string): Promise<void> {
    try {
      // Buscar todos os tickets ativos na fila
      const activeTickets = await this.prisma.ticket.findMany({
        where: {
          queueId,
          status: { in: ['WAITING', 'CALLED'] },
        },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          myCallingToken: true,
          // userId: true // Ajustar conforme a relação no schema
        },
      });

      // Notificar cada usuário sobre sua nova posição
      for (let i = 0; i < activeTickets.length; i++) {
        const ticket = activeTickets[i];
        const position = i + 1;

        // Se houver relação com userId, notificar
        // await this.notifyUserPosition(ticket.userId, queueId);
      }
    } catch (error) {
      this.logger.error(
        `Erro ao atualizar posições dos usuários na fila ${queueId}:`,
        error,
      );
    }
  }

  /**
   * Calcula a posição de um ticket específico na fila
   */
  private async calculateUserPosition(
    ticketId: string,
    queueId: string,
  ): Promise<number> {
    try {
      const ticket = await this.prisma.ticket.findUnique({
        where: { id: ticketId },
        select: { createdAt: true },
      });

      if (!ticket) return 0;

      const ticketsAhead = await this.prisma.ticket.count({
        where: {
          queueId,
          status: { in: ['WAITING', 'CALLED'] },
          createdAt: { lt: ticket.createdAt },
        },
      });

      return ticketsAhead + 1;
    } catch (error) {
      this.logger.error(
        `Erro ao calcular posição do ticket ${ticketId}:`,
        error,
      );
      return 0;
    }
  }

  /**
   * Calcula o tempo estimado de espera
   */
  private calculateEstimatedWait(
    queueLength: number,
    avgServiceTime?: number,
  ): string {
    if (!avgServiceTime || queueLength === 0) {
      return '0 min';
    }

    const totalMinutes = Math.ceil((queueLength * avgServiceTime) / 60);

    if (totalMinutes < 60) {
      return `${totalMinutes} min`;
    } else {
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return `${hours}h ${minutes}min`;
    }
  }

  /**
   * Obtém mensagem padrão para cada status
   */
  private getStatusMessage(status: string): string {
    switch (status) {
      case 'active':
        return 'Fila ativa - atendimento normal';
      case 'paused':
        return 'Fila pausada - aguarde retorno do atendimento';
      case 'closed':
        return 'Fila fechada - atendimento encerrado';
      default:
        return 'Status da fila atualizado';
    }
  }

  /**
   * Método para ser chamado quando um ticket é criado
   */
  async onTicketCreated(ticketId: string): Promise<void> {
    try {
      const ticket = await this.prisma.ticket.findUnique({
        where: { id: ticketId },
        select: { queueId: true },
      });

      if (ticket) {
        // Atualizar posições quando um novo ticket é criado
        await this.updateAllUserPositions(ticket.queueId);

        // Notificar sobre mudança no status da fila (tamanho aumentou)
        await this.notifyQueueStatusChange(ticket.queueId, 'active');
      }
    } catch (error) {
      this.logger.error(
        `Erro ao processar criação do ticket ${ticketId}:`,
        error,
      );
    }
  }

  /**
   * Método para ser chamado quando um ticket é completado/cancelado
   */
  async onTicketCompleted(ticketId: string): Promise<void> {
    try {
      const ticket = await this.prisma.ticket.findUnique({
        where: { id: ticketId },
        select: { queueId: true },
      });

      if (ticket) {
        // Atualizar posições quando um ticket é removido
        await this.updateAllUserPositions(ticket.queueId);

        // Notificar sobre mudança no status da fila
        await this.notifyQueueStatusChange(ticket.queueId, 'active');
      }
    } catch (error) {
      this.logger.error(
        `Erro ao processar conclusão do ticket ${ticketId}:`,
        error,
      );
    }
  }
}
