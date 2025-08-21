import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      this.logger.log('🔄 Tentando conectar ao banco de dados...');
      await this.$connect();
      this.logger.log('✅ Conectado ao banco de dados com sucesso');
    } catch (error) {
      this.logger.error('❌ Erro ao conectar ao banco de dados:', error.message);
      this.logger.warn('⚠️ Aplicação continuará sem conexão inicial com banco');
      // Não falha a inicialização - permite que a aplicação inicie sem banco
    }
  }
}
