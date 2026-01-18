import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { QUEUE_PREFIXES } from '../../common/constants/queue.constants';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TicketNumberService {
  private readonly logger = new Logger(TicketNumberService.name);

  constructor(private prisma: PrismaService) {}

  async getNextTicketNumber(
    queueId: string,
    queueType: string,
  ): Promise<string> {
    const prefix = this.getQueuePrefix(queueType);

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const result = await this.prisma.$queryRaw<
          Array<{ max_number: bigint | null }>
        >`
          SELECT MAX(
            CAST(
              NULLIF(
                REGEXP_REPLACE("myCallingToken", '[^0-9]', '', 'g'),
                ''
              ) AS INTEGER
            )
          ) as max_number
          FROM tickets
          WHERE "queueId" = ${queueId}
            AND "myCallingToken" LIKE ${`${prefix}%`}
        `;

        const maxNumber = result[0]?.max_number
          ? Number(result[0].max_number)
          : 0;
        const nextNumber = maxNumber + 1;
        return `${prefix}${nextNumber}`;
      } catch (error) {
        this.logger.error(
          `Erro ao gerar número do ticket (tentativa ${attempt}): ${error instanceof Error ? error.message : String(error)}`,
          error instanceof Error ? error.stack : undefined,
        );

        if (attempt === 3) {
          throw new InternalServerErrorException(
            'Não foi possível gerar número do ticket',
          );
        }

        await this.delay(100 * attempt);
      }
    }

    throw new InternalServerErrorException(
      'Não foi possível gerar número do ticket após múltiplas tentativas',
    );
  }

  private getQueuePrefix(queueType: string): string {
    switch (queueType) {
      case 'PRIORITY':
        return QUEUE_PREFIXES.PRIORITY;
      case 'VIP':
        return QUEUE_PREFIXES.VIP;
      default:
        return QUEUE_PREFIXES.GENERAL;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
