import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTicketDto } from '../common/dto/create-ticket.dto';
import { TicketStatus, CallAction } from '@prisma/client';

@Injectable()
export class TicketsService {
  constructor(private prisma: PrismaService) {}

  async create(queueId: string, createTicketDto: CreateTicketDto) {
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

    const lastTicket = await this.prisma.ticket.findFirst({
      where: { queueId },
      orderBy: { number: 'desc' },
    });

    const nextNumber = (lastTicket?.number || 0) + 1;

    const estimatedTime = this.calculateEstimatedTime(
      waitingTickets.length,
      queue.avgServiceTime,
    );

    return this.prisma.ticket.create({
      data: {
        ...createTicketDto,
        queueId,
        number: nextNumber,
        estimatedTime,
      },
      include: {
        queue: {
          include: {
            tenant: true,
          },
        },
      },
    });
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

  async complete(id: string) {
    const ticket = await this.findOne(id);

    if (
      ticket.status !== TicketStatus.CALLED &&
      ticket.status !== TicketStatus.IN_SERVICE
    ) {
      throw new BadRequestException(
        'Ticket deve estar sendo atendido para ser completado',
      );
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
}
