# Migração para Igniter.js

Este documento descreve a migração da API de NestJS para Igniter.js, incluindo a configuração do MCP server.

## Estrutura da Migração

### Arquivos Criados

```
src/igniter/
├── app.ts                    # Configuração principal do Igniter.js
├── main.ts                   # Ponto de entrada do servidor
├── mcp-server.ts            # Configuração do MCP server
└── features/
    ├── auth/
    │   └── auth.controller.ts
    ├── tenants/
    │   └── tenants.controller.ts
    ├── tickets/
    │   └── tickets.controller.ts
    ├── queues/
    │   └── queues.controller.ts
    ├── agents/
    │   └── agents.controller.ts
    ├── clients/
    │   └── clients.controller.ts
    └── corporate-users/
        └── corporate-users.controller.ts
```

### Scripts Adicionados

- `build:igniter`: Compila o código Igniter.js
- `start:igniter`: Inicia o servidor Igniter.js em produção
- `start:igniter:dev`: Inicia o servidor Igniter.js em desenvolvimento
- `start:mcp`: Inicia o MCP server em produção
- `start:mcp:dev`: Inicia o MCP server em desenvolvimento

## Principais Mudanças

### 1. Estrutura de Controladores

**Antes (NestJS):**
```typescript
@Controller('auth')
export class AuthController {
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    // ...
  }
}
```

**Depois (Igniter.js):**
```typescript
export const authController = igniter.controller({
  path: '/auth',
  actions: {
    login: igniter.mutation({
      path: '/login',
      body: loginSchema,
      handler: async ({ body, context }) => {
        // ...
      },
    }),
  },
});
```

### 2. Validação com Zod

Todos os DTOs foram convertidos para schemas Zod:

```typescript
const loginSchema = z.object({
  cpf: z.string().min(11).max(14),
  password: z.string().min(1),
});
```

### 3. Middleware

O middleware foi convertido para o sistema do Igniter.js:

```typescript
igniter.middleware({
  name: 'cors',
  handler: async ({ request, response, next }) => {
    // Configuração CORS
    await next();
  },
})
```

### 4. Context System

O Igniter.js usa um sistema de contexto para injeção de dependências:

```typescript
context: {
  db: new PrismaService(),
}
```

## MCP Server

O MCP server foi configurado para integração com ferramentas de IA:

```typescript
const mcpServer = createMCPServer({
  app,
  name: 'fila-api-mcp',
  description: 'MCP Server para API de Fila Digital com Igniter.js',
  version: '1.0.20-stage',
});
```

## Como Usar

### Desenvolvimento

```bash
# Iniciar servidor Igniter.js
pnpm run start:igniter:dev

# Iniciar MCP server
pnpm run start:mcp:dev
```

### Produção

```bash
# Compilar
pnpm run build:igniter

# Iniciar servidor
pnpm run start:igniter

# Iniciar MCP server
pnpm run start:mcp
```

## Benefícios da Migração

1. **Type Safety**: End-to-end type safety com Zod
2. **Developer Experience**: Melhor integração com ferramentas de IA
3. **Performance**: Framework mais leve e otimizado
4. **MCP Integration**: Suporte nativo para MCP server
5. **Modern Stack**: Baseado em tecnologias modernas

## Próximos Passos

1. Testar todos os endpoints migrados
2. Configurar CI/CD para o Igniter.js
3. Migrar testes E2E
4. Documentar APIs com o sistema do Igniter.js
5. Configurar monitoramento e logs
