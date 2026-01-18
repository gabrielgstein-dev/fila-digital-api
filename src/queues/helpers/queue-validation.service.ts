import { Injectable } from '@nestjs/common';
import { Queue, Tenant } from '@prisma/client';
import {
    QueueInactiveException,
    QueueNotFoundException,
    TenantInactiveException,
} from '../../common/exceptions/business.exceptions';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class QueueValidationService {
  constructor(private prisma: PrismaService) {}

  async validateQueueForCall(
    queueId: string,
    tenantId: string,
  ): Promise<Queue & { tenant: Tenant }> {
    const queue = await this.prisma.queue.findFirst({
      where: { id: queueId, tenantId },
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

    if (!queue.tenant.isActive) {
      throw new TenantInactiveException();
    }

    return queue as Queue & { tenant: Tenant };
  }

  async validateQueueAccess(
    queueId: string,
    tenantId: string,
  ): Promise<Queue> {
    const queue = await this.prisma.queue.findFirst({
      where: { id: queueId, tenantId },
    });

    if (!queue) {
      throw new QueueNotFoundException();
    }

    return queue;
  }
}
