import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    this.logger.log(
      '🔄 Tentando conectar ao banco de dados (não bloqueante)...',
    );

    const connectWithTimeout = async () => {
      return Promise.race([
        this.$connect(),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('Timeout de conexão (10s)')),
            10000,
          ),
        ),
      ]);
    };

    try {
      await connectWithTimeout();
      this.logger.log('✅ Conectado ao banco de dados com sucesso');
    } catch (error) {
      this.logger.error(
        '❌ Erro ao conectar ao banco de dados:',
        error instanceof Error ? error.message : String(error),
      );
      this.logger.warn(
        '⚠️ Aplicação continuará sem conexão inicial com banco - conexão será estabelecida sob demanda',
      );
    }
  }
}
