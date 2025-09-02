# Integração NextAuth + Igniter.js - Guia Completo

## 🎯 Visão Geral

Esta integração combina o melhor do NextAuth (autenticação/sessão) com Igniter.js (APIs tipadas + tempo real), criando uma solução poderosa para:

- ✅ **Tempo real por usuário/tenant/role**
- ✅ **Autorização centralizada (RBAC)**
- ✅ **DX consistente**
- ✅ **Segurança + Performance**

## 🏗️ Arquitetura da Integração

```
NextAuth (Autenticação) + Igniter.js (APIs + Realtime)
├── NextAuth v5: auth.ts + handlers
├── Procedure Auth: middleware que valida sessão
├── RBAC: roles e permissões centralizadas
├── Realtime: SSE com scopes por usuário
└── Frontend: IgniterProvider com sessão
```

## 🔧 Implementação

### 1. Procedure de Autenticação

```typescript
// src/igniter/procedures/auth.procedure.ts
import { igniter } from '../router';
import { auth } from '@/lib/auth'; // NextAuth v5
import { NextRequest } from 'next/server';

export const authProcedure = igniter.procedure({
  handler: async ({ request, response }) => {
    try {
      // Converter Request para NextRequest
      const nextRequest = new NextRequest(request.url, {
        method: request.method,
        headers: request.headers,
        body: request.body,
      });

      // Obter sessão do NextAuth
      const session = await auth(nextRequest);
      
      if (!session?.user) {
        return response.unauthorized({ 
          message: 'Usuário não autenticado' 
        });
      }

      // Retornar contexto de autenticação
      return {
        auth: {
          user: session.user,
          userId: session.user.id,
          role: session.user.role,
          tenantId: session.user.tenantId,
          tenant: session.user.tenant,
          accessToken: session.user.accessToken,
          userType: session.user.userType,
        }
      };
    } catch (error) {
      console.error('❌ Erro na procedure de auth:', error);
      return response.unauthorized({ 
        message: 'Erro na autenticação' 
      });
    }
  },
});

// Procedure para roles específicos
export const createRoleProcedure = (requiredRoles: string[]) => 
  igniter.procedure({
    handler: async ({ request, response }) => {
      // Primeiro validar autenticação
      const authResult = await authProcedure.handler({ request, response });
      
      if (authResult.status !== 200) {
        return authResult;
      }

      const { auth } = authResult.data;
      
      // Verificar se o usuário tem o role necessário
      if (!requiredRoles.includes(auth.role)) {
        return response.forbidden({ 
          message: `Acesso negado. Roles necessários: ${requiredRoles.join(', ')}` 
        });
      }

      return { auth };
    },
  });
```

### 2. Controladores com RBAC

```typescript
// src/igniter/controllers/dashboard.controller.ts
import { igniter } from '../router';
import { authProcedure, createRoleProcedure } from '../procedures/auth.procedure';
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
          },
          tenantMetrics: {
            totalTickets: 100,
            activeAgents: 5,
            avgWaitTime: '10min',
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
          },
          userMetrics: {
            totalUsers: 10000,
            activeUsers: 5000,
            newUsersToday: 100,
          },
        };
      },
    }),

    // Atualizar métricas (apenas admin)
    updateMetrics: igniter.mutation({
      path: '/update-metrics',
      use: [createRoleProcedure(['admin'])],
      body: z.object({
        metricType: z.enum(['users', 'tickets', 'revenue']),
        value: z.number(),
      }),
      handler: async ({ input, context, auth, response }) => {
        // Lógica para atualizar métricas
        const updatedMetric = {
          type: input.metricType,
          value: input.value,
          updatedBy: auth.userId,
          updatedAt: new Date().toISOString(),
        };

        // Revalidar apenas para usuários com acesso
        return response.success(updatedMetric).revalidate(
          ['dashboard.metrics'],
          (ctx) => [
            `user:${auth.userId}`,
            `role:${auth.role}`,
            `tenant:${auth.tenantId}`,
          ]
        );
      },
    }),
  },
});
```

### 3. Sistema de Scopes para Realtime

```typescript
// src/igniter/utils/scopes.ts
export interface UserScopes {
  userId: string;
  role: string;
  tenantId: string;
  permissions: string[];
}

export function createUserScopes(session: any): string[] {
  if (!session?.user) return [];

  const scopes = [
    `user:${session.user.id}`,
    `role:${session.user.role}`,
    `tenant:${session.user.tenantId}`,
  ];

  // Adicionar scopes baseados em permissões
  if (session.user.role === 'admin') {
    scopes.push('admin:*');
  }

  if (session.user.role === 'super_admin') {
    scopes.push('super_admin:*');
  }

  return scopes;
}

export function canAccessScope(userScopes: string[], requiredScopes: string[]): boolean {
  return requiredScopes.some(required => 
    userScopes.some(user => 
      user === required || 
      user.endsWith(':*') && required.startsWith(user.slice(0, -2))
    )
  );
}
```

### 4. IgniterProvider para Frontend

```typescript
// src/providers/IgniterProvider.tsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { createUserScopes } from '@/igniter/utils/scopes';

interface IgniterContextType {
  scopes: string[];
  isConnected: boolean;
  connectionError: string | null;
}

const IgniterContext = createContext<IgniterContextType>({
  scopes: [],
  isConnected: false,
  connectionError: null,
});

export function IgniterProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [scopes, setScopes] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'authenticated' && session) {
      const userScopes = createUserScopes(session);
      setScopes(userScopes);
      
      // Conectar ao SSE do Igniter.js
      connectToIgniterSSE(userScopes);
    } else {
      setScopes([]);
      setIsConnected(false);
    }
  }, [session, status]);

  const connectToIgniterSSE = (userScopes: string[]) => {
    try {
      const eventSource = new EventSource(
        `/api/igniter/sse?scopes=${encodeURIComponent(JSON.stringify(userScopes))}`
      );

      eventSource.onopen = () => {
        setIsConnected(true);
        setConnectionError(null);
        console.log('✅ Conectado ao Igniter.js SSE');
      };

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('📡 Dados recebidos via SSE:', data);
        
        // Aqui você pode processar os dados recebidos
        // Por exemplo, atualizar estado do React Query
      };

      eventSource.onerror = (error) => {
        console.error('❌ Erro na conexão SSE:', error);
        setConnectionError('Erro na conexão em tempo real');
        setIsConnected(false);
      };

      return () => {
        eventSource.close();
      };
    } catch (error) {
      console.error('❌ Erro ao conectar SSE:', error);
      setConnectionError('Erro ao conectar');
    }
  };

  return (
    <IgniterContext.Provider value={{ scopes, isConnected, connectionError }}>
      {children}
    </IgniterContext.Provider>
  );
}

export function useIgniter() {
  const context = useContext(IgniterContext);
  if (!context) {
    throw new Error('useIgniter deve ser usado dentro de IgniterProvider');
  }
  return context;
}
```

### 5. Hooks para Consumir APIs

```typescript
// src/hooks/useIgniterAuth.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';

const IGNITER_BASE_URL = process.env.NEXT_PUBLIC_IGNITER_URL || 'http://localhost:3001';

export function useIgniterAuthQuery<T>(path: string, options?: any) {
  const { data: session } = useSession();
  
  return useQuery({
    queryKey: ['igniter', path, session?.user?.id],
    queryFn: async () => {
      const response = await fetch(`${IGNITER_BASE_URL}/api/igniter${path}`, {
        headers: {
          'Authorization': `Bearer ${session?.user?.accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json() as T;
    },
    enabled: !!session?.user?.accessToken,
    ...options,
  });
}

export function useIgniterAuthMutation<T, V>(path: string, options?: any) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: V) => {
      const response = await fetch(`${IGNITER_BASE_URL}/api/igniter${path}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.user?.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json() as T;
    },
    onSuccess: () => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['igniter'] });
    },
    ...options,
  });
}
```

### 6. Componente de Dashboard com Realtime

```typescript
// src/components/Dashboard.tsx
'use client';

import { useIgniterAuthQuery } from '@/hooks/useIgniterAuth';
import { useIgniter } from '@/providers/IgniterProvider';

export function Dashboard() {
  const { scopes, isConnected } = useIgniter();
  
  // Métricas públicas (sem auth)
  const { data: publicMetrics } = useIgniterAuthQuery('/dashboard/public-metrics');
  
  // Métricas privadas (com auth)
  const { data: privateMetrics } = useIgniterAuthQuery('/dashboard/private-metrics');
  
  // Métricas administrativas (apenas admin)
  const { data: adminMetrics } = useIgniterAuthQuery('/dashboard/admin-metrics', {
    enabled: scopes.includes('admin:*') || scopes.includes('super_admin:*'),
  });

  return (
    <div className="space-y-6">
      {/* Status da conexão */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Status da Conexão</h2>
          <div className={`px-3 py-1 rounded-full text-sm ${
            isConnected 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {isConnected ? 'Conectado' : 'Desconectado'}
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          Scopes: {scopes.join(', ')}
        </p>
      </div>

      {/* Métricas públicas */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold">Total de Usuários</h3>
          <p className="text-3xl font-bold">{publicMetrics?.totalUsers}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold">Total de Tickets</h3>
          <p className="text-3xl font-bold">{publicMetrics?.totalTickets}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold">Tempo Médio</h3>
          <p className="text-3xl font-bold">{publicMetrics?.avgWaitTime}</p>
        </div>
      </div>

      {/* Métricas privadas */}
      {privateMetrics && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold">Métricas do Usuário</h3>
            <p className="text-sm text-gray-600">ID: {privateMetrics.userMetrics.userId}</p>
            <p className="text-sm text-gray-600">Role: {privateMetrics.userMetrics.role}</p>
            <p className="text-sm text-gray-600">Tenant: {privateMetrics.userMetrics.tenantId}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold">Métricas do Tenant</h3>
            <p className="text-sm text-gray-600">Tickets: {privateMetrics.tenantMetrics.totalTickets}</p>
            <p className="text-sm text-gray-600">Agentes: {privateMetrics.tenantMetrics.activeAgents}</p>
            <p className="text-sm text-gray-600">Tempo: {privateMetrics.tenantMetrics.avgWaitTime}</p>
          </div>
        </div>
      )}

      {/* Métricas administrativas */}
      {adminMetrics && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold">Métricas Administrativas</h3>
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div>
              <p className="text-sm text-gray-600">Total de Tenants</p>
              <p className="text-2xl font-bold">{adminMetrics.systemMetrics.totalTenants}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Receita Total</p>
              <p className="text-2xl font-bold">R$ {adminMetrics.systemMetrics.totalRevenue}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Saúde do Sistema</p>
              <p className="text-2xl font-bold">{adminMetrics.systemMetrics.systemHealth}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

### 7. Configuração do App

```typescript
// src/app/layout.tsx
import { SessionProvider } from 'next-auth/react';
import { IgniterProvider } from '@/providers/IgniterProvider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <SessionProvider>
          <QueryClientProvider client={queryClient}>
            <IgniterProvider>
              {children}
            </IgniterProvider>
          </QueryClientProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
```

## 🎯 Benefícios da Integração

### 1. **Tempo Real Eficiente e Seguro**
- ✅ SSE com scopes por usuário/tenant/role
- ✅ Revalidação direcionada
- ✅ Performance otimizada

### 2. **Autorização Centralizada (RBAC)**
- ✅ Procedures de auth reutilizáveis
- ✅ Roles e permissões centralizadas
- ✅ Segurança em todas as rotas

### 3. **DX Consistente**
- ✅ NextAuth para login/sessões
- ✅ Igniter.js para APIs tipadas
- ✅ Realtime com SSE
- ✅ OpenAPI/Studio automático

### 4. **Segurança + Performance**
- ✅ Autenticação robusta
- ✅ Autorização granular
- ✅ Cache inteligente
- ✅ Revalidação otimizada

## 🚀 Próximos Passos

1. **Implementar** a estrutura básica
2. **Configurar** procedures de auth
3. **Adicionar** RBAC nas rotas
4. **Testar** tempo real com scopes
5. **Otimizar** performance

Esta integração cria uma solução poderosa que combina o melhor do NextAuth com Igniter.js! 🎉
