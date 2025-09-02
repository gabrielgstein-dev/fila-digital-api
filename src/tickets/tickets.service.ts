import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTicketDto } from '../common/dto/create-ticket.dto';
import { TicketStatus } from '@prisma/client';
import { EventsGateway } from '../events/events.gateway';
import { EventsService } from '../events/events.service';

@Injectable()
export class TicketsService {
  constructor(
    private prisma: PrismaService,
    private eventsGateway: EventsGateway,
    private eventsService: EventsService,
  ) {}

  async create(
    queueId: string,
    createTicketDto: CreateTicketDto,
    userId?: string,
  ) {
    const queue = await this.prisma.queue.findUnique({
      where: { id: queueId },
      include: { tickets: true },
    });

    if (!queue) {
      throw new NotFoundException('Fila não encontrada');
    }

    if (!queue.isActive) {
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

    const ticket = await this.prisma.ticket.create({
      data: {
        ...createTicketDto,
        queueId,
        myCallingToken: nextToken,
        estimatedTime,
        userId: userId || null,
      },
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

    // Se um agente está tentando completar o ticket, verificar se pertence ao tenant
    if (currentAgentId) {
      const agent = await this.prisma.agent.findUnique({
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

    return this.prisma.ticket.update({
      where: { id },
      data: {
        status: TicketStatus.COMPLETED,
        completedAt: new Date(),
      },
      include: {
        queue: true,
      },
    });
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
    avgServiceTime: number,
  ): number {
    return position * avgServiceTime;
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
    // Determinar prefixo baseado no nome da fila ou tipo
    const name = queue.name.toLowerCase();
    if (name.includes('exame')) return 'B';
    if (name.includes('consulta')) return 'N';
    if (name.includes('pediatria')) return 'P';
    if (name.includes('urgencia')) return 'U';
    // Padrão: primeira letra do nome
    return queue.name.charAt(0).toUpperCase();
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
      estimatedWaitTime: queue.tickets.length * queue.avgServiceTime,
      lastUpdated: new Date(),
    };
  }
}
