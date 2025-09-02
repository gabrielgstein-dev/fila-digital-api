import { igniter } from '../router';
import {
  authProcedure,
  createRoleProcedure,
  createPermissionProcedure,
} from '../procedures/auth.procedure';
import { z } from 'zod';

export const dashboardController = igniter.controller({
  path: '/dashboard',
  actions: {
    // Métricas públicas (sem auth)
    publicMetrics: igniter.query({
      path: '/public-metrics',
      handler: async ({ context }) => {
        return {
          totalUsers: 1000,
          totalTickets: 5000,
          avgWaitTime: '15min',
          systemStatus: 'operational',
        };
      },
    }),

    // Métricas privadas (com auth)
    privateMetrics: igniter.query({
      path: '/private-metrics',
      use: [authProcedure],
      handler: async ({ context, auth }) => {
        // auth está disponível via procedure
        return {
          userMetrics: {
            userId: auth.userId,
            role: auth.role,
            tenantId: auth.tenantId,
            lastLogin: new Date().toISOString(),
          },
          tenantMetrics: {
            totalTickets: 100,
            activeAgents: 5,
            avgWaitTime: '10min',
            queueLength: 15,
          },
        };
      },
    }),

    // Métricas administrativas (apenas admin)
    adminMetrics: igniter.query({
      path: '/admin-metrics',
      use: [createRoleProcedure(['admin', 'super_admin'])],
      handler: async ({ context, auth }) => {
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
      },
    }),

    // Métricas por tenant (acesso ao próprio tenant)
    tenantMetrics: igniter.query({
      path: '/tenant-metrics',
      use: [authProcedure],
      handler: async ({ context, auth }) => {
        return {
          tenantId: auth.tenantId,
          metrics: {
            totalUsers: 200,
            activeTickets: 25,
            completedTickets: 150,
            avgResolutionTime: '20min',
            customerSatisfaction: 4.5,
          },
        };
      },
    }),

    // Atualizar métricas (apenas admin)
    updateMetrics: igniter.mutation({
      path: '/update-metrics',
      use: [createRoleProcedure(['admin'])],
      body: z.object({
        metricType: z.enum(['users', 'tickets', 'revenue', 'performance']),
        value: z.number(),
        description: z.string().optional(),
      }),
      handler: async ({ input, context, auth, response }) => {
        // Lógica para atualizar métricas
        const updatedMetric = {
          type: input.metricType,
          value: input.value,
          description: input.description,
          updatedBy: auth.userId,
          updatedAt: new Date().toISOString(),
        };

        // Revalidar apenas para usuários com acesso
        return response
          .success(updatedMetric)
          .revalidate(['dashboard.metrics'], (ctx) => [
            `user:${auth.userId}`,
            `role:${auth.role}`,
            `tenant:${auth.tenantId}`,
          ]);
      },
    }),

    // Obter dados para gráficos
    chartData: igniter.query({
      path: '/chart-data',
      use: [authProcedure],
      body: z.object({
        type: z.enum(['users', 'tickets', 'sessions', 'revenue']),
        period: z.enum(['day', 'week', 'month', 'year']),
        tenantId: z.string().optional(),
      }),
      handler: async ({ input, context, auth }) => {
        // Verificar se o usuário tem acesso ao tenant solicitado
        if (
          input.tenantId &&
          input.tenantId !== auth.tenantId &&
          auth.role !== 'admin'
        ) {
          throw new Error('Acesso negado ao tenant solicitado');
        }

        const targetTenantId = input.tenantId || auth.tenantId;

        // Gerar dados para gráficos baseado no tipo e período
        const generateChartData = (type: string, period: string) => {
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
        };

        return {
          tenantId: targetTenantId,
          chartData: generateChartData(input.type, input.period),
          metadata: {
            generatedAt: new Date().toISOString(),
            requestedBy: auth.userId,
            period: input.period,
            type: input.type,
          },
        };
      },
    }),

    // Webhook para receber atualizações em tempo real
    realtimeUpdate: igniter.mutation({
      path: '/realtime-update',
      use: [authProcedure],
      body: z.object({
        eventType: z.enum([
          'ticket_created',
          'ticket_updated',
          'user_joined',
          'user_left',
        ]),
        data: z.any(),
        targetScopes: z.array(z.string()).optional(),
      }),
      handler: async ({ input, context, auth, response }) => {
        // Determinar scopes de destino baseado no evento
        let targetScopes = input.targetScopes || [];

        if (!targetScopes.length) {
          switch (input.eventType) {
            case 'ticket_created':
            case 'ticket_updated':
              targetScopes = [`tenant:${auth.tenantId}`, `role:${auth.role}`];
              break;
            case 'user_joined':
            case 'user_left':
              targetScopes = [`tenant:${auth.tenantId}`, 'role:admin'];
              break;
            default:
              targetScopes = [`user:${auth.userId}`];
          }
        }

        const eventData = {
          eventType: input.eventType,
          data: input.data,
          timestamp: new Date().toISOString(),
          source: auth.userId,
          tenantId: auth.tenantId,
        };

        // Revalidar para os scopes específicos
        return response
          .success(eventData)
          .revalidate(['dashboard.realtime'], (ctx) => targetScopes);
      },
    }),

    // Status da conexão em tempo real
    connectionStatus: igniter.query({
      path: '/connection-status',
      use: [authProcedure],
      handler: async ({ context, auth }) => {
        return {
          userId: auth.userId,
          tenantId: auth.tenantId,
          role: auth.role,
          scopes: [
            `user:${auth.userId}`,
            `role:${auth.role}`,
            `tenant:${auth.tenantId}`,
          ],
          connectedAt: new Date().toISOString(),
          status: 'connected',
        };
      },
    }),
  },
});
