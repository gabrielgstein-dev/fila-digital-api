# Guia de Migração: Fila Backoffice para Igniter.js + MCP Server

## 📋 Visão Geral

Este guia mostra como migrar o projeto `fila-backoffice` (Next.js) para usar Igniter.js e MCP Server, aproveitando a solução reutilizável que criamos.

## 🎯 Estratégia de Migração

### **Abordagem Híbrida Recomendada:**
1. **Manter Next.js** para o frontend (UI/UX)
2. **Adicionar Igniter.js** para APIs internas e integração
3. **Configurar MCP Server** para integração com IA
4. **Migração gradual** sem quebrar funcionalidades existentes

## 🚀 Passo 1: Configuração Inicial

### 1.1 Instalar Dependências

```bash
cd ../fila-backoffice
pnpm add @igniter-js/core @igniter-js/mcp-server zod
```

### 1.2 Adicionar Scripts ao package.json

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    
    // Novos scripts para Igniter.js
    "igniter:dev": "tsx src/igniter/main.ts",
    "igniter:build": "tsc -p tsconfig.igniter.json",
    "igniter:start": "node dist/igniter/main.js",
    "mcp:dev": "tsx src/igniter/mcp-server.ts",
    "mcp:start": "node dist/igniter/mcp-server.js"
  }
}
```

## 🏗️ Passo 2: Estrutura do Projeto

### 2.1 Criar Estrutura Igniter.js

```
fila-backoffice/
├── src/
│   ├── app/                    # Next.js App Router (mantido)
│   ├── components/             # React Components (mantido)
│   ├── lib/                    # Utilitários (mantido)
│   ├── igniter/                # 🆕 Nova estrutura Igniter.js
│   │   ├── context.ts          # Contexto da aplicação
│   │   ├── router.ts           # Router principal
│   │   ├── main.ts             # Servidor HTTP
│   │   ├── mcp-server.ts       # MCP Server
│   │   └── controllers/        # Controladores
│   │       ├── api.controller.ts
│   │       ├── auth.controller.ts
│   │       └── dashboard.controller.ts
│   └── types/                  # Types (mantido)
├── .cursor/
│   └── mcp.json               # 🆕 Configuração MCP
├── .mcp-config.json           # 🆕 Configuração personalizada
└── tsconfig.igniter.json      # 🆕 TSConfig para Igniter.js
```

## 🔧 Passo 3: Implementação

### 3.1 Contexto da Aplicação

```typescript
// src/igniter/context.ts
import { PrismaClient } from '@prisma/client';

// Contexto específico para o backoffice
export const createBackofficeContext = () => {
  return {
    // Banco de dados (se usar Prisma)
    database: new PrismaClient(),
    
    // Configurações do backoffice
    config: {
      apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
      authSecret: process.env.NEXTAUTH_SECRET,
      googleClientId: process.env.GOOGLE_CLIENT_ID,
    },
    
    // Serviços específicos do backoffice
    services: {
      // Aqui você pode adicionar serviços específicos
      // como integração com APIs externas, etc.
    }
  };
};

export type BackofficeContext = ReturnType<typeof createBackofficeContext>;
```

### 3.2 Router Principal

```typescript
// src/igniter/router.ts
import { Igniter } from '@igniter-js/core';
import { createBackofficeContext } from './context';
import { apiController } from './controllers/api.controller';
import { authController } from './controllers/auth.controller';
import { dashboardController } from './controllers/dashboard.controller';

export const igniter = Igniter.context<BackofficeContext>().create();

export const BackofficeRouter = igniter.router({
  baseURL: process.env.IGNITER_BASE_URL || 'http://localhost:3001',
  basePATH: '/api/igniter',
  controllers: {
    api: apiController,
    auth: authController,
    dashboard: dashboardController,
  },
});

export type BackofficeRouter = typeof BackofficeRouter;
```

### 3.3 Controladores Específicos

#### API Controller
```typescript
// src/igniter/controllers/api.controller.ts
import { igniter } from '../router';
import { z } from 'zod';

export const apiController = igniter.controller({
  path: '/api',
  actions: {
    // Proxy para APIs externas
    proxy: igniter.mutation({
      path: '/proxy',
      body: z.object({
        url: z.string().url(),
        method: z.enum(['GET', 'POST', 'PUT', 'DELETE']),
        headers: z.record(z.string()).optional(),
        body: z.any().optional(),
      }),
      handler: async ({ input, context }) => {
        // Implementar proxy para APIs externas
        const response = await fetch(input.url, {
          method: input.method,
          headers: input.headers,
          body: input.body ? JSON.stringify(input.body) : undefined,
        });
        
        return {
          status: response.status,
          data: await response.json(),
        };
      },
    }),

    // Health check
    health: igniter.query({
      path: '/health',
      handler: async () => {
        return {
          status: 'ok',
          timestamp: new Date().toISOString(),
          service: 'fila-backoffice',
        };
      },
    }),
  },
});
```

#### Auth Controller
```typescript
// src/igniter/controllers/auth.controller.ts
import { igniter } from '../router';
import { z } from 'zod';

export const authController = igniter.controller({
  path: '/auth',
  actions: {
    // Validar token do NextAuth
    validateToken: igniter.mutation({
      path: '/validate',
      body: z.object({
        token: z.string(),
      }),
      handler: async ({ input, context }) => {
        // Implementar validação de token
        // Integrar com NextAuth se necessário
        return {
          valid: true,
          user: {
            id: 'user-id',
            email: 'user@example.com',
          },
        };
      },
    }),

    // Refresh token
    refresh: igniter.mutation({
      path: '/refresh',
      body: z.object({
        refreshToken: z.string(),
      }),
      handler: async ({ input, context }) => {
        // Implementar refresh de token
        return {
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
        };
      },
    }),
  },
});
```

#### Dashboard Controller
```typescript
// src/igniter/controllers/dashboard.controller.ts
import { igniter } from '../router';
import { z } from 'zod';

export const dashboardController = igniter.controller({
  path: '/dashboard',
  actions: {
    // Métricas do dashboard
    metrics: igniter.query({
      path: '/metrics',
      handler: async ({ context }) => {
        // Buscar métricas do banco de dados
        return {
          totalUsers: 1000,
          activeSessions: 50,
          totalTickets: 5000,
          avgWaitTime: '15min',
        };
      },
    }),

    // Dados para gráficos
    chartData: igniter.query({
      path: '/chart-data',
      body: z.object({
        type: z.enum(['users', 'tickets', 'sessions']),
        period: z.enum(['day', 'week', 'month']),
      }),
      handler: async ({ input, context }) => {
        // Gerar dados para gráficos
        return {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
          datasets: [{
            label: input.type,
            data: [10, 20, 30, 40, 50],
          }],
        };
      },
    }),
  },
});
```

### 3.4 Servidor HTTP

```typescript
// src/igniter/main.ts
import { BackofficeRouter } from './router';
import { createServer } from 'http';

async function bootstrap() {
  console.log('🚀 Iniciando servidor Igniter.js para Backoffice...');
  
  const port = process.env.IGNITER_PORT || 3001;
  
  createServer(async (req, res) => {
    try {
      const request = new Request(`http://${req.headers.host}${req.url}`, {
        method: req.method,
        headers: req.headers as any,
        body: req.method !== 'GET' && req.method !== 'HEAD' ? 
          await getRequestBody(req) : undefined,
      });

      const response = await BackofficeRouter.handler(request);

      res.statusCode = response.status;
      for (const [key, value] of response.headers.entries()) {
        res.setHeader(key, value);
      }
      res.end(await response.text());
    } catch (error) {
      console.error('❌ Erro ao processar requisição:', error);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  }).listen(Number(port), () => {
    console.log(`✅ Servidor Igniter.js rodando em http://localhost:${port}`);
    console.log(`📊 Dashboard: http://localhost:${port}/api/igniter/dashboard/metrics`);
  });
}

async function getRequestBody(req: any): Promise<string> {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk: Buffer) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      resolve(body);
    });
  });
}

bootstrap().catch(console.error);
```

## 🔧 Passo 4: Configuração MCP Server

### 4.1 MCP Server Específico

```typescript
// src/igniter/mcp-server.ts
import { BackofficeRouter } from './router';
import { createBackofficeContext } from './context';

// Configuração específica para o backoffice
const backofficeMcpConfig = {
  name: 'fila-backoffice-igniter',
  description: 'MCP Server para Fila Backoffice com Igniter.js',
  version: '0.3.0-stage',
  router: BackofficeRouter,
  context: createBackofficeContext,
  
  // Ferramentas específicas do backoffice
  tools: [
    {
      name: 'get-dashboard-metrics',
      description: 'Obtém métricas do dashboard',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'get-chart-data',
      description: 'Obtém dados para gráficos',
      inputSchema: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['users', 'tickets', 'sessions'] },
          period: { type: 'string', enum: ['day', 'week', 'month'] },
        },
      },
    },
    {
      name: 'validate-auth-token',
      description: 'Valida token de autenticação',
      inputSchema: {
        type: 'object',
        properties: {
          token: { type: 'string' },
        },
        required: ['token'],
      },
    },
  ],
};

console.log('✅ MCP Server do Backoffice configurado:', backofficeMcpConfig.name);

export default backofficeMcpConfig;
```

### 4.2 Configuração do Cursor

```json
// .cursor/mcp.json
{
  "mcpServers": {
    "fila-backoffice": {
      "command": "node",
      "args": ["./src/igniter/mcp-server.js"],
      "env": {
        "NODE_ENV": "development",
        "IGNITER_PORT": "3001",
        "NEXT_PUBLIC_API_URL": "http://localhost:8080"
      }
    }
  }
}
```

### 4.3 Configuração Personalizada

```json
// .mcp-config.json
{
  "name": "fila-backoffice",
  "description": "MCP Server para Fila Backoffice",
  "version": "0.3.0-stage",
  "projectType": "nextjs-igniter",
  "customTools": [
    {
      "name": "get-dashboard-metrics",
      "description": "Obtém métricas do dashboard",
      "inputSchema": {
        "type": "object",
        "properties": {}
      }
    },
    {
      "name": "get-chart-data",
      "description": "Obtém dados para gráficos",
      "inputSchema": {
        "type": "object",
        "properties": {
          "type": { "type": "string", "enum": ["users", "tickets", "sessions"] },
          "period": { "type": "string", "enum": ["day", "week", "month"] }
        }
      }
    }
  ],
  "endpoints": {
    "baseUrl": "http://localhost:3001",
    "basePath": "/api/igniter",
    "custom": [
      "GET /api/igniter/api/health - Health check",
      "GET /api/igniter/dashboard/metrics - Métricas do dashboard",
      "POST /api/igniter/auth/validate - Validar token",
      "POST /api/igniter/api/proxy - Proxy para APIs externas"
    ]
  },
  "environment": {
    "required": ["NEXTAUTH_SECRET"],
    "optional": ["GOOGLE_CLIENT_ID", "IGNITER_PORT"]
  }
}
```

## 🔄 Passo 5: Integração com Next.js

### 5.1 API Routes do Next.js (mantidas)

```typescript
// src/app/api/igniter/[...path]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { BackofficeRouter } from '@/igniter/router';

export async function GET(request: NextRequest) {
  return handleIgniterRequest(request);
}

export async function POST(request: NextRequest) {
  return handleIgniterRequest(request);
}

export async function PUT(request: NextRequest) {
  return handleIgniterRequest(request);
}

export async function DELETE(request: NextRequest) {
  return handleIgniterRequest(request);
}

async function handleIgniterRequest(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const path = url.pathname.replace('/api/igniter', '');
    
    const igniterRequest = new Request(`http://localhost:3001${path}`, {
      method: request.method,
      headers: request.headers,
      body: request.body,
    });

    const response = await BackofficeRouter.handler(igniterRequest);
    
    return new NextResponse(await response.text(), {
      status: response.status,
      headers: response.headers,
    });
  } catch (error) {
    console.error('Erro na API Igniter:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
```

### 5.2 Hook para usar Igniter.js

```typescript
// src/hooks/useIgniter.ts
import { useQuery, useMutation } from '@tanstack/react-query';

const IGNITER_BASE_URL = process.env.NEXT_PUBLIC_IGNITER_URL || 'http://localhost:3001';

export function useIgniterQuery<T>(path: string, options?: any) {
  return useQuery({
    queryKey: ['igniter', path],
    queryFn: async () => {
      const response = await fetch(`${IGNITER_BASE_URL}/api/igniter${path}`);
      if (!response.ok) throw new Error('Failed to fetch');
      return response.json() as T;
    },
    ...options,
  });
}

export function useIgniterMutation<T, V>(path: string, options?: any) {
  return useMutation({
    mutationFn: async (data: V) => {
      const response = await fetch(`${IGNITER_BASE_URL}/api/igniter${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to mutate');
      return response.json() as T;
    },
    ...options,
  });
}
```

### 5.3 Componente de Dashboard

```typescript
// src/components/Dashboard.tsx
import { useIgniterQuery } from '@/hooks/useIgniter';

export function Dashboard() {
  const { data: metrics, isLoading } = useIgniterQuery('/dashboard/metrics');
  
  if (isLoading) return <div>Carregando...</div>;
  
  return (
    <div className="grid grid-cols-4 gap-4">
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold">Total de Usuários</h3>
        <p className="text-3xl font-bold">{metrics?.totalUsers}</p>
      </div>
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold">Sessões Ativas</h3>
        <p className="text-3xl font-bold">{metrics?.activeSessions}</p>
      </div>
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold">Total de Tickets</h3>
        <p className="text-3xl font-bold">{metrics?.totalTickets}</p>
      </div>
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold">Tempo Médio</h3>
        <p className="text-3xl font-bold">{metrics?.avgWaitTime}</p>
      </div>
    </div>
  );
}
```

## 🚀 Passo 6: Scripts de Setup

### 6.1 Script Automático

```bash
#!/bin/bash
# scripts/setup-igniter-backoffice.sh

echo "🚀 Configurando Igniter.js no Fila Backoffice..."

# Copiar arquivos do projeto irmão
cp ../fila-api/src/igniter/mcp-server-reusable.js ./src/igniter/
cp ../fila-api/.mcp-config.json ./

# Personalizar configuração
sed -i 's/fila-api-igniter/fila-backoffice-igniter/g' .mcp-config.json
sed -i 's/igniter/nextjs-igniter/g' .mcp-config.json

# Criar configuração do Cursor
mkdir -p .cursor
cat > .cursor/mcp.json << EOF
{
  "mcpServers": {
    "fila-backoffice": {
      "command": "node",
      "args": ["./src/igniter/mcp-server-reusable.js"],
      "env": {
        "NODE_ENV": "development",
        "IGNITER_PORT": "3001"
      }
    }
  }
}
EOF

echo "✅ Configuração concluída!"
echo "📋 Próximos passos:"
echo "1. pnpm install @igniter-js/core @igniter-js/mcp-server zod"
echo "2. pnpm run igniter:dev"
echo "3. Reiniciar o Cursor"
```

## 🧪 Passo 7: Testes

### 7.1 Testar Servidor Igniter.js

```bash
# Terminal 1: Next.js
pnpm run dev

# Terminal 2: Igniter.js
pnpm run igniter:dev

# Terminal 3: Testar APIs
curl http://localhost:3001/api/igniter/api/health
curl http://localhost:3001/api/igniter/dashboard/metrics
```

### 7.2 Testar MCP Server

```bash
# Testar MCP server
node src/igniter/mcp-server-reusable.js

# Saída esperada:
# 🚀 Iniciando MCP Server Reutilizável...
# 📦 Projeto: fila-backoffice
# 🔧 Tipo: nextjs-igniter
# ✅ MCP Server reutilizável configurado e pronto!
```

## 📊 Benefícios da Migração

### 1. **Integração com IA**
- ✅ MCP Server para Cursor
- ✅ Ferramentas específicas do backoffice
- ✅ Automação de tarefas

### 2. **APIs Tipadas**
- ✅ Type safety end-to-end
- ✅ Validação com Zod
- ✅ Documentação automática

### 3. **Arquitetura Híbrida**
- ✅ Next.js para frontend
- ✅ Igniter.js para APIs
- ✅ Melhor performance

### 4. **Reutilização**
- ✅ Mesmo MCP server do projeto irmão
- ✅ Configuração personalizada
- ✅ Manutenção centralizada

## 🎯 Próximos Passos

1. **Implementar** a estrutura básica
2. **Migrar** APIs existentes gradualmente
3. **Adicionar** ferramentas MCP específicas
4. **Testar** integração completa
5. **Documentar** APIs e ferramentas

A migração permite aproveitar o melhor dos dois mundos: Next.js para UI e Igniter.js para APIs tipadas e integração com IA! 🚀
