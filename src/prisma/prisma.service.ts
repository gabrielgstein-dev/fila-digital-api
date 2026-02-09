import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error('DATABASE_URL não está configurada');
    }

    const isLocalDb =
      databaseUrl.includes('localhost') ||
      databaseUrl.includes('127.0.0.1') ||
      databaseUrl.includes('postgres-e2e') ||
      process.env.NODE_ENV === 'test';

    const pool = new Pool({
      connectionString: databaseUrl,
      ...(isLocalDb ? {} : { ssl: { rejectUnauthorized: false } }),
    });
    const adapter = new PrismaPg(pool);

    super({
      adapter,
      errorFormat: 'minimal',
      log: ['error', 'warn'],
    });
  }

  async onModuleInit() {
    this.logger.log(' Tentando conectar ao banco de dados (não bloqueante)...');

    const connectPromise = this.$connect();

    const connectWithTimeout = async () => {
      return Promise.race([
        connectPromise,
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('Timeout de conexão (10s)')),
            10_000,
          ),
        ),
      ]);
    };

    try {
      await connectWithTimeout();
      this.logger.log(' Conectado ao banco de dados com sucesso');
    } catch (error) {
      this.logger.error(
        ' Erro ao conectar ao banco de dados:',
        error instanceof Error ? error.message : String(error),
      );
      this.logger.warn(
        ' Aplicação continuará sem conexão inicial com banco - conexão será estabelecida sob demanda',
      );
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
