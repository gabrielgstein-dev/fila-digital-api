import { signIn, signOut } from 'next-auth/react';

export interface TokenInfo {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  userId: string;
}

export class TokenManager {
  private static instance: TokenManager;
  private refreshPromise: Promise<string> | null = null;

  static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager();
    }
    return TokenManager.instance;
  }

  /**
   * Decodifica um JWT e retorna as informações do token
   */
  decodeToken(token: string): any {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload;
    } catch (error) {
      console.error('Erro ao decodificar token:', error);
      return null;
    }
  }

  /**
   * Verifica se um token está expirado
   */
  isTokenExpired(token: string): boolean {
    const payload = this.decodeToken(token);
    if (!payload || !payload.exp) return true;

    const expirationTime = payload.exp * 1000; // Converter para ms
    const currentTime = Date.now();

    return currentTime >= expirationTime;
  }

  /**
   * Calcula o tempo restante até a expiração do token
   */
  getTimeUntilExpiration(token: string): number {
    const payload = this.decodeToken(token);
    if (!payload || !payload.exp) return 0;

    const expirationTime = payload.exp * 1000;
    const currentTime = Date.now();

    return Math.max(0, Math.floor((expirationTime - currentTime) / 1000));
  }

  /**
   * Verifica se o token está próximo da expiração
   */
  isTokenExpiringSoon(token: string, thresholdSeconds: number = 300): boolean {
    const timeLeft = this.getTimeUntilExpiration(token);
    return timeLeft <= thresholdSeconds && timeLeft > 0;
  }

  /**
   * Renova o token usando o refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<string> {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Falha ao renovar token');
      }

      const data = await response.json();
      return data.accessToken;
    } catch (error) {
      console.error('Erro ao renovar token:', error);
      throw error;
    }
  }

  /**
   * Renova o token automaticamente se necessário
   */
  async ensureValidToken(
    currentToken: string,
    refreshToken?: string,
  ): Promise<string> {
    // Se o token ainda é válido, retorna ele
    if (!this.isTokenExpired(currentToken)) {
      return currentToken;
    }

    // Se não há refresh token, não é possível renovar
    if (!refreshToken) {
      throw new Error('Token expirado e não há refresh token disponível');
    }

    // Evita múltiplas tentativas de renovação simultâneas
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.refreshAccessToken(refreshToken);

    try {
      const newToken = await this.refreshPromise;
      return newToken;
    } finally {
      this.refreshPromise = null;
    }
  }

  /**
   * Força o logout do usuário
   */
  async forceLogout(): Promise<void> {
    console.log('🚪 Forçando logout devido à expiração do token');
    await signOut({ callbackUrl: '/login' });
  }

  /**
   * Formata o tempo restante em uma string legível
   */
  formatTimeLeft(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }

  /**
   * Cria um interceptor para requisições HTTP que renova tokens automaticamente
   */
  createTokenInterceptor() {
    return async (request: Request): Promise<Response> => {
      // Aqui você pode implementar a lógica para interceptar requisições
      // e renovar tokens automaticamente quando necessário

      const response = await fetch(request);

      // Se a resposta indica token expirado, tentar renovar
      if (response.status === 401) {
        // Implementar lógica de renovação automática
        console.log('🔄 Token expirado detectado, tentando renovar...');
      }

      return response;
    };
  }
}

// Instância singleton
export const tokenManager = TokenManager.getInstance();
