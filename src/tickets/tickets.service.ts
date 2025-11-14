import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TicketStatus } from '@prisma/client';
import { CreateTicketDto } from '../common/dto/create-ticket.dto';
import { EventsGateway } from '../events/events.gateway';
import { EventsService } from '../events/events.service';
import { PrismaService } from '../prisma/prisma.service';
import { SmsService } from '../sms/sms.service';

@Injectable()
export class TicketsService {
  constructor(
    private prisma: PrismaService,
    private eventsGateway: EventsGateway,
    private eventsService: EventsService,
    private smsService: SmsService,
  ) {}

  async create(
    queueId: string,
    createTicketDto: CreateTicketDto,
    userId?: string,
  ) {
    const queue = await this.prisma.queue.findUnique({
      where: { id: queueId },
      select: {
        id: true,
        name: true,
        isActive: true,
        capacity: true,
        avgServiceTime: true,
        queueType: true,
        tenant: {
          select: {
            id: true,
            name: true,
            isActive: true,
          },
        },
        tickets: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    if (!queue) {
      throw new NotFoundException('Fila não encontrada');
    }

    if (!queue.tenant) {
      throw new BadRequestException('Tenant não encontrado para esta fila');
    }

    if (queue.tenant.isActive !== true) {
      throw new BadRequestException('Tenant não está ativo');
    }

    if (queue.isActive !== true) {
      throw new BadRequestException('Fila não está ativa');
    }

    const waitingTickets = queue.tickets.filter(
      (ticket) => ticket.status === TicketStatus.WAITING,
    );

    if (waitingTickets.length >= queue.capacity) {
      throw new BadRequestException('Fila está cheia');
    }

    const queuePrefix = this.getQueuePrefix(queue);

    const lastTicket = await this.prisma.ticket.findFirst({
      where: { queueId },
      orderBy: { myCallingToken: 'desc' },
    });

    const lastNumber =
      this.extractNumberFromToken(lastTicket?.myCallingToken) || 0;
    const nextNumber = lastNumber + 1;
    const nextToken = `${queuePrefix}${nextNumber}`;

    const estimatedTime = this.calculateEstimatedTime(
      waitingTickets.length,
      queue.avgServiceTime,
    );

    const ticketData = {
      clientName: createTicketDto.clientName ?? null,
      clientPhone: createTicketDto.clientPhone ?? null,
      clientEmail: createTicketDto.clientEmail ?? null,
      priority: createTicketDto.priority ?? 1,
      queueId,
      myCallingToken: nextToken,
      estimatedTime,
      userId: userId || null,
      status: TicketStatus.WAITING,
    };

    const ticket = await this.prisma.ticket.create({
      data: ticketData,
      include: {
        queue: {
          include: {
            tenant: true,
          },
        },
        user: true,
      },
    });

    this.eventsService.emitQueueStatusUpdate(queueId, {
      totalWaiting: waitingTickets.length + 1,
      lastTicketCreated: ticket.myCallingToken,
      estimatedWaitTime: estimatedTime,
    });

    this.eventsService.emitTicketStatusChanged(
      ticket.id,
      null,
      TicketStatus.WAITING,
      {
        ticketId: ticket.id,
        myCallingToken: ticket.myCallingToken,
        position: waitingTickets.length + 1,
        estimatedTime,
      },
    );

    // 📱 ENVIAR SMS DE CONFIRMAÇÃO DE ENTRADA NA FILA
    if (ticket.clientPhone && this.smsService.isConfigured()) {
      try {
        await this.smsService.sendQueueNotification(
          ticket.clientPhone,
          queue.name,
          waitingTickets.length + 1,
        );
      } catch (error) {
        console.error('Erro ao enviar SMS de confirmação:', error);
      }
    }

    return ticket;
  }

  async findOne(id: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: {
        queue: {
          include: {
            tenant: true,
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket não encontrado');
    }

    const position = await this.getTicketPosition(ticket.queueId, ticket.id);
    const updatedEstimatedTime = await this.updateEstimatedTime(ticket);

    return {
      ...ticket,
      position,
      estimatedTime: updatedEstimatedTime,
    };
  }

  async getTicketStatusWithEstimate(id: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: {
        queue: {
          include: {
            tenant: true,
          },
        },
        user: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket não encontrado');
    }

    let position = 0;
    let estimatedTimeToCall = 0;
    let currentTicket = null;
    let avgServiceTimeReal = null;

    if (ticket.status === TicketStatus.WAITING) {
      const waitingTickets = await this.prisma.ticket.findMany({
        where: {
          queueId: ticket.queueId,
          status: TicketStatus.WAITING,
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      });

      position = waitingTickets.findIndex((t) => t.id === ticket.id) + 1;

      if (position > 0) {
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

          avgServiceTimeReal = result[0]?.avg_recent_service_time;

          if (avgServiceTimeReal && avgServiceTimeReal > 0) {
            estimatedTimeToCall = position * avgServiceTimeReal;
          } else {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const result7Days = await this.prisma.$queryRaw<
              Array<{ avg_service_time: number | null }>
            >`
              SELECT
                AVG((metadata->>'serviceTime')::numeric)::integer as avg_service_time
              FROM queue_ticket_history
              WHERE "queueId" = ${ticket.queueId}
                AND action = 'COMPLETED'
                AND "calledAt" >= ${sevenDaysAgo}
                AND metadata->>'serviceTime' IS NOT NULL
                AND (metadata->>'serviceTime')::numeric > 0
            `;

            avgServiceTimeReal = result7Days[0]?.avg_service_time;

            if (avgServiceTimeReal && avgServiceTimeReal > 0) {
              estimatedTimeToCall = position * avgServiceTimeReal;
            } else {
              estimatedTimeToCall = 0;
            }
          }
        } catch (error) {
          console.error('Erro ao calcular tempo estimado:', error);
          estimatedTimeToCall = 0;
        }
      }
    } else if (ticket.status === TicketStatus.CALLED) {
      estimatedTimeToCall = 0;
      currentTicket = ticket.myCallingToken;
    }

    if (!avgServiceTimeReal) {
      try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const result = await this.prisma.$queryRaw<
          Array<{ avg_service_time: number | null }>
        >`
          SELECT
            AVG((metadata->>'serviceTime')::numeric)::integer as avg_service_time
          FROM queue_ticket_history
          WHERE "queueId" = ${ticket.queueId}
            AND action = 'COMPLETED'
            AND "calledAt" >= ${sevenDaysAgo}
            AND metadata->>'serviceTime' IS NOT NULL
            AND (metadata->>'serviceTime')::numeric > 0
        `;

        avgServiceTimeReal = result[0]?.avg_service_time || null;
      } catch (error) {
        console.error('Erro ao calcular tempo médio:', error);
      }
    }

    const currentCalledTicket = await this.prisma.ticket.findFirst({
      where: {
        queueId: ticket.queueId,
        status: TicketStatus.CALLED,
      },
      orderBy: { calledAt: 'desc' },
      select: {
        myCallingToken: true,
        calledAt: true,
      },
    });

    return {
      ticket: {
        id: ticket.id,
        myCallingToken: ticket.myCallingToken,
        status: ticket.status,
        priority: ticket.priority,
        createdAt: ticket.createdAt,
        calledAt: ticket.calledAt,
        completedAt: ticket.completedAt,
      },
      queue: {
        id: ticket.queue.id,
        name: ticket.queue.name,
        queueType: ticket.queue.queueType,
      },
      position,
      avgServiceTimeReal: avgServiceTimeReal
        ? Math.round(avgServiceTimeReal)
        : null,
      avgServiceTimeRealMinutes: avgServiceTimeReal
        ? Math.round(avgServiceTimeReal / 60)
        : null,
      estimatedTimeToCall,
      estimatedTimeToCallMinutes: Math.round(estimatedTimeToCall / 60),
      currentTicket: currentCalledTicket?.myCallingToken || null,
      isBeingServed: ticket.status === TicketStatus.CALLED,
      isWaiting: ticket.status === TicketStatus.WAITING,
      isCompleted: ticket.status === TicketStatus.COMPLETED,
      lastUpdated: new Date(),
    };
  }

  async recall(id: string) {
    const ticket = await this.findOne(id);

    if (ticket.status !== TicketStatus.CALLED) {
      throw new BadRequestException(
        'Ticket deve estar com status CALLED para ser rechamado',
      );
    }

    const updatedTicket = await this.prisma.ticket.update({
      where: { id },
      data: {
        calledAt: new Date(),
      },
      include: {
        queue: true,
      },
    });

    return updatedTicket;
  }

  async skip(id: string) {
    const ticket = await this.findOne(id);

    if (ticket.status !== TicketStatus.CALLED) {
      throw new BadRequestException(
        'Ticket deve estar com status CALLED para ser pulado',
      );
    }

    return this.prisma.ticket.update({
      where: { id },
      data: {
        status: TicketStatus.WAITING,
        calledAt: null,
      },
      include: {
        queue: true,
      },
    });
  }

  async complete(id: string, currentAgentId?: string) {
    const ticket = await this.findOne(id);

    if (
      ticket.status !== TicketStatus.CALLED &&
      ticket.status !== TicketStatus.IN_SERVICE
    ) {
      throw new BadRequestException(
        'Ticket deve estar sendo atendido para ser completado',
      );
    }

    let agent = null;
    if (currentAgentId) {
      agent = await this.prisma.agent.findUnique({
        where: { id: currentAgentId },
      });

      if (!agent) {
        throw new BadRequestException('Agente não encontrado');
      }

      if (agent.tenantId !== ticket.queue.tenantId) {
        throw new ForbiddenException(
          'Acesso negado: você não tem permissão para completar tickets deste tenant',
        );
      }
    }

    const completedAt = new Date();
    const serviceTime = ticket.calledAt
      ? Math.floor((completedAt.getTime() - ticket.calledAt.getTime()) / 1000)
      : null;

    const updatedTicket = await this.prisma.ticket.update({
      where: { id },
      data: {
        status: TicketStatus.COMPLETED,
        completedAt,
      },
      include: {
        queue: true,
      },
    });

    if (agent && ticket.calledAt) {
      try {
        const counter = await this.prisma.counter.findFirst({
          where: {
            tenantId: agent.tenantId,
            isActive: true,
          },
          orderBy: {
            number: 'asc',
          },
        });

        if (counter) {
          await this.prisma.callLog.create({
            data: {
              id: `cl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              action: 'COMPLETED',
              calledAt: ticket.calledAt,
              serviceTime: serviceTime,
              ticketId: ticket.id,
              queueId: ticket.queueId,
              agentId: agent.id,
              counterId: counter.id,
            },
          });
        }
      } catch (error) {
        console.error('Erro ao criar CallLog:', error);
      }
    }

    return updatedTicket;
  }

  async updateCurrentCallingToken(
    id: string,
    newToken: string,
    currentAgentId?: string,
  ) {
    const ticket = await this.findOne(id);

    if (!ticket) {
      throw new NotFoundException('Ticket não encontrado');
    }

    // Se um agente está tentando atualizar o token, verificar se pertence ao tenant
    if (currentAgentId) {
      const agent = await this.prisma.agent.findUnique({
        where: { id: currentAgentId },
      });

      if (!agent) {
        throw new BadRequestException('Agente não encontrado');
      }

      if (agent.tenantId !== ticket.queue.tenantId) {
        throw new ForbiddenException(
          'Acesso negado: você não tem permissão para atualizar tokens deste tenant',
        );
      }
    }

    const updatedTicket = await this.prisma.ticket.update({
      where: { id },
      data: {
        myCallingToken: newToken,
      },
      include: {
        queue: {
          include: {
            tenant: true,
          },
        },
      },
    });

    this.eventsGateway.emitCurrentCallingTokenUpdate(
      ticket.queue.tenantId,
      ticket.queue.queueType,
      {
        ticketId: id,
        oldToken: ticket.myCallingToken,
        newToken,
        queueId: ticket.queueId,
        queueName: ticket.queue.name,
        tenantId: ticket.queue.tenantId,
        tenantName: ticket.queue.tenant.name,
      },
    );

    return updatedTicket;
  }

  private calculateEstimatedTime(
    position: number,
    avgServiceTime: number | null,
  ): number {
    return position * (avgServiceTime || 300);
  }

  private async getTicketPosition(
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
    return position + 1;
  }

  private async updateEstimatedTime(ticket: any): Promise<number> {
    if (ticket.status !== TicketStatus.WAITING) {
      return 0;
    }

    const position = await this.getTicketPosition(ticket.queueId, ticket.id);
    return this.calculateEstimatedTime(
      position - 1,
      ticket.queue.avgServiceTime,
    );
  }

  private getQueuePrefix(queue: any): string {
    let prefix = 'G';

    if (queue.queueType === 'PRIORITY') {
      prefix = 'P';
    } else if (queue.queueType === 'VIP') {
      prefix = 'V';
    }

    return prefix;
  }

  private extractNumberFromToken(token?: string): number {
    if (!token) return 0;
    // Extrair número do token (ex: "B333" → 333)
    const match = token.match(/\d+$/);
    return match ? parseInt(match[0], 10) : 0;
  }

  async getQueueStatus(queueId: string) {
    const queue = await this.prisma.queue.findUnique({
      where: { id: queueId },
      include: {
        tenant: true,
        tickets: {
          where: { status: TicketStatus.WAITING },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!queue) {
      throw new NotFoundException('Fila não encontrada');
    }

    const lastCalledTicket = await this.prisma.ticket.findFirst({
      where: {
        queueId: queue.id,
        status: TicketStatus.CALLED,
      },
      orderBy: { calledAt: 'desc' },
    });

    const currentCallingToken =
      lastCalledTicket?.myCallingToken || 'Aguardando...';

    return {
      queueId: queue.id,
      queueName: queue.name,
      tenantName: queue.tenant.name,
      currentCallingToken,
      totalWaiting: queue.tickets.length,
      estimatedWaitTime: queue.tickets.length * (queue.avgServiceTime || 300),
      lastUpdated: new Date(),
    };
  }
}
