import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQueueDto } from '../common/dto/create-queue.dto';
import { TicketStatus } from '@prisma/client';
import { TicketNotificationService } from '../messaging/ticket-notification.service';

@Injectable()
export class QueuesService {
  constructor(
    private prisma: PrismaService,
    private ticketNotificationService: TicketNotificationService,
  ) {}

  async create(tenantId: string, createQueueDto: CreateQueueDto) {
    return this.prisma.queue.create({
      data: {
        ...createQueueDto,
        tenantId,
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

    const updatedTicket = await this.prisma.ticket.update({
      where: { id: nextTicket.id },
      data: {
        status: TicketStatus.CALLED,
        calledAt: new Date(),
      },
      include: {
        queue: true,
        user: true, // Incluir dados do usuário se logado
      },
    });

    // 🚀 ENVIAR NOTIFICAÇÃO via RabbitMQ
    try {
      await this.ticketNotificationService.notifyTicketCalled({
        ticketId: updatedTicket.id,
        queueName: updatedTicket.queue.name,
        ticketNumber: updatedTicket.number,
        clientPhone: updatedTicket.clientPhone,
        clientEmail: updatedTicket.clientEmail,
        userId: updatedTicket.userId,
      });
    } catch (error) {
      // Log erro mas não quebra o fluxo principal
      console.error('Erro ao enviar notificação:', error);
    }

    return updatedTicket;
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

    // Buscar número atual de cada fila (último ticket chamado)
    const queuesWithCurrentNumber = await Promise.all(
      queues.map(async (queue) => {
        const lastCalledTicket = await this.prisma.ticket.findFirst({
          where: {
            queueId: queue.id,
            status: TicketStatus.CALLED,
          },
          orderBy: { calledAt: 'desc' },
        });

        return {
          id: queue.id,
          name: queue.name,
          description: queue.description,
          queueType: queue.queueType,
          capacity: queue.capacity,
          avgServiceTime: queue.avgServiceTime,
          currentNumber: lastCalledTicket?.number || 0,
          totalWaiting: queue.tickets.filter(
            (t) => t.status === TicketStatus.WAITING,
          ).length,
          totalCalled: queue.tickets.filter(
            (t) => t.status === TicketStatus.CALLED,
          ).length,
          tickets: queue.tickets.map((ticket) => ({
            id: ticket.id,
            number: ticket.number,
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
}
