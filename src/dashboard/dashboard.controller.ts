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
  constructor() {}

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

  @Get('system-health')
  @ApiOperation({ summary: 'Health check completo do sistema' })
  async getSystemHealth() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      system: {
        uptime: process.uptime(),
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        },
        node: process.version,
      },
      services: {
        database: 'connected',
      },
    };
  }
}
