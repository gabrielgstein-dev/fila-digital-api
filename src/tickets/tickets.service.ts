import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    InternalServerErrorException,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TicketStatus } from '@prisma/client';
import { CreateTicketDto } from '../common/dto/create-ticket.dto';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import { WhatsAppQueueService } from '../whatsapp/whatsapp-queue.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { TicketEstimateService } from './helpers/ticket-estimate.service';
import { TicketNotificationService } from './helpers/ticket-notification.service';
import { TicketNumberService } from './helpers/ticket-number.service';
import { TicketValidationService } from './helpers/ticket-validation.service';

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private telegramService: TelegramService,
    private whatsappService: WhatsAppService,
    private whatsappQueueService: WhatsAppQueueService,
    private estimateService: TicketEstimateService,
    private validationService: TicketValidationService,
    private numberService: TicketNumberService,
    private notificationService: TicketNotificationService,
  ) {}

  /**
   * Cria um novo ticket na fila especificada
   * @param queueId - ID da fila onde o ticket será criado
   * @param createTicketDto - Dados do cliente (nome, telefone, prioridade)
   * @param userId - ID do usuário autenticado (opcional)
   * @returns Ticket criado com posição e tempo estimado
   * @throws NotFoundException se a fila não existir
   * @throws BadRequestException se a fila estiver cheia ou inativa
   * @throws ForbiddenException se o tenant estiver inativo
   */
  async create(
    queueId: string,
    createTicketDto: CreateTicketDto,
    userId?: string,
  ) {
    try {
      this.logger.log(`Criando ticket para fila: ${queueId}`);

      const queue = await this.validationService.validateQueueAndTenant(queueId);
      await this.validationService.validateQueueCapacity(queueId);

      const waitingTicketsCount = await this.prisma.ticket.count({
        where: { queueId, status: TicketStatus.WAITING },
      });

      const position = waitingTicketsCount + 1;
      const estimatedTime = await this.estimateService.calculateEstimatedTime(
        queueId,
        position,
      );

      const ticketNumber = await this.numberService.getNextTicketNumber(
        queueId,
        queue.queueType,
      );

      const ticket = await this.prisma.ticket.create({
        data: {
          clientName: createTicketDto.clientName ?? null,
          clientCpf: createTicketDto.clientCpf ?? null,
          clientPhone: createTicketDto.clientPhone ?? null,
          clientEmail: createTicketDto.clientEmail ?? null,
          telegramChatId: createTicketDto.telegramChatId ?? null,
          priority: createTicketDto.priority ?? 1,
          queueId,
          estimatedTime,
          userId: userId || null,
          status: TicketStatus.WAITING,
          myCallingToken: ticketNumber,
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

      const estimatedMinutes = Math.ceil(estimatedTime / 60);

      await this.notificationService.notifyTicketCreated(
        ticket,
        ticket.queue,
        position,
        estimatedMinutes,
      );

      return ticket;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      this.logger.error(
        `Erro ao criar ticket na fila ${queueId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );

      throw new InternalServerErrorException(
        'Erro ao criar ticket. Por favor, tente novamente.',
      );
    }
  }

  /**
   * Busca um ticket pelo ID com posição e tempo estimado atualizados
   * @param id - ID do ticket
   * @returns Ticket com posição e tempo estimado
   * @throws NotFoundException se o ticket não existir
   */
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

    const position = await this.estimateService.getTicketPosition(
      ticket.queueId,
      ticket.id,
    );
    const estimatedTime = await this.estimateService.calculateEstimatedTime(
      ticket.queueId,
      position,
    );

    return {
      ...ticket,
      position,
      estimatedTime,
    };
  }

  /**
   * Retorna o status completo do ticket com estimativas em tempo real
   * @param id - ID do ticket
   * @returns Status do ticket com posição, tempo estimado e informações da fila
   * @throws NotFoundException se o ticket não existir
   */
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
    let avgServiceTimeReal = null;

    if (ticket.status === TicketStatus.WAITING) {
      position = await this.estimateService.getTicketPosition(
        ticket.queueId,
        ticket.id,
      );

      if (position > 0) {
        avgServiceTimeReal = await this.estimateService.getAverageServiceTime(
          ticket.queueId,
        );
        estimatedTimeToCall = position * avgServiceTimeReal;
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

  async getPublicTicketStatusByGuestToken(guestToken: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { guestToken: guestToken },
      include: {
        queue: {
          select: {
            id: true,
            name: true,
            avgServiceTime: true,
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket não encontrado');
    }

    if (!ticket.queue) {
      throw new NotFoundException('Fila não encontrada para este ticket');
    }

    const position = await this.estimateService.getTicketPosition(
      ticket.queueId,
      ticket.id,
    );
    const estimatedWaitTime = await this.estimateService.calculateEstimatedTime(
      ticket.queueId,
      position,
    );

    return {
      status: ticket.status,
      queueName: ticket.queue.name,
      myCallingToken: ticket.myCallingToken,
      position: position > 0 ? position : null,
      estimatedWaitTime,
    };
  }

  /**
   * Rechama um ticket que já foi chamado
   * @param id - ID do ticket
   * @returns Ticket rechamado
   * @throws NotFoundException se o ticket não existir
   * @throws BadRequestException se o ticket não estiver com status CALLED
   */
  async recall(id: string) {
    const ticket = await this.findOne(id);

    if (ticket.status !== TicketStatus.CALLED) {
      throw new BadRequestException(
        'Ticket deve estar com status CALLED para ser rechamado',
      );
    }

    return this.prisma.ticket.update({
      where: { id },
      data: {
        calledAt: new Date(),
      },
      include: {
        queue: true,
      },
    });
  }

  /**
   * Pula um ticket chamado, retornando-o para a fila
   * @param id - ID do ticket
   * @returns Ticket com status WAITING
   * @throws NotFoundException se o ticket não existir
   * @throws BadRequestException se o ticket não estiver com status CALLED
   */
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

  /**
   * Completa o atendimento de um ticket
   * @param id - ID do ticket
   * @param currentAgentId - ID do agente que está completando (opcional)
   * @returns Ticket completado
   * @throws NotFoundException se o ticket não existir
   * @throws BadRequestException se o ticket não estiver sendo atendido
   * @throws ForbiddenException se o agente não tiver permissão
   */
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
      agent = await this.validateAgentAccess(currentAgentId, ticket.queue.tenantId);
    }

    const completedAt = new Date();
    const serviceTime = this.calculateServiceTime(ticket.calledAt, completedAt);

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
      await this.createCallLog(ticket, agent.id, serviceTime);
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

    if (currentAgentId) {
      await this.validateAgentAccess(currentAgentId, ticket.queue.tenantId);
    }

    return this.prisma.ticket.update({
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

    const estimatedWaitTime = await this.estimateService.calculateEstimatedTime(
      queueId,
      queue.tickets.length,
    );

    return {
      queueId: queue.id,
      queueName: queue.name,
      tenantName: queue.tenant.name,
      currentCallingToken,
      totalWaiting: queue.tickets.length,
      estimatedWaitTime,
      lastUpdated: new Date(),
    };
  }

  private async validateAgentAccess(agentId: string, tenantId: string) {
    const agent = await this.prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      throw new BadRequestException('Agente não encontrado');
    }

    if (agent.tenantId !== tenantId) {
      throw new ForbiddenException(
        'Acesso negado: você não tem permissão para acessar recursos deste tenant',
      );
    }

    return agent;
  }

  private calculateServiceTime(
    calledAt: Date | null,
    completedAt: Date,
  ): number | null {
    if (!calledAt) {
      return null;
    }
    return Math.floor((completedAt.getTime() - calledAt.getTime()) / 1000);
  }

  private async createCallLog(
    ticket: any,
    agentId: string,
    serviceTime: number | null,
  ): Promise<void> {
    try {
      const counter = await this.prisma.counter.findFirst({
        where: {
          tenantId: ticket.queue.tenantId,
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
            agentId: agentId,
            counterId: counter.id,
          },
        });
      }
    } catch (error) {
      this.logger.error(
        `Erro ao criar CallLog: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
