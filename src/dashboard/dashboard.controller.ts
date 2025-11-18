import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IgniterService } from '../rt/igniter.service';

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
  @ApiOperation({
    summary: 'Obter métricas públicas',
    description:
      'Retorna métricas públicas do sistema que podem ser exibidas sem autenticação. Use este endpoint para exibir estatísticas gerais do sistema em landing pages, páginas públicas ou para monitoramento externo.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Métricas públicas retornadas com sucesso. Retorna objeto com estatísticas gerais do sistema.',
    schema: {
      type: 'object',
      example: {
        totalTenants: 150,
        totalQueues: 500,
        totalTicketsToday: 5000,
        activeQueues: 320,
        timestamp: '2024-01-15T16:00:00.000Z',
      },
    },
  })
  async getPublicMetrics() {
    return this.igniterService.getPublicMetrics();
  }

  @Get('private-metrics')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obter métricas privadas (autenticado)',
    description:
      'Retorna métricas privadas do usuário autenticado, incluindo dados do seu tenant e usuário. Use este endpoint para dashboards pessoais e visualizações de dados específicos do usuário autenticado.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Métricas privadas retornadas com sucesso. Retorna métricas específicas do usuário e tenant autenticado.',
    schema: {
      type: 'object',
      example: {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        tenantId: '123e4567-e89b-12d3-a456-426614174001',
        metrics: {
          totalQueues: 10,
          activeTickets: 25,
          completedToday: 150,
        },
      },
    },
  })
  async getPrivateMetrics(@Request() req: any) {
    const { userId, tenantId } = req.user;
    return this.igniterService.getDashboardMetrics(userId, tenantId);
  }

  @Get('admin-metrics')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obter métricas administrativas',
    description:
      'Retorna métricas administrativas do sistema. Apenas administradores (admin ou super_admin) podem acessar. Use este endpoint para dashboards administrativos e monitoramento do sistema como um todo.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Métricas administrativas retornadas com sucesso. Retorna estatísticas gerais do sistema incluindo tenants, receita, saúde do sistema e métricas de usuários.',
    schema: {
      type: 'object',
      example: {
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
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado - apenas administradores podem acessar.',
    schema: {
      type: 'object',
      example: {
        statusCode: 403,
        message: 'Acesso negado',
        error: 'Forbidden',
      },
    },
  })
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
  @ApiOperation({
    summary: 'Obter métricas do tenant',
    description:
      'Retorna métricas específicas do tenant do usuário autenticado. Use este endpoint para dashboards gerenciais e relatórios específicos do tenant, incluindo estatísticas de usuários, tickets e satisfação do cliente.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Métricas do tenant retornadas com sucesso. Retorna estatísticas completas do tenant incluindo usuários, tickets e satisfação.',
    schema: {
      type: 'object',
      example: {
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        metrics: {
          totalUsers: 200,
          activeTickets: 25,
          completedTickets: 150,
          avgResolutionTime: '20min',
          customerSatisfaction: 4.5,
        },
      },
    },
  })
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
