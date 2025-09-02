# Configuração do MCP Server para Cursor

## O que é o MCP Server?

O MCP (Model Context Protocol) Server permite que o Cursor e outras ferramentas de IA interajam diretamente com sua API, entendendo a estrutura do projeto e executando comandos contextualizados.

## Configuração Correta

### 1. Arquivo de Configuração do Cursor

O arquivo `.cursor/mcp.json` deve estar configurado assim:

```json
{
  "mcpServers": {
    "fila-api-igniter": {
      "command": "node",
      "args": ["./src/igniter/mcp-server.js"],
      "env": {
        "NODE_ENV": "development",
        "DATABASE_URL": "file:./dev.db"
      }
    }
  }
}
```

### 2. Estrutura dos Arquivos

```
src/igniter/
├── mcp-server.js              # Servidor MCP executável
├── mcp-server.ts              # Configuração TypeScript
├── igniter.context.ts         # Contexto da aplicação
├── igniter.router.ts          # Router principal
├── igniter.ts                 # Builder do Igniter
└── controllers/
    └── auth.controller.ts     # Controladores migrados
```

### 3. Ferramentas Disponíveis

O MCP server expõe as seguintes ferramentas para o Cursor:

- **list-endpoints**: Lista todos os endpoints disponíveis na API
- **call-auth-login**: Executa login de usuário corporativo
- **get-project-structure**: Obtém a estrutura do projeto

## Como Usar

### 1. Verificar se o MCP Server está Funcionando

1. Abra o Cursor
2. Pressione `Cmd/Ctrl + Shift + P`
3. Digite "MCP" e selecione "MCP: Show MCP Servers"
4. Verifique se "fila-api-igniter" aparece na lista

### 2. Usar as Ferramentas

No chat do Cursor, você pode usar comandos como:

- "Liste todos os endpoints da API"
- "Execute um login com email teste@exemplo.com"
- "Mostre a estrutura do projeto"

### 3. Exemplo de Uso

```
Usuário: "Liste todos os endpoints da API"

Cursor: Vou usar a ferramenta MCP para listar os endpoints...
[Executa list-endpoints]

Resultado:
- POST /api/v1/auth/login - Login de usuário corporativo
- POST /api/v1/auth/agent/login - Login de agente
- POST /api/v1/auth/client/login - Login de cliente
- GET /api/v1/auth/google - Iniciar login com Google
- GET /api/v1/auth/google/callback - Callback do Google
- POST /api/v1/auth/google/token - Login móvel com token Google
```

## Benefícios

1. **Contexto Inteligente**: O Cursor entende a estrutura da sua API
2. **Execução de Comandos**: Pode executar operações diretamente na API
3. **Geração de Código**: Gera código que segue as convenções do projeto
4. **Debugging Assistido**: Ajuda a identificar e corrigir problemas

## Troubleshooting

### Problema: MCP Server não aparece no Cursor

**Solução:**
1. Verifique se o arquivo `.cursor/mcp.json` está na raiz do projeto
2. Certifique-se de que o caminho para `mcp-server.js` está correto
3. Reinicie o Cursor

### Problema: Erro ao executar comandos

**Solução:**
1. Verifique as variáveis de ambiente no `mcp.json`
2. Certifique-se de que o Node.js está instalado
3. Verifique os logs do MCP server

### Problema: Ferramentas não funcionam

**Solução:**
1. Verifique se o arquivo `mcp-server.js` é executável
2. Teste executar o arquivo manualmente: `node src/igniter/mcp-server.js`
3. Verifique se não há erros de sintaxe

## Logs e Debugging

Para ver os logs do MCP server:

1. Abra o terminal no Cursor
2. Execute: `node src/igniter/mcp-server.js`
3. Verifique se aparecem as mensagens de inicialização

## Próximos Passos

1. **Expandir Ferramentas**: Adicionar mais ferramentas para outros módulos
2. **Integração Completa**: Conectar com todos os serviços da API
3. **Testes Automatizados**: Criar testes para as ferramentas MCP
4. **Documentação Avançada**: Documentar casos de uso específicos
