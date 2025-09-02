# Como Compartilhar o MCP Server entre Projetos

## 🎯 Visão Geral

O MCP server pode ser compartilhado entre diferentes projetos de várias formas:

1. **Pacote NPM Reutilizável** (Recomendado)
2. **Arquivo JavaScript Compartilhado**
3. **Template de Configuração**
4. **Monorepo com Workspace**

## 📦 Opção 1: Pacote NPM Reutilizável

### Criar o Pacote

```bash
# Criar estrutura do pacote
mkdir igniter-mcp-server
cd igniter-mcp-server
npm init -y

# Instalar dependências
npm install @igniter-js/core @igniter-js/mcp-server
npm install -D typescript @types/node ts-node
```

### Estrutura do Pacote

```
igniter-mcp-server/
├── package.json
├── src/
│   ├── cli.ts              # CLI para configuração
│   ├── server.ts           # Servidor MCP
│   └── templates/          # Templates de configuração
├── templates/
│   ├── cursor-config.json  # Template para .cursor/mcp.json
│   └── mcp-config.json     # Template para .mcp-config.json
└── README.md
```

### Publicar no NPM

```bash
# Build do pacote
npm run build

# Publicar
npm publish
```

### Usar em Outros Projetos

```bash
# Instalar o pacote
npm install @fila/igniter-mcp-server

# Inicializar configuração
npx @fila/igniter-mcp-server init

# Configurar Cursor
npx @fila/igniter-mcp-server setup-cursor
```

## 🔧 Opção 2: Arquivo JavaScript Compartilhado

### Criar Arquivo Compartilhado

```javascript
// shared-mcp-server.js
const fs = require('fs');
const path = require('path');

class ReusableMCPServer {
  constructor(configPath = '.mcp-config.json') {
    this.config = this.loadConfig(configPath);
  }

  loadConfig(configPath) {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
    return this.getDefaultConfig();
  }

  getDefaultConfig() {
    return {
      name: 'shared-mcp-server',
      description: 'MCP Server compartilhado',
      version: '1.0.0',
      tools: [
        {
          name: 'list-endpoints',
          description: 'Lista endpoints da API',
          inputSchema: { type: 'object', properties: {} }
        }
      ]
    };
  }

  // Implementar ferramentas MCP aqui
  listEndpoints() {
    return {
      endpoints: this.config.endpoints || [],
      total: this.config.endpoints?.length || 0
    };
  }
}

module.exports = ReusableMCPServer;
```

### Usar em Projetos

```javascript
// mcp-server.js (em cada projeto)
const ReusableMCPServer = require('./shared-mcp-server.js');

const mcpServer = new ReusableMCPServer('.mcp-config.json');

// Configuração específica do projeto
mcpServer.config.name = 'meu-projeto';
mcpServer.config.endpoints = [
  'GET /api/health',
  'POST /api/users',
  // ... outros endpoints
];

module.exports = mcpServer;
```

## 📁 Opção 3: Monorepo com Workspace

### Estrutura do Monorepo

```
meu-monorepo/
├── packages/
│   ├── mcp-server/          # MCP server compartilhado
│   ├── projeto-a/           # Projeto A
│   ├── projeto-b/           # Projeto B
│   └── projeto-c/           # Projeto C
├── package.json             # Workspace root
└── .cursor/
    └── mcp.json            # Configuração global
```

### Configuração do Workspace

```json
// package.json (root)
{
  "name": "meu-monorepo",
  "workspaces": [
    "packages/*"
  ],
  "devDependencies": {
    "@fila/igniter-mcp-server": "workspace:*"
  }
}
```

### Configuração Global do Cursor

```json
// .cursor/mcp.json
{
  "mcpServers": {
    "projeto-a": {
      "command": "node",
      "args": ["./packages/projeto-a/mcp-server.js"]
    },
    "projeto-b": {
      "command": "node", 
      "args": ["./packages/projeto-b/mcp-server.js"]
    },
    "projeto-c": {
      "command": "node",
      "args": ["./packages/projeto-c/mcp-server.js"]
    }
  }
}
```

## 🚀 Opção 4: Template de Configuração

### Criar Template

```bash
# Criar repositório de templates
git clone https://github.com/seu-usuario/mcp-templates.git
cd mcp-templates
```

### Estrutura do Template

```
mcp-templates/
├── igniter/                 # Template para Igniter.js
│   ├── .mcp-config.json
│   ├── mcp-server.js
│   └── .cursor/
│       └── mcp.json
├── nestjs/                  # Template para NestJS
│   ├── .mcp-config.json
│   ├── mcp-server.js
│   └── .cursor/
│       └── mcp.json
└── express/                 # Template para Express
    ├── .mcp-config.json
    ├── mcp-server.js
    └── .cursor/
        └── mcp.json
```

### Usar Template

```bash
# Copiar template para novo projeto
cp -r mcp-templates/igniter/* meu-novo-projeto/

# Personalizar configuração
cd meu-novo-projeto
# Editar .mcp-config.json com dados específicos
```

## 📋 Configuração por Projeto

### Arquivo de Configuração (.mcp-config.json)

```json
{
  "name": "meu-projeto",
  "description": "MCP Server para meu projeto",
  "version": "1.0.0",
  "projectType": "igniter",
  "customTools": [
    {
      "name": "minha-ferramenta",
      "description": "Descrição da ferramenta",
      "inputSchema": {
        "type": "object",
        "properties": {
          "parametro": { "type": "string" }
        }
      }
    }
  ],
  "endpoints": {
    "baseUrl": "http://localhost:3000",
    "basePath": "/api/v1",
    "custom": [
      "GET /health",
      "POST /users"
    ]
  },
  "environment": {
    "required": ["DATABASE_URL"],
    "optional": ["API_KEY"]
  }
}
```

### Configuração do Cursor (.cursor/mcp.json)

```json
{
  "mcpServers": {
    "meu-projeto": {
      "command": "node",
      "args": ["./mcp-server.js"],
      "env": {
        "NODE_ENV": "development",
        "DATABASE_URL": "file:./dev.db"
      }
    }
  }
}
```

## 🔄 Fluxo de Compartilhamento

### 1. Desenvolvimento
```bash
# Desenvolver MCP server
cd mcp-server-package
npm run dev

# Testar em projeto local
npm link
cd ../meu-projeto
npm link @fila/igniter-mcp-server
```

### 2. Publicação
```bash
# Build e teste
npm run build
npm test

# Publicar
npm publish
```

### 3. Uso em Novos Projetos
```bash
# Instalar
npm install @fila/igniter-mcp-server

# Configurar
npx @fila/igniter-mcp-server init
npx @fila/igniter-mcp-server setup-cursor
```

## 🎯 Benefícios do Compartilhamento

### 1. **Consistência**
- Mesma experiência em todos os projetos
- Ferramentas padronizadas
- Configuração uniforme

### 2. **Manutenibilidade**
- Atualizações centralizadas
- Bug fixes para todos os projetos
- Melhorias compartilhadas

### 3. **Produtividade**
- Setup rápido em novos projetos
- Ferramentas testadas e confiáveis
- Documentação centralizada

### 4. **Escalabilidade**
- Fácil adição de novos projetos
- Templates para diferentes tipos
- Configuração flexível

## 📚 Exemplos Práticos

### Projeto Igniter.js
```bash
npx @fila/igniter-mcp-server init --type igniter --name minha-api
```

### Projeto NestJS
```bash
npx @fila/igniter-mcp-server init --type nestjs --name minha-api-nest
```

### Projeto Express
```bash
npx @fila/igniter-mcp-server init --type express --name minha-api-express
```

## 🚀 Próximos Passos

1. **Escolher Abordagem**: NPM package, arquivo compartilhado, ou monorepo
2. **Implementar**: Criar a estrutura escolhida
3. **Testar**: Validar em diferentes projetos
4. **Documentar**: Criar guias de uso
5. **Publicar**: Compartilhar com a equipe/comunidade

O MCP server agora pode ser facilmente compartilhado entre projetos! 🎉
