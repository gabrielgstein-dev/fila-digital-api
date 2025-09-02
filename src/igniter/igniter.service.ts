import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Igniter } from '@igniter-js/core';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

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
  private igniter: any;
  private readonly REFRESH_THRESHOLD = 5 * 60; // 5 minutos antes da expiração

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {
    // Inicializar Igniter com contexto
    this.igniter = Igniter.context(() => ({
      database: this.prisma,
      jwtService: this.jwtService,
    })).create();
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

  // Métodos específicos de negócio usando Igniter
  async getDashboardMetrics(userId: string, tenantId: string) {
    return {
      userMetrics: {
        userId,
        tenantId,
        lastLogin: new Date().toISOString(),
      },
      tenantMetrics: {
        totalTickets: 100,
        activeAgents: 5,
        avgWaitTime: '10min',
        queueLength: 15,
      },
    };
  }

  async getPublicMetrics() {
    return {
      totalUsers: 1000,
      totalTickets: 5000,
      avgWaitTime: '15min',
      systemStatus: 'operational',
    };
  }

  async generateChartData(type: string, period: string) {
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
    };
  }
}
