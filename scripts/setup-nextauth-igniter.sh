#!/bin/bash

# Script para configurar integração NextAuth + Igniter.js
# Uso: ./scripts/setup-nextauth-igniter.sh

set -e

BACKOFFICE_PATH="../fila-backoffice"
CURRENT_DIR=$(pwd)

echo "🚀 Configurando integração NextAuth + Igniter.js..."
echo "📁 Diretório do backoffice: $BACKOFFICE_PATH"

# Verificar se o diretório existe
if [ ! -d "$BACKOFFICE_PATH" ]; then
    echo "❌ Diretório $BACKOFFICE_PATH não existe"
    exit 1
fi

# Navegar para o diretório do backoffice
cd "$BACKOFFICE_PATH"

echo "📦 Instalando dependências adicionais..."

# Instalar dependências necessárias
pnpm add @tanstack/react-query

echo "📁 Criando estrutura de diretórios..."

# Criar estrutura de diretórios
mkdir -p src/igniter/procedures
mkdir -p src/igniter/utils
mkdir -p src/igniter/controllers
mkdir -p src/providers
mkdir -p src/hooks

echo "📄 Copiando arquivos de integração..."

# Copiar arquivos de integração
cp "$CURRENT_DIR/src/igniter/procedures/auth.procedure.ts" ./src/igniter/procedures/
cp "$CURRENT_DIR/src/igniter/utils/scopes.ts" ./src/igniter/utils/
cp "$CURRENT_DIR/src/igniter/controllers/dashboard.controller.ts" ./src/igniter/controllers/
cp "$CURRENT_DIR/src/igniter/router.ts" ./src/igniter/
cp "$CURRENT_DIR/src/providers/IgniterProvider.tsx" ./src/providers/
cp "$CURRENT_DIR/src/hooks/useIgniterAuth.ts" ./src/hooks/
cp "$CURRENT_DIR/src/components/Dashboard.tsx" ./src/components/

# Copiar arquivos de timeout de token
cp "$CURRENT_DIR/src/hooks/useTokenTimeout.ts" ./src/hooks/
cp "$CURRENT_DIR/src/components/TokenTimeoutModal.tsx" ./src/components/
cp "$CURRENT_DIR/src/components/TokenStatusBar.tsx" ./src/components/
cp "$CURRENT_DIR/src/components/DashboardWithTimeout.tsx" ./src/components/
cp "$CURRENT_DIR/src/providers/TokenTimeoutProvider.tsx" ./src/providers/
cp "$CURRENT_DIR/src/lib/tokenManager.ts" ./src/lib/
cp "$CURRENT_DIR/src/app/layout-with-timeout.tsx" ./src/app/

echo "⚙️ Atualizando configurações..."

# Atualizar tsconfig para incluir novos arquivos
if [ -f "tsconfig.json" ]; then
    # Backup do tsconfig original
    cp tsconfig.json tsconfig.json.backup
    
    # Adicionar paths para Igniter.js
    node -e "
    const fs = require('fs');
    const tsconfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
    
    tsconfig.compilerOptions = {
      ...tsconfig.compilerOptions,
      paths: {
        ...tsconfig.compilerOptions.paths,
        '@/*': ['./src/*'],
        '@/igniter/*': ['./src/igniter/*'],
        '@/providers/*': ['./src/providers/*'],
        '@/hooks/*': ['./src/hooks/*'],
        '@/components/*': ['./src/components/*'],
        '@/lib/*': ['./src/lib/*'],
        '@/config/*': ['./src/config/*'],
        '@/types/*': ['./src/types/*']
      }
    };
    
    fs.writeFileSync('tsconfig.json', JSON.stringify(tsconfig, null, 2));
    "
fi

echo "🔧 Atualizando package.json..."

# Adicionar scripts ao package.json
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

pkg.scripts = {
  ...pkg.scripts,
  'igniter:dev': 'tsx src/igniter/main.ts',
  'igniter:build': 'tsc -p tsconfig.igniter.json',
  'igniter:start': 'node dist/igniter/main.js',
  'mcp:dev': 'tsx src/igniter/mcp-server.ts',
  'mcp:start': 'node dist/igniter/mcp-server.js',
  'dev:full': 'concurrently \"pnpm run dev\" \"pnpm run igniter:dev\"',
  'build:full': 'pnpm run build && pnpm run igniter:build'
};

fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
"

echo "📄 Criando arquivo de layout atualizado..."

# Criar arquivo de layout com providers
cat > src/app/layout-with-providers.tsx << 'EOF'
import { SessionProvider } from 'next-auth/react';
import { IgniterProvider } from '@/providers/IgniterProvider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export default function RootLayoutWithProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minuto
        refetchOnWindowFocus: false,
      },
    },
  }));

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
EOF

echo "📄 Criando página de teste do dashboard..."

# Criar página de teste
mkdir -p src/app/dashboard
cat > src/app/dashboard/page.tsx << 'EOF'
'use client';

import { Dashboard } from '@/components/Dashboard';

export default function DashboardPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Dashboard - NextAuth + Igniter.js</h1>
      <Dashboard />
    </div>
  );
}
EOF

echo "📄 Criando API route para SSE..."

# Criar API route para Server-Sent Events
mkdir -p src/app/api/igniter/sse
cat > src/app/api/igniter/sse/route.ts << 'EOF'
import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const session = await auth(request);
  
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const scopes = request.nextUrl.searchParams.get('scopes');
  
  if (!scopes) {
    return new Response('Scopes required', { status: 400 });
  }

  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(controller) {
      // Enviar mensagem de conexão
      const connectMessage = {
        type: 'connected',
        timestamp: new Date().toISOString(),
        userId: session.user.id,
        scopes: JSON.parse(scopes),
      };
      
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify(connectMessage)}\n\n`)
      );

      // Simular atualizações periódicas
      const interval = setInterval(() => {
        const updateMessage = {
          type: 'dashboard_update',
          timestamp: new Date().toISOString(),
          data: {
            metric: 'tickets',
            value: Math.floor(Math.random() * 100),
          },
        };
        
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(updateMessage)}\n\n`)
        );
      }, 10000); // A cada 10 segundos

      // Cleanup
      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
}
EOF

echo "📄 Criando API route para Igniter.js..."

# Criar API route para Igniter.js
mkdir -p src/app/api/igniter/[...path]
cat > src/app/api/igniter/[...path]/route.ts << 'EOF'
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
EOF

echo "📄 Criando arquivo de tipos..."

# Criar arquivo de tipos para Igniter.js
cat > src/types/igniter.ts << 'EOF'
export interface IgniterUser {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId: string;
  tenant: string;
  accessToken: string;
  userType: string;
}

export interface IgniterAuth {
  user: IgniterUser;
  userId: string;
  role: string;
  tenantId: string;
  tenant: string;
  accessToken: string;
  userType: string;
}

export interface IgniterContext {
  auth?: IgniterAuth;
  config: {
    apiUrl: string;
    authSecret: string;
    googleClientId: string;
  };
  services: Record<string, any>;
}

export interface IgniterScopes {
  userScopes: string[];
  tenantScopes: string[];
  roleScopes: string[];
}

export interface IgniterEvent {
  type: string;
  timestamp: string;
  data: any;
  source?: string;
  tenantId?: string;
}
EOF

echo "🧪 Testando configuração..."

# Testar se os arquivos foram criados corretamente
if [ -f "src/igniter/router.ts" ] && [ -f "src/providers/IgniterProvider.tsx" ]; then
    echo "✅ Arquivos de integração criados com sucesso"
else
    echo "❌ Erro ao criar arquivos de integração"
    exit 1
fi

# Voltar ao diretório original
cd "$CURRENT_DIR"

echo ""
echo "🎉 Integração NextAuth + Igniter.js configurada com sucesso!"
echo ""
echo "📋 Próximos passos:"
echo "1. cd ../fila-backoffice"
echo "2. pnpm run dev:full  # Iniciar Next.js + Igniter.js"
echo "3. Acessar http://localhost:3000/dashboard"
echo "4. Fazer login para testar a integração"
echo ""
echo "🔗 URLs importantes:"
echo "  - Next.js: http://localhost:3000"
echo "  - Igniter.js: http://localhost:3001"
echo "  - Dashboard: http://localhost:3000/dashboard"
echo "  - API Igniter: http://localhost:3000/api/igniter/dashboard/public-metrics"
echo "  - SSE: http://localhost:3000/api/igniter/sse"
echo ""
echo "📁 Arquivos criados:"
echo "  - src/igniter/procedures/auth.procedure.ts"
echo "  - src/igniter/utils/scopes.ts"
echo "  - src/igniter/controllers/dashboard.controller.ts"
echo "  - src/providers/IgniterProvider.tsx"
echo "  - src/hooks/useIgniterAuth.ts"
echo "  - src/components/Dashboard.tsx"
echo "  - src/app/dashboard/page.tsx"
echo "  - src/app/api/igniter/sse/route.ts"
echo "  - src/app/api/igniter/[...path]/route.ts"
echo "  - src/types/igniter.ts"
echo ""
echo "🔧 Para personalizar:"
echo "  - Edite src/igniter/controllers/ para adicionar mais endpoints"
echo "  - Edite src/igniter/procedures/ para modificar autenticação"
echo "  - Edite src/components/Dashboard.tsx para customizar UI"
echo ""
echo "📚 Documentação: docs/NEXTAUTH-IGNITER-INTEGRATION.md"
