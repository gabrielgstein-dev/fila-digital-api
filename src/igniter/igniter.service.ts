import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { Igniter } from '@igniter-js/core';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { CacheEntry, PerformanceMetrics } from './types';

export interface TokenInfo {
  token: string;
  expiresAt: Date;
  expiresIn: number; // segundos até expirar
  shouldRefresh: boolean; // true se deve ser renovado em breve
  timeToExpire: string; // formato legível (ex: "15min")
}

export interface SessionInfo {
  userId: string;
  tenantId: string;
  role: string;
  tokenInfo: TokenInfo;
  sessionStart: Date;
  lastActivity: Date;
}

@Injectable()
export class IgniterService {
  private readonly logger = new Logger(IgniterService.name);
  private igniter: any;
  private readonly REFRESH_THRESHOLD = 5 * 60; // 5 minutos antes da expiração

  // 🚀 Sistema de Cache Avançado
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutos
  private readonly METRICS_TTL = 2 * 60 * 1000; // 2 minutos para métricas
  private readonly SESSION_TTL = 10 * 60 * 1000; // 10 minutos para sessões

  // 📊 Métricas de Performance
  private performanceMetrics: PerformanceMetrics = {
    requestCount: 0,
    cacheHits: 0,
    cacheMisses: 0,
    avgResponseTime: 0,
    lastUpdated: new Date(),
  };

  // 🧹 Limpeza automática de cache
  private cacheCleanupInterval: NodeJS.Timeout;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {
    // Inicializar Igniter com contexto otimizado
    this.igniter = Igniter.context(() => ({
      database: this.prisma,
      jwtService: this.jwtService,
    })).create();

    // Iniciar limpeza automática de cache a cada 5 minutos
    this.cacheCleanupInterval = setInterval(
      () => {
        this.cleanExpiredCache();
      },
      5 * 60 * 1000,
    );

    this.logger.log(
      '🚀 IgniterService initialized with performance optimizations',
    );
  }

  // 🧹 Limpeza de cache expirado
  private cleanExpiredCache(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug(
        `🧹 Cache cleanup: ${cleanedCount} expired entries removed`,
      );
    }
  }

  // 🚀 Sistema de cache genérico
  private async getCachedOrFetch<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number = this.DEFAULT_TTL,
  ): Promise<T> {
    const startTime = Date.now();
    this.performanceMetrics.requestCount++;

    // Verificar cache
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      this.performanceMetrics.cacheHits++;
      this.logger.debug(`🎯 Cache HIT for key: ${key}`);
      return cached.data;
    }

    // Cache miss - buscar dados
    this.performanceMetrics.cacheMisses++;
    this.logger.debug(`💾 Cache MISS for key: ${key} - fetching fresh data`);

    try {
      const data = await fetchFn();

      // Armazenar no cache
      this.cache.set(key, {
        data,
        timestamp: Date.now(),
        ttl,
      });

      // Atualizar métricas de performance
      const responseTime = Date.now() - startTime;
      this.performanceMetrics.avgResponseTime =
        (this.performanceMetrics.avgResponseTime + responseTime) / 2;
      this.performanceMetrics.lastUpdated = new Date();

      return data;
    } catch (error) {
      this.logger.error(`❌ Error fetching data for key ${key}:`, error);
      throw error;
    }
  }

  // 📊 Obter métricas de performance
  getPerformanceMetrics(): PerformanceMetrics & {
    cacheSize: number;
    hitRate: number;
  } {
    const total =
      this.performanceMetrics.cacheHits + this.performanceMetrics.cacheMisses;
    const hitRate =
      total > 0 ? (this.performanceMetrics.cacheHits / total) * 100 : 0;

    return {
      ...this.performanceMetrics,
      cacheSize: this.cache.size,
      hitRate: Math.round(hitRate * 100) / 100,
    };
  }

  // 🗑️ Limpar cache manualmente
  clearCache(pattern?: string): number {
    if (!pattern) {
      const size = this.cache.size;
      this.cache.clear();
      this.logger.log(`🗑️ Cache cleared: ${size} entries removed`);
      return size;
    }

    let removedCount = 0;
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        removedCount++;
      }
    }

    this.logger.log(
      `🗑️ Cache cleared with pattern '${pattern}': ${removedCount} entries removed`,
    );
    return removedCount;
  }

  // 🛑 Cleanup ao destruir o serviço
  onModuleDestroy() {
    if (this.cacheCleanupInterval) {
      clearInterval(this.cacheCleanupInterval);
    }
    this.cache.clear();
    this.logger.log('🛑 IgniterService destroyed and cache cleared');
  }

  // Método para executar queries do Igniter
  async executeQuery(queryName: string, params?: any) {
    // Implementar lógica de execução de queries
    return this.igniter.query(queryName, params);
  }

  // Método para executar mutations do Igniter
  async executeMutation(mutationName: string, data?: any) {
    // Implementar lógica de execução de mutations
    return this.igniter.mutation(mutationName, data);
  }

  // ==================== GERENCIAMENTO DE TOKEN/SESSÃO ====================

  /**
   * Analisa um token JWT e retorna informações sobre sua validade e tempo de vida
   */
  async analyzeToken(token: string): Promise<TokenInfo> {
    try {
      const decoded = this.jwtService.decode(token) as any;

      if (!decoded || !decoded.exp) {
        throw new UnauthorizedException('Token inválido');
      }

      const now = Math.floor(Date.now() / 1000);
      const expiresAt = new Date(decoded.exp * 1000);
      const expiresIn = decoded.exp - now;
      const shouldRefresh = expiresIn <= this.REFRESH_THRESHOLD;

      // Verificar se já expirou
      if (expiresIn <= 0) {
        throw new UnauthorizedException('Token expirado');
      }

      return {
        token,
        expiresAt,
        expiresIn,
        shouldRefresh,
        timeToExpire: this.formatTimeRemaining(expiresIn),
      };
    } catch {
      throw new UnauthorizedException('Erro ao analisar token');
    }
  }

  /**
   * Obtém informações completas da sessão baseada no token
   */
  async getSessionInfo(token: string): Promise<SessionInfo> {
    const tokenInfo = await this.analyzeToken(token);
    const decoded = this.jwtService.decode(token) as any;

    return {
      userId: decoded.sub || decoded.userId,
      tenantId: decoded.tenantId,
      role: decoded.role,
      tokenInfo,
      sessionStart: new Date(decoded.iat * 1000),
      lastActivity: new Date(),
    };
  }

  /**
   * Verifica se o token deve ser renovado
   */
  async shouldRefreshToken(token: string): Promise<boolean> {
    try {
      const tokenInfo = await this.analyzeToken(token);
      return tokenInfo.shouldRefresh;
    } catch {
      return false;
    }
  }

  /**
   * Gera um novo token com base nos dados do usuário
   */
  async refreshToken(
    oldToken: string,
  ): Promise<{ access_token: string; expires_in: number }> {
    const sessionInfo = await this.getSessionInfo(oldToken);

    const payload = {
      sub: sessionInfo.userId,
      tenantId: sessionInfo.tenantId,
      role: sessionInfo.role,
      userType: 'agent', // ou obter do token original
    };

    const newToken = this.jwtService.sign(payload);
    const decoded = this.jwtService.decode(newToken) as any;
    const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);

    return {
      access_token: newToken,
      expires_in: expiresIn,
    };
  }

  /**
   * Formata o tempo restante em formato legível
   */
  private formatTimeRemaining(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}min`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}min`;
  }

  // 🚀 Métodos específicos de negócio otimizados com cache
  async getDashboardMetrics(userId: string, tenantId: string) {
    const cacheKey = `dashboard:metrics:${userId}:${tenantId}`;

    return this.getCachedOrFetch(
      cacheKey,
      async () => {
        this.logger.debug(
          `🔄 Fetching fresh dashboard metrics for user ${userId}, tenant ${tenantId}`,
        );

        // Simular busca no banco (substituir por queries reais do Prisma)
        const userMetrics = {
          userId,
          tenantId,
          lastLogin: new Date().toISOString(),
        };

        const tenantMetrics = {
          totalTickets: Math.floor(Math.random() * 200) + 50, // Dados mais realistas
          activeAgents: Math.floor(Math.random() * 10) + 1,
          avgWaitTime: `${Math.floor(Math.random() * 20) + 5}min`,
          queueLength: Math.floor(Math.random() * 30) + 5,
        };

        return { userMetrics, tenantMetrics };
      },
      this.METRICS_TTL,
    );
  }

  async getPublicMetrics() {
    const cacheKey = 'public:metrics';

    return this.getCachedOrFetch(
      cacheKey,
      async () => {
        this.logger.debug('🔄 Fetching fresh public metrics');

        // Simular busca agregada no banco
        return {
          totalUsers: Math.floor(Math.random() * 2000) + 800,
          totalTickets: Math.floor(Math.random() * 10000) + 3000,
          avgWaitTime: `${Math.floor(Math.random() * 30) + 10}min`,
          systemStatus: 'operational',
          lastUpdated: new Date().toISOString(),
        };
      },
      this.METRICS_TTL,
    );
  }

  async generateChartData(type: string, period: string) {
    const cacheKey = `chart:data:${type}:${period}`;

    return this.getCachedOrFetch(
      cacheKey,
      async () => {
        this.logger.debug(
          `🔄 Generating fresh chart data for type ${type}, period ${period}`,
        );

        const periods = {
          day: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
          week: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
          month: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'],
          year: [
            'Jan',
            'Fev',
            'Mar',
            'Abr',
            'Mai',
            'Jun',
            'Jul',
            'Ago',
            'Set',
            'Out',
            'Nov',
            'Dez',
          ],
        };

        const labels = periods[period as keyof typeof periods] || periods.day;

        return {
          labels,
          datasets: [
            {
              label: type,
              data: labels.map(() => Math.floor(Math.random() * 100)),
              backgroundColor: 'rgba(59, 130, 246, 0.5)',
              borderColor: 'rgba(59, 130, 246, 1)',
              borderWidth: 1,
            },
          ],
          generatedAt: new Date().toISOString(),
        };
      },
      this.METRICS_TTL,
    );
  }
}
