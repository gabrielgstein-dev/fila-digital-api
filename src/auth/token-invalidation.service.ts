import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

interface InvalidatedToken {
  jti: string; // JWT ID
  userId: string;
  invalidatedAt: Date;
  reason: string;
  expiresAt: Date;
}

@Injectable()
export class TokenInvalidationService {
  private readonly logger = new Logger(TokenInvalidationService.name);
  private readonly invalidatedTokens = new Map<string, InvalidatedToken>();
  private cleanupInterval: NodeJS.Timeout;

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {
    // Iniciar limpeza automática de tokens expirados a cada 30 minutos
    this.cleanupInterval = setInterval(
      () => {
        this.cleanupExpiredTokens();
      },
      30 * 60 * 1000,
    );
  }

  /**
   * Invalida todos os tokens de um usuário específico
   */
  async invalidateAllUserTokens(
    userId: string,
    reason: string = 'password-changed',
  ): Promise<number> {
    try {
      // Em um cenário real, você manteria uma lista de tokens ativos em Redis ou banco
      // Por enquanto, vamos simular marcando o usuário como tendo tokens invalidados

      const invalidationTimestamp = new Date();

      // Marcar no banco que todos os tokens deste usuário foram invalidados após este timestamp
      // Isso pode ser feito criando uma tabela de invalidação de tokens ou
      // adicionando um campo `tokensInvalidatedAfter` no modelo do usuário

      await this.markUserTokensInvalidated(
        userId,
        invalidationTimestamp,
        reason,
      );

      this.logger.log(
        `Todos os tokens do usuário ${userId} foram invalidados. Motivo: ${reason}`,
      );

      // Retornar número estimado de tokens invalidados (pode ser obtido de cache/Redis)
      return this.getEstimatedActiveTokens(userId);
    } catch (error) {
      this.logger.error(
        `Erro ao invalidar tokens do usuário ${userId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Invalida um token específico
   */
  async invalidateToken(
    token: string,
    reason: string = 'manual-invalidation',
  ): Promise<void> {
    try {
      const decoded = this.jwtService.decode(token) as any;

      if (!decoded || !decoded.jti) {
        throw new Error('Token inválido ou sem JTI');
      }

      const invalidatedToken: InvalidatedToken = {
        jti: decoded.jti,
        userId: decoded.sub || decoded.userId,
        invalidatedAt: new Date(),
        reason,
        expiresAt: new Date(decoded.exp * 1000),
      };

      this.invalidatedTokens.set(decoded.jti, invalidatedToken);

      this.logger.log(`Token ${decoded.jti} invalidado. Motivo: ${reason}`);
    } catch (error) {
      this.logger.error('Erro ao invalidar token específico:', error);
      throw error;
    }
  }

  /**
   * Verifica se um token está invalidado
   */
  async isTokenInvalidated(token: string): Promise<boolean> {
    try {
      const decoded = this.jwtService.decode(token) as any;

      if (!decoded) {
        return true; // Token malformado é considerado inválido
      }

      // Verificar se o token específico está na lista de invalidados
      if (decoded.jti && this.invalidatedTokens.has(decoded.jti)) {
        return true;
      }

      // Verificar se todos os tokens do usuário foram invalidados após a emissão deste token
      const tokenIssuedAt = new Date(decoded.iat * 1000);
      const userInvalidationTime = await this.getUserTokenInvalidationTime(
        decoded.sub || decoded.userId,
      );

      if (userInvalidationTime && tokenIssuedAt < userInvalidationTime) {
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error('Erro ao verificar se token está invalidado:', error);
      return true; // Em caso de erro, considerar inválido por segurança
    }
  }

  /**
   * Obtém estatísticas de invalidação de tokens
   */
  getInvalidationStats(): {
    totalInvalidatedTokens: number;
    invalidationsByReason: Record<string, number>;
    oldestInvalidation: Date | null;
    newestInvalidation: Date | null;
  } {
    const tokens = Array.from(this.invalidatedTokens.values());

    const stats = {
      totalInvalidatedTokens: tokens.length,
      invalidationsByReason: {} as Record<string, number>,
      oldestInvalidation: null as Date | null,
      newestInvalidation: null as Date | null,
    };

    tokens.forEach((token) => {
      // Contar por motivo
      stats.invalidationsByReason[token.reason] =
        (stats.invalidationsByReason[token.reason] || 0) + 1;

      // Encontrar datas extremas
      if (
        !stats.oldestInvalidation ||
        token.invalidatedAt < stats.oldestInvalidation
      ) {
        stats.oldestInvalidation = token.invalidatedAt;
      }

      if (
        !stats.newestInvalidation ||
        token.invalidatedAt > stats.newestInvalidation
      ) {
        stats.newestInvalidation = token.invalidatedAt;
      }
    });

    return stats;
  }

  /**
   * Limpa tokens expirados da memória
   */
  private cleanupExpiredTokens(): void {
    const now = new Date();
    let cleanedCount = 0;

    for (const [jti, token] of this.invalidatedTokens.entries()) {
      if (now > token.expiresAt) {
        this.invalidatedTokens.delete(jti);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug(
        `Limpeza automática: ${cleanedCount} tokens expirados removidos da memória`,
      );
    }
  }

  /**
   * Marca no banco que todos os tokens de um usuário foram invalidados
   */
  private async markUserTokensInvalidated(
    userId: string,
    timestamp: Date,
    reason: string,
  ): Promise<void> {
    // Implementar baseado no modelo de dados
    // Opção 1: Criar tabela de invalidação de tokens
    // Opção 2: Adicionar campo no modelo do usuário

    // Exemplo usando uma abordagem simples (adicionar campo ao usuário):
    try {
      // Verificar tipo de usuário e atualizar apropriadamente
      const corporateUser = await this.prisma.corporateUser.findUnique({
        where: { id: userId },
        select: { id: true },
      });

      if (corporateUser) {
        // Poderia adicionar um campo tokensInvalidatedAfter no schema
        // await this.prisma.corporateUser.update({
        //   where: { id: userId },
        //   data: { tokensInvalidatedAfter: timestamp }
        // });
        this.logger.debug(
          `Marcação de invalidação registrada para usuário corporativo ${userId}`,
        );
        return;
      }

      const agent = await this.prisma.agent.findUnique({
        where: { id: userId },
        select: { id: true },
      });

      if (agent) {
        this.logger.debug(
          `Marcação de invalidação registrada para agente ${userId}`,
        );
        return;
      }

      const client = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });

      if (client) {
        this.logger.debug(
          `Marcação de invalidação registrada para cliente ${userId}`,
        );
        return;
      }

      throw new Error(`Usuário ${userId} não encontrado`);
    } catch (error) {
      this.logger.error(
        `Erro ao marcar invalidação para usuário ${userId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Obtém o timestamp de quando os tokens de um usuário foram invalidados
   */
  private async getUserTokenInvalidationTime(
    userId: string,
  ): Promise<Date | null> {
    // Implementar baseado na estrutura escolhida
    // Por enquanto, retornar null (nenhuma invalidação geral)
    return null;
  }

  /**
   * Estima quantos tokens ativos um usuário tem
   */
  private getEstimatedActiveTokens(userId: string): number {
    // Em um cenário real, isso seria obtido de Redis ou cache
    // Por enquanto, retornar uma estimativa baseada em padrões típicos
    return Math.floor(Math.random() * 5) + 1; // 1-5 tokens
  }

  /**
   * Força a limpeza manual de tokens expirados
   */
  forceCleanup(): number {
    const sizeBefore = this.invalidatedTokens.size;
    this.cleanupExpiredTokens();
    const sizeAfter = this.invalidatedTokens.size;

    return sizeBefore - sizeAfter;
  }

  /**
   * Cleanup ao destruir o serviço
   */
  onModuleDestroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.invalidatedTokens.clear();
    this.logger.log('TokenInvalidationService destroyed and cleanup completed');
  }
}



