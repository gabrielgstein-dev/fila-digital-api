import { Injectable, Logger } from '@nestjs/common';
import { AgentStatus, TicketStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { QueueRepository } from '../repositories/queue.repository';

@Injectable()
export class QueuePoolService {
  private readonly logger = new Logger(QueuePoolService.name);

  constructor(
    private prisma: PrismaService,
    private queueRepository: QueueRepository,
  ) {}

  async getNextTicketFromPool(
    tenantId: string,
    queueId?: string,
    preferredAgentId?: string,
  ): Promise<any | null> {
    const whereCondition: any = {
      queue: {
        tenantId,
        isActive: true,
        isPaused: false,
      },
      status: TicketStatus.WAITING,
    };

    if (queueId) {
      whereCondition.queueId = queueId;
    }

    if (preferredAgentId) {
      whereCondition.OR = [
        { preferredAgentId },
        { preferredAgentId: null },
      ];
    } else {
      whereCondition.preferredAgentId = null;
    }

    const nextTicket = await this.prisma.ticket.findFirst({
      where: whereCondition,
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' },
      ],
      include: {
        queue: {
          include: {
            tenant: true,
          },
        },
      },
    });

    return nextTicket;
  }

  async getNextTicketForSpecificAgent(
    agentId: string,
  ): Promise<any | null> {
    const agent = await this.prisma.agent.findUnique({
      where: { id: agentId },
      select: { tenantId: true },
    });

    if (!agent) {
      return null;
    }

    const specificTicket = await this.prisma.ticket.findFirst({
      where: {
        queue: {
          tenantId: agent.tenantId,
          isActive: true,
          isPaused: false,
        },
        status: TicketStatus.WAITING,
        preferredAgentId: agentId,
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' },
      ],
      include: {
        queue: {
          include: {
            tenant: true,
          },
        },
      },
    });

    if (specificTicket) {
      return specificTicket;
    }

    const generalTicket = await this.prisma.ticket.findFirst({
      where: {
        queue: {
          tenantId: agent.tenantId,
          isActive: true,
          isPaused: false,
        },
        status: TicketStatus.WAITING,
        preferredAgentId: null,
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' },
      ],
      include: {
        queue: {
          include: {
            tenant: true,
          },
        },
      },
    });

    return generalTicket;
  }

  async assignTicketToAgent(
    ticketId: string,
    agentId: string,
  ): Promise<any> {
    const [ticket, agent] = await this.prisma.$transaction([
      this.prisma.ticket.update({
        where: { id: ticketId },
        data: {
          status: TicketStatus.CALLED,
          calledAt: new Date(),
        },
        include: {
          queue: {
            include: {
              tenant: true,
            },
          },
        },
      }),
      this.prisma.agent.update({
        where: { id: agentId },
        data: {
          status: AgentStatus.BUSY,
          currentTicketId: ticketId,
        },
      }),
    ]);

    this.logger.log(
      `Ticket ${ticket.myCallingToken} atribuído ao agente ${agent.name}`,
    );

    return ticket;
  }

  async offerNextTicketToAvailableAgent(tenantId: string): Promise<any | null> {
    const availableAgent = await this.prisma.agent.findFirst({
      where: {
        tenantId,
        isActive: true,
        status: AgentStatus.AVAILABLE,
      },
      orderBy: {
        updatedAt: 'asc',
      },
    });

    if (!availableAgent) {
      this.logger.debug('Nenhum agente disponível no momento');
      return null;
    }

    const nextTicket = await this.getNextTicketFromPool(tenantId);

    if (!nextTicket) {
      this.logger.debug('Nenhum ticket aguardando no pool');
      return null;
    }

    const assignedTicket = await this.assignTicketToAgent(
      nextTicket.id,
      availableAgent.id,
    );

    return {
      ticket: assignedTicket,
      agent: availableAgent,
    };
  }

  async releaseAgent(agentId: string): Promise<void> {
    await this.prisma.agent.update({
      where: { id: agentId },
      data: {
        status: AgentStatus.AVAILABLE,
        currentTicketId: null,
      },
    });

    this.logger.log(`Agente ${agentId} liberado e disponível`);

    const nextTicket = await this.getNextTicketForSpecificAgent(agentId);

    if (nextTicket) {
      await this.assignTicketToAgent(nextTicket.id, agentId);
      this.logger.log(
        `Ticket ${nextTicket.myCallingToken} automaticamente atribuído ao agente ${agentId}`,
      );
    } else {
      this.logger.debug(
        `Nenhum ticket aguardando para o agente ${agentId}`,
      );
    }
  }

  async checkAndPauseQueueIfAtCapacity(queueId: string): Promise<void> {
    const queue = await this.prisma.queue.findUnique({
      where: { id: queueId },
      include: {
        tenant: {
          include: {
            queues: {
              where: {
                isActive: true,
                isPaused: false,
              },
            },
          },
        },
      },
    });

    if (!queue) {
      return;
    }

    const waitingCount = await this.prisma.ticket.count({
      where: {
        queueId,
        status: TicketStatus.WAITING,
      },
    });

    const capacity = queue.capacity || 100;

    if (waitingCount >= capacity && !queue.isPaused) {
      const alternativeQueue = queue.tenant.queues.find(
        (q) => q.id !== queueId && q.queueType !== queue.queueType,
      );

      await this.prisma.queue.update({
        where: { id: queueId },
        data: {
          isPaused: true,
          pausedReason: 'Capacidade máxima atingida',
          alternativeQueueId: alternativeQueue?.id || null,
        },
      });

      this.logger.warn(
        `Fila ${queue.name} pausada automaticamente - capacidade atingida (${waitingCount}/${capacity})`,
      );

      if (alternativeQueue) {
        this.logger.log(
          `Rota alternativa sugerida: ${alternativeQueue.name}`,
        );
      }
    } else if (waitingCount < capacity * 0.8 && queue.isPaused) {
      await this.prisma.queue.update({
        where: { id: queueId },
        data: {
          isPaused: false,
          pausedReason: null,
          alternativeQueueId: null,
        },
      });

      this.logger.log(
        `Fila ${queue.name} reativada - ocupação em ${waitingCount}/${capacity}`,
      );
    }
  }

  async getPoolStatistics(tenantId: string): Promise<any> {
    const [
      totalWaiting,
      totalWaitingGeneral,
      totalWaitingSpecific,
      totalAvailableAgents,
      totalBusyAgents,
      queueStats,
    ] = await Promise.all([
      this.prisma.ticket.count({
        where: {
          queue: { tenantId },
          status: TicketStatus.WAITING,
        },
      }),
      this.prisma.ticket.count({
        where: {
          queue: { tenantId },
          status: TicketStatus.WAITING,
          preferredAgentId: null,
        },
      }),
      this.prisma.ticket.count({
        where: {
          queue: { tenantId },
          status: TicketStatus.WAITING,
          preferredAgentId: { not: null },
        },
      }),
      this.prisma.agent.count({
        where: {
          tenantId,
          isActive: true,
          status: AgentStatus.AVAILABLE,
        },
      }),
      this.prisma.agent.count({
        where: {
          tenantId,
          isActive: true,
          status: AgentStatus.BUSY,
        },
      }),
      this.prisma.ticket.groupBy({
        by: ['priority'],
        where: {
          queue: { tenantId },
          status: TicketStatus.WAITING,
        },
        _count: {
          priority: true,
        },
        orderBy: {
          priority: 'desc',
        },
      }),
    ]);

    return {
      totalWaiting,
      totalWaitingGeneral,
      totalWaitingSpecific,
      totalAvailableAgents,
      totalBusyAgents,
      utilizationRate: totalBusyAgents + totalAvailableAgents > 0
        ? (totalBusyAgents / (totalBusyAgents + totalAvailableAgents)) * 100
        : 0,
      priorityDistribution: queueStats.map((stat) => ({
        priority: stat.priority,
        count: stat._count.priority,
      })),
    };
  }

  async getAgentQueueStats(agentId: string): Promise<any> {
    const [waitingForAgent, totalCallsToday] = await Promise.all([
      this.prisma.ticket.count({
        where: {
          preferredAgentId: agentId,
          status: TicketStatus.WAITING,
        },
      }),
      this.prisma.callLog.count({
        where: {
          agentId,
          calledAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
    ]);

    return {
      waitingForAgent,
      totalCallsToday,
    };
  }
}
