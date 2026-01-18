import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export abstract class BaseRepository {
  protected readonly logger: Logger;

  constructor(
    protected prisma: PrismaService,
    loggerContext: string,
  ) {
    this.logger = new Logger(loggerContext);
  }

  protected handleQueryError(error: unknown, operation: string): never {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;

    this.logger.error(`Erro em ${operation}: ${message}`, stack);
    throw error;
  }

  protected async executeWithErrorHandling<T>(
    operation: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      this.handleQueryError(error, operation);
    }
  }
}
