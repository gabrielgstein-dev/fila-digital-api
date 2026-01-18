import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { TicketStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { QueueRepository } from '../repositories/queue.repository';

@Injectable()
export class QueueCallService {
  private readonly logger = new Logger(QueueCallService.name);

  constructor(
    private prisma: PrismaService,
    private queueRepository: QueueRepository,
  ) {}

  async callNextTicket(queueId: string, agentId?: string) {
    const ticket = await this.queueRepository.getNextTicketInQueue(queueId);

    if (!ticket) {
      throw new BadRequestException('Não há tickets aguardando na fila');
    }

    const calledAt = new Date();

    const updatedTicket = await this.prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        status: TicketStatus.CALLED,
        calledAt,
      },
      include: {
        queue: {
          include: {
            tenant: true,
          },
        },
      },
    });

    if (agentId) {
      await this.registerCallLog(ticket.id, queueId, agentId, calledAt);
    }

    this.logger.log(
      `Ticket ${updatedTicket.myCallingToken} chamado na fila ${queueId}`,
    );

    return updatedTicket;
  }

  private async registerCallLog(
    ticketId: string,
    queueId: string,
    agentId: string,
    calledAt: Date,
  ): Promise<void> {
    try {
      const agent = await this.prisma.agent.findUnique({
        where: { id: agentId },
      });

      if (!agent) {
        this.logger.warn(`Agente ${agentId} não encontrado para CallLog`);
        return;
      }

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
            action: 'CALLED',
            calledAt,
            ticketId,
            queueId,
            agentId,
            counterId: counter.id,
          },
        });
      }
    } catch (error) {
      this.logger.error(
        `Erro ao registrar CallLog: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
