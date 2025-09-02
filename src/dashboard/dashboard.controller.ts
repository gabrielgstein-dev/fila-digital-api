import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IgniterService } from '../igniter/igniter.service';

// DTOs para validação
export class UpdateMetricsDto {
  metricType: 'users' | 'tickets' | 'revenue' | 'performance';
  value: number;
  description?: string;
}

export class ChartDataQueryDto {
  type?: string = 'users';
  period?: string = 'day';
  tenantId?: string;
}

@ApiTags('Dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly igniterService: IgniterService) {}

  @Get('public-metrics')
  @ApiOperation({ summary: 'Obter métricas públicas' })
  async getPublicMetrics() {
    return this.igniterService.getPublicMetrics();
  }

  @Get('private-metrics')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obter métricas privadas (autenticado)' })
  async getPrivateMetrics(@Request() req: any) {
    const { userId, tenantId } = req.user;
    return this.igniterService.getDashboardMetrics(userId, tenantId);
  }

  @Get('admin-metrics')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obter métricas administrativas' })
  async getAdminMetrics(@Request() req: any) {
    // Verificar se é admin
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      throw new Error('Acesso negado');
    }

    return {
      systemMetrics: {
        totalTenants: 50,
        totalRevenue: 100000,
        systemHealth: 'excellent',
        uptime: '99.9%',
      },
      userMetrics: {
        totalUsers: 10000,
        activeUsers: 5000,
        newUsersToday: 100,
        avgSessionTime: '45min',
      },
    };
  }

  @Get('tenant-metrics')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obter métricas do tenant' })
  async getTenantMetrics(@Request() req: any) {
    const { tenantId } = req.user;

    return {
      tenantId,
      metrics: {
        totalUsers: 200,
        activeTickets: 25,
        completedTickets: 150,
        avgResolutionTime: '20min',
        customerSatisfaction: 4.5,
      },
    };
  }

  @Post('update-metrics')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atualizar métricas (admin)' })
  async updateMetrics(
    @Body() updateMetricsDto: UpdateMetricsDto,
    @Request() req: any,
  ) {
    // Verificar se é admin
    if (req.user.role !== 'admin') {
      throw new Error('Acesso negado');
    }

    const updatedMetric = {
      type: updateMetricsDto.metricType,
      value: updateMetricsDto.value,
      description: updateMetricsDto.description,
      updatedBy: req.user.userId,
      updatedAt: new Date().toISOString(),
    };

    return {
      success: true,
      data: updatedMetric,
    };
  }

  @Get('chart-data')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obter dados para gráficos' })
  async getChartData(@Query() query: ChartDataQueryDto, @Request() req: any) {
    const { type = 'users', period = 'day', tenantId } = query;
    const targetTenantId = tenantId || req.user.tenantId;

    const chartData = await this.igniterService.generateChartData(type, period);

    return {
      tenantId: targetTenantId,
      chartData,
      metadata: {
        generatedAt: new Date().toISOString(),
        requestedBy: req.user.userId,
        period,
        type,
      },
    };
  }

  @Get('connection-status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Status da conexão' })
  async getConnectionStatus(@Request() req: any) {
    const { userId, tenantId, role } = req.user;

    return {
      userId,
      tenantId,
      role,
      scopes: [`user:${userId}`, `role:${role}`, `tenant:${tenantId}`],
      connectedAt: new Date().toISOString(),
      status: 'connected',
    };
  }

  // ==================== ENDPOINTS DE GERENCIAMENTO DE SESSÃO ====================

  @Get('session-info')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Informações completas da sessão e token' })
  async getSessionInfo(@Request() req: any) {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      throw new Error('Token não fornecido');
    }

    const sessionInfo = await this.igniterService.getSessionInfo(token);

    return {
      ...sessionInfo,
      // Adicionar informações extras para o frontend
      warnings: {
        tokenExpiring: sessionInfo.tokenInfo.shouldRefresh,
        timeRemaining: sessionInfo.tokenInfo.timeToExpire,
      },
    };
  }

  @Post('refresh-token')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Renovar token de acesso' })
  async refreshToken(@Request() req: any) {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      throw new Error('Token não fornecido');
    }

    // Verificar se o token deve ser renovado
    const shouldRefresh = await this.igniterService.shouldRefreshToken(token);

    if (!shouldRefresh) {
      return {
        message: 'Token ainda não precisa ser renovado',
        current_token_info: await this.igniterService.analyzeToken(token),
      };
    }

    const newTokenData = await this.igniterService.refreshToken(token);

    return {
      message: 'Token renovado com sucesso',
      ...newTokenData,
      refreshed_at: new Date().toISOString(),
    };
  }

  @Get('token-status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Status do token atual' })
  async getTokenStatus(@Request() req: any) {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      throw new Error('Token não fornecido');
    }

    const tokenInfo = await this.igniterService.analyzeToken(token);

    return {
      status: tokenInfo.shouldRefresh ? 'expiring_soon' : 'valid',
      ...tokenInfo,
      recommendations: {
        should_refresh: tokenInfo.shouldRefresh,
        action: tokenInfo.shouldRefresh
          ? 'Renovar token em breve'
          : 'Token válido, nenhuma ação necessária',
      },
    };
  }

  // ==================== ENDPOINTS DE MONITORAMENTO E PERFORMANCE ====================

  @Get('performance-metrics')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Métricas de performance do sistema' })
  async getPerformanceMetrics(@Request() req: any) {
    // Verificar se é admin
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      throw new Error('Acesso negado - apenas administradores');
    }

    return {
      ...this.igniterService.getPerformanceMetrics(),
      timestamp: new Date().toISOString(),
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
      },
    };
  }

  @Post('clear-cache')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Limpar cache do sistema' })
  async clearCache(@Request() req: any, @Body() body?: { pattern?: string }) {
    // Verificar se é admin
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      throw new Error('Acesso negado - apenas administradores');
    }

    const clearedCount = this.igniterService.clearCache(body?.pattern);

    return {
      success: true,
      message: `Cache limpo com sucesso`,
      clearedEntries: clearedCount,
      pattern: body?.pattern || 'all',
      clearedBy: req.user.userId,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('system-health')
  @ApiOperation({ summary: 'Health check completo do sistema' })
  async getSystemHealth() {
    const performanceMetrics = this.igniterService.getPerformanceMetrics();

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      performance: {
        cacheHitRate: performanceMetrics.hitRate,
        avgResponseTime: performanceMetrics.avgResponseTime,
        requestCount: performanceMetrics.requestCount,
        cacheSize: performanceMetrics.cacheSize,
      },
      system: {
        uptime: process.uptime(),
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        },
        node: process.version,
      },
      services: {
        database: 'connected', // TODO: implementar check real
        cache: 'active',
        igniter: 'running',
      },
    };
  }
}
