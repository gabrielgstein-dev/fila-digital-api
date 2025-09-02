# @fila/igniter-mcp-server

MCP Server reutilizável para projetos Igniter.js, NestJS, Express e outros frameworks Node.js.

## 🚀 Instalação

```bash
npm install @fila/igniter-mcp-server
```

## 📋 Uso Rápido

### 1. Inicializar Configuração

```bash
npx @fila/igniter-mcp-server init
```

### 2. Configurar Cursor

```bash
npx @fila/igniter-mcp-server setup-cursor
```

### 3. Iniciar MCP Server

```bash
npx @fila/igniter-mcp-server
```

## 🔧 Configuração

### Tipos de Projeto Suportados

- **igniter**: Projetos Igniter.js
- **nestjs**: Projetos NestJS
- **express**: Projetos Express.js
- **fastify**: Projetos Fastify
- **custom**: Projetos personalizados

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

## 🛠️ Ferramentas Disponíveis

### Ferramentas Padrão

- **list-endpoints**: Lista todos os endpoints da API
- **get-project-structure**: Obtém a estrutura do projeto
- **get-project-info**: Obtém informações básicas do projeto

### Ferramentas por Tipo de Projeto

#### Igniter.js
- **call-endpoint**: Chama um endpoint específico
- **list-controllers**: Lista todos os controladores

#### NestJS
- **list-modules**: Lista todos os módulos
- **generate-module**: Gera um novo módulo

#### Express
- **list-routes**: Lista todas as rotas
- **add-middleware**: Adiciona middleware

## 📁 Estrutura de Arquivos

```
meu-projeto/
├── .mcp-config.json          # Configuração do MCP server
├── mcp-server-reusable.js    # Servidor MCP (copiado automaticamente)
├── .cursor/
│   └── mcp.json             # Configuração do Cursor
└── package.json
```

## 🎯 Exemplos de Uso

### Projeto Igniter.js

```bash
# Inicializar
npx @fila/igniter-mcp-server init --type igniter --name minha-api

# Configurar Cursor
npx @fila/igniter-mcp-server setup-cursor

# Usar no Cursor
# Comando: "Liste todos os endpoints da API"
```

### Projeto NestJS

```bash
# Inicializar
npx @fila/igniter-mcp-server init --type nestjs --name minha-api-nest

# Configurar Cursor
npx @fila/igniter-mcp-server setup-cursor

# Usar no Cursor
# Comando: "Liste todos os módulos NestJS"
```

### Projeto Express

```bash
# Inicializar
npx @fila/igniter-mcp-server init --type express --name minha-api-express

# Configurar Cursor
npx @fila/igniter-mcp-server setup-cursor

# Usar no Cursor
# Comando: "Liste todas as rotas Express"
```

## 🔄 Comandos CLI

### `init`
Inicializa configuração do MCP server

```bash
npx @fila/igniter-mcp-server init [opções]

Opções:
  -t, --type <type>     Tipo do projeto (igniter, nestjs, express)
  -n, --name <name>     Nome do projeto
  -h, --help           Mostra ajuda
```

### `config`
Mostra configuração atual

```bash
npx @fila/igniter-mcp-server config
```

### `setup-cursor`
Configura o Cursor automaticamente

```bash
npx @fila/igniter-mcp-server setup-cursor
```

## 🧪 Testando

```bash
# Testar MCP server
node mcp-server-reusable.js

# Saída esperada:
# 🚀 Iniciando MCP Server Reutilizável...
# 📦 Projeto: meu-projeto
# 🔧 Tipo: igniter
# 📋 Ferramentas: list-endpoints, get-project-structure, get-project-info
# ✅ MCP Server reutilizável configurado e pronto!
```

## 🔧 Personalização

### Adicionar Ferramentas Customizadas

Edite `.mcp-config.json`:

```json
{
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
  ]
}
```

### Configurar Endpoints

```json
{
  "endpoints": {
    "baseUrl": "http://localhost:3000",
    "basePath": "/api/v1",
    "custom": [
      "GET /health",
      "POST /users",
      "PUT /users/:id",
      "DELETE /users/:id"
    ]
  }
}
```

## 🐛 Troubleshooting

### MCP Server não aparece no Cursor

1. Verifique se `.cursor/mcp.json` existe
2. Reinicie o Cursor
3. Verifique os logs do MCP server

### Erro ao executar comandos

1. Verifique se `mcp-server-reusable.js` é executável
2. Teste manualmente: `node mcp-server-reusable.js`
3. Verifique as variáveis de ambiente

### Ferramentas não funcionam

1. Verifique `.mcp-config.json`
2. Teste as ferramentas individualmente
3. Verifique os logs de erro

## 📚 Documentação Adicional

- [Configuração do MCP Server](../docs/MCP-SERVER-SETUP.md)
- [Compartilhamento entre Projetos](../docs/MCP-SERVER-SHARING.md)
- [Migração para Igniter.js](../docs/IGNITER-MIGRATION-CORRECTED.md)

## 🤝 Contribuindo

1. Fork o repositório
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

MIT License - veja [LICENSE](LICENSE) para detalhes.

## 🆘 Suporte

- **Issues**: [GitHub Issues](https://github.com/fila-digital/igniter-mcp-server/issues)
- **Discussions**: [GitHub Discussions](https://github.com/fila-digital/igniter-mcp-server/discussions)
- **Email**: suporte@filadigital.com.br
