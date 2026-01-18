import { Injectable } from '@nestjs/common';
import { Queue, Tenant, TicketStatus } from '@prisma/client';
import { QUEUE_DEFAULTS } from '../../common/constants/queue.constants';
import {
    QueueFullException,
    QueueInactiveException,
    QueueNotFoundException,
    TenantInactiveException,
    TenantNotFoundException,
} from '../../common/exceptions/business.exceptions';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TicketValidationService {
  constructor(private prisma: PrismaService) {}

  async validateQueueCapacity(queueId: string): Promise<void> {
    const queue = await this.prisma.queue.findUnique({
      where: { id: queueId },
      select: { capacity: true },
    });

    if (!queue) {
      throw new QueueNotFoundException();
    }

    const waitingCount = await this.prisma.ticket.count({
      where: {
        queueId,
        status: TicketStatus.WAITING,
      },
    });

    const capacity = queue.capacity || QUEUE_DEFAULTS.CAPACITY;
    if (waitingCount >= capacity) {
      throw new QueueFullException();
    }
  }

  async validateQueueActive(queueId: string): Promise<Queue> {
    const queue = await this.prisma.queue.findUnique({
      where: { id: queueId },
      include: {
        tenant: true,
      },
    });

    if (!queue) {
      throw new QueueNotFoundException();
    }

    if (!queue.isActive) {
      throw new QueueInactiveException();
    }

    return queue;
  }

  validateTenantActive(tenant: Tenant): void {
    if (!tenant) {
      throw new TenantNotFoundException();
    }

    if (!tenant.isActive) {
      throw new TenantInactiveException();
    }
  }

  async validateQueueAndTenant(queueId: string): Promise<Queue & { tenant: Tenant }> {
    const queue = await this.prisma.queue.findUnique({
      where: { id: queueId },
      include: {
        tenant: true,
      },
    });

    if (!queue) {
      throw new QueueNotFoundException();
    }

    if (!queue.isActive) {
      throw new QueueInactiveException();
    }

    if (!queue.tenant) {
      throw new TenantNotFoundException();
    }

    this.validateTenantActive(queue.tenant);

    return queue as Queue & { tenant: Tenant };
  }
}
