# Sistema de Segurança Baseado em Tenant

## Visão Geral

Este documento descreve o sistema de segurança implementado para garantir que funcionários só acessem informações de sua própria empresa (tenant).

## Arquitetura de Segurança

### 1. Modelo de Dados

- **Tenant**: Representa uma empresa/estabelecimento
- **Agent**: Representa um funcionário vinculado a um tenant
- **Queue**: Fila de atendimento pertencente a um tenant
- **Ticket**: Senha/ticket pertencente a uma fila específica

### 2. Controle de Acesso

#### 2.1 TenantAuthGuard

O `TenantAuthGuard` é o guard principal que:
- Valida autenticação JWT
- Verifica se o usuário é um agente (não cliente)
- Valida se o agente pertence ao tenant da operação
- Bloqueia acesso a recursos de outros tenants

#### 2.2 Decorators de Segurança

- **`@RequireTenant()`**: Marca rotas que precisam de validação de tenant
- **`@CurrentTenant()`**: Extrai o tenantId do usuário autenticado
- **`@CurrentAgent()`**: Extrai informações do agente autenticado

#### 2.3 Interceptors de Filtragem

- **`TenantFilterInterceptor`**: Filtra automaticamente dados baseado no tenant do usuário

## Implementação por Módulo

### Tenants (Empresas)

```typescript
@Controller('tenants')
export class TenantsController {
  // Rota pública para criar tenant
  @Post()
  @Public()
  async create() { ... }

  // Rota protegida - apenas administradores
  @Get()
  @UseGuards(TenantAuthGuard)
  async findAll(@CurrentAgent('role') role: string) { ... }

  // Rota protegida - apenas se pertencer ao tenant
  @Get(':id')
  @UseGuards(TenantAuthGuard)
  @RequireTenant()
  async findOne(@Param('id') id: string) { ... }
}
```

### Queues (Filas)

```typescript
@Controller()
export class QueuesController {
  // Todas as rotas requerem validação de tenant
  @Post('tenants/:tenantId/queues')
  @UseGuards(TenantAuthGuard)
  @RequireTenant()
  async create(@Param('tenantId') tenantId: string) { ... }
}
```

### Agents (Funcionários)

```typescript
@Controller('tenants/:tenantId/agents')
@UseGuards(TenantAuthGuard)
@RequireTenant()
export class AgentsController {
  // Todas as operações são validadas por tenant
  @Post()
  async create(
    @Param('tenantId') tenantId: string,
    @CurrentAgent('id') currentAgentId: string
  ) { ... }
}
```

### Tickets (Senhas)

```typescript
@Controller()
export class TicketsController {
  // Rotas públicas para clientes
  @Get('tickets/:id')
  @Public()
  async findOne(@Param('id') id: string) { ... }

  // Rotas protegidas para agentes
  @Post('queues/:queueId/tickets')
  @UseGuards(TenantAuthGuard)
  async create(@Param('queueId') queueId: string) { ... }
}
```

## Fluxo de Validação

### 1. Autenticação
1. Usuário faz login (CPF/senha ou Google OAuth)
2. Sistema gera JWT com informações do usuário e tenantId
3. Token é enviado em todas as requisições subsequentes

### 2. Validação de Acesso
1. `TenantAuthGuard` intercepta a requisição
2. Valida JWT e extrai informações do usuário
3. Verifica se o usuário é um agente
4. Se `@RequireTenant()` estiver presente, valida tenantId da rota
5. Compara tenantId do usuário com tenantId da operação
6. Permite ou bloqueia o acesso

### 3. Filtragem de Dados
1. `TenantFilterInterceptor` processa a resposta
2. Filtra automaticamente dados baseado no tenant do usuário
3. Remove dados de outros tenants da resposta

## Regras de Negócio

### Hierarquia de Permissões

1. **ADMIN**: Pode criar outros administradores e gerenciar todos os recursos do tenant
2. **MANAGER**: Pode gerenciar recursos do tenant (exceto criar administradores)
3. **ATTENDANT**: Pode operar filas e tickets do tenant

### Validações de Segurança

- Agentes só podem acessar recursos de seu próprio tenant
- Clientes não podem acessar recursos de agentes
- Agentes protegidos não podem ser modificados/excluídos
- Agentes não podem excluir a si mesmos
- Apenas administradores podem promover outros administradores

## Exemplos de Uso

### Criar Funcionário

```bash
POST /tenants/{tenantId}/agents
Authorization: Bearer {JWT_TOKEN}

{
  "email": "funcionario@empresa.com",
  "name": "João Silva",
  "password": "senha123",
  "role": "ATTENDANT",
  "cpf": "123.456.789-00"
}
```

### Listar Filas do Tenant

```bash
GET /tenants/{tenantId}/queues
Authorization: Bearer {JWT_TOKEN}
```

### Operar Ticket

```bash
PUT /tickets/{ticketId}/complete
Authorization: Bearer {JWT_TOKEN}
```

## Monitoramento e Auditoria

### Logs de Segurança

- Todas as tentativas de acesso negado são logadas
- Operações sensíveis (criação de admin, exclusão de agentes) são auditadas
- Falhas de autenticação são monitoradas

### Métricas de Segurança

- Número de tentativas de acesso negado por tenant
- Distribuição de roles por tenant
- Atividade de agentes por tenant

## Considerações de Performance

- JWT é validado a cada requisição (cache pode ser implementado)
- Validações de tenant são feitas no nível da aplicação
- Filtragem de dados é feita via interceptor (pode ser otimizada para queries)

## Próximos Passos

1. Implementar cache de validação JWT
2. Adicionar rate limiting por tenant
3. Implementar auditoria mais detalhada
4. Adicionar notificações de segurança
5. Implementar backup e recuperação de dados por tenant

