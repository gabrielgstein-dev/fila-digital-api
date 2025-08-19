import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQueueDto } from '../common/dto/create-queue.dto';
import { TicketStatus } from '@prisma/client';

@Injectable()
export class QueuesService {
  constructor(private prisma: PrismaService) {}

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
      },
    });

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
}
