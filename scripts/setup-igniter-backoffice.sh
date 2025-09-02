#!/bin/bash

# Script para configurar Igniter.js no projeto fila-backoffice
# Uso: ./scripts/setup-igniter-backoffice.sh

set -e

BACKOFFICE_PATH="../fila-backoffice"
CURRENT_DIR=$(pwd)

echo "🚀 Configurando Igniter.js no Fila Backoffice..."
echo "📁 Diretório do backoffice: $BACKOFFICE_PATH"

# Verificar se o diretório existe
if [ ! -d "$BACKOFFICE_PATH" ]; then
    echo "❌ Diretório $BACKOFFICE_PATH não existe"
    exit 1
fi

# Navegar para o diretório do backoffice
cd "$BACKOFFICE_PATH"

echo "📦 Instalando dependências do Igniter.js..."

# Instalar dependências
pnpm add @igniter-js/core @igniter-js/mcp-server zod tsx

echo "📁 Criando estrutura de diretórios..."

# Criar estrutura de diretórios
mkdir -p src/igniter/controllers
mkdir -p .cursor

echo "📄 Copiando arquivos de configuração..."

# Copiar MCP server reutilizável
cp "$CURRENT_DIR/src/igniter/mcp-server-reusable.js" ./src/igniter/

# Copiar configuração personalizada
cp "$CURRENT_DIR/.mcp-config.json" ./

# Personalizar configuração para o backoffice
sed -i 's/fila-api-igniter/fila-backoffice-igniter/g' .mcp-config.json
sed -i 's/igniter/nextjs-igniter/g' .mcp-config.json
sed -i 's/API de Fila Digital/Backoffice de Fila Digital/g' .mcp-config.json

echo "⚙️ Criando configuração do Cursor..."

# Criar configuração do Cursor
cat > .cursor/mcp.json << EOF
{
  "mcpServers": {
    "fila-backoffice": {
      "command": "node",
      "args": ["./src/igniter/mcp-server-reusable.js"],
      "env": {
        "NODE_ENV": "development",
        "IGNITER_PORT": "3001",
        "NEXT_PUBLIC_API_URL": "http://localhost:8080"
      }
    }
  }
}
EOF

echo "📝 Criando arquivos de configuração Igniter.js..."

# Criar tsconfig para Igniter.js
cat > tsconfig.igniter.json << EOF
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist/igniter",
    "rootDir": "./src/igniter",
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": [
    "src/igniter/**/*"
  ],
  "exclude": [
    "node_modules",
    "dist",
    ".next"
  ]
}
EOF

echo "🔧 Adicionando scripts ao package.json..."

# Adicionar scripts ao package.json (backup primeiro)
cp package.json package.json.backup

# Adicionar scripts usando Node.js
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

pkg.scripts = {
  ...pkg.scripts,
  'igniter:dev': 'tsx src/igniter/main.ts',
  'igniter:build': 'tsc -p tsconfig.igniter.json',
  'igniter:start': 'node dist/igniter/main.js',
  'mcp:dev': 'tsx src/igniter/mcp-server.ts',
  'mcp:start': 'node dist/igniter/mcp-server.js'
};

fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
"

echo "📄 Criando arquivos básicos do Igniter.js..."

# Criar contexto básico
cat > src/igniter/context.ts << 'EOF'
import { createBackofficeContext } from './context';

// Contexto específico para o backoffice
export const createBackofficeContext = () => {
  return {
    // Configurações do backoffice
    config: {
      apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
      authSecret: process.env.NEXTAUTH_SECRET,
      googleClientId: process.env.GOOGLE_CLIENT_ID,
    },
    
    // Serviços específicos do backoffice
    services: {
      // Aqui você pode adicionar serviços específicos
    }
  };
};

export type BackofficeContext = ReturnType<typeof createBackofficeContext>;
EOF

# Criar router básico
cat > src/igniter/router.ts << 'EOF'
import { Igniter } from '@igniter-js/core';
import { createBackofficeContext } from './context';

export const igniter = Igniter.context<BackofficeContext>().create();

export const BackofficeRouter = igniter.router({
  baseURL: process.env.IGNITER_BASE_URL || 'http://localhost:3001',
  basePATH: '/api/igniter',
  controllers: {
    // Controladores serão adicionados aqui
  },
});

export type BackofficeRouter = typeof BackofficeRouter;
EOF

# Criar servidor HTTP básico
cat > src/igniter/main.ts << 'EOF'
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
  });
}

bootstrap().catch(console.error);
EOF

# Criar controlador básico
cat > src/igniter/controllers/api.controller.ts << 'EOF'
import { igniter } from '../router';

export const apiController = igniter.controller({
  path: '/api',
  actions: {
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
EOF

echo "🧪 Testando configuração..."

# Testar MCP server
if node src/igniter/mcp-server-reusable.js > /dev/null 2>&1; then
    echo "✅ MCP server funcionando corretamente"
else
    echo "⚠️ MCP server pode ter problemas, verifique manualmente"
fi

# Voltar ao diretório original
cd "$CURRENT_DIR"

echo ""
echo "🎉 Configuração do Igniter.js no Backoffice concluída!"
echo ""
echo "📋 Próximos passos:"
echo "1. cd ../fila-backoffice"
echo "2. pnpm run igniter:dev  # Iniciar servidor Igniter.js"
echo "3. pnpm run dev          # Iniciar Next.js (em outro terminal)"
echo "4. Reiniciar o Cursor para carregar a configuração MCP"
echo ""
echo "🔗 URLs importantes:"
echo "  - Next.js: http://localhost:3000"
echo "  - Igniter.js: http://localhost:3001"
echo "  - Health check: http://localhost:3001/api/igniter/api/health"
echo ""
echo "📁 Arquivos criados:"
echo "  - src/igniter/context.ts"
echo "  - src/igniter/router.ts"
echo "  - src/igniter/main.ts"
echo "  - src/igniter/controllers/api.controller.ts"
echo "  - src/igniter/mcp-server-reusable.js"
echo "  - .mcp-config.json"
echo "  - .cursor/mcp.json"
echo "  - tsconfig.igniter.json"
echo ""
echo "🔧 Para personalizar, edite:"
echo "  - .mcp-config.json (configuração MCP)"
echo "  - src/igniter/controllers/ (controladores)"
echo "  - src/igniter/context.ts (contexto da aplicação)"
echo ""
echo "📚 Documentação completa: docs/MIGRATION-BACKOFFICE-GUIDE.md"
