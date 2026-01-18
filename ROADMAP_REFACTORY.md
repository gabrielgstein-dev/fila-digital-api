# 🚀 ROADMAP DE REFATORAÇÃO - API FILA DIGITAL

> **Data de Criação**: 17 de Janeiro de 2026
> **Objetivo**: Simplificar o código, melhorar legibilidade e facilitar manutenção
> **Abordagem**: Baseada em pesquisas de melhores práticas (NestJS, Clean Code, SOLID, DDD)

---

## 📋 ÍNDICE

1. [Entendimento do Sistema](#1-entendimento-do-sistema)
2. [Problemas Identificados](#2-problemas-identificados)
3. [Melhores Práticas Pesquisadas](#3-melhores-práticas-pesquisadas)
4. [Roadmap de Implementação](#4-roadmap-de-implementação)
5. [Checklist Completo](#5-checklist-completo)
6. [Métricas de Sucesso](#6-métricas-de-sucesso)
7. [Referências](#7-referências)

---

## 1. ENTENDIMENTO DO SISTEMA

### 1.1. O que é a API

**Fila Digital API** - Sistema multi-tenant de gerenciamento de filas digitais para empresas (clínicas, hospitais, lojas, bancos, etc).

### 1.2. Funcionalidades Principais

#### Para Clientes
- Tirar senha remotamente via QR Code (sem cadastro)
- Acompanhar posição na fila em tempo real
- Receber notificações (WhatsApp, Telegram, SMS)
- Estimar tempo de espera
- Entrar na fila via Telegram Bot

#### Para Empresas (Tenants)
- Criar e gerenciar múltiplas filas especializadas
- Chamar próximo cliente
- Pular/Rechamar clientes
- Completar atendimentos
- Dashboard com métricas em tempo real
- Gerenciar usuários corporativos
- Configurar notificações

### 1.3. Stack Tecnológica

```
Backend:     Node.js 22+ | NestJS | TypeScript | Prisma ORM
Database:    PostgreSQL com triggers
Real-time:   Server-Sent Events (SSE) + PostgreSQL Triggers
Messaging:   WhatsApp (Meta API) | Telegram | SMS (Twilio)
Auth:        JWT + Google OAuth
Security:    Rate Limiting | Guards Multi-layer | Sanitização
Testing:     Jest | Supertest (E2E)
Deploy:      Docker | Google Cloud Run
```

### 1.4. Arquitetura de Módulos

```
src/
├── tenants/          → Empresas (sistema multi-tenant)
├── queues/           → Filas (CRUD + chamadas + estatísticas)
├── tickets/          → Senhas/Tickets (ciclo de vida completo)
├── agents/           → Atendentes (DEPRECATED - migrar para corporate-users)
├── corporate-users/  → Usuários corporativos (novo sistema auth)
├── auth/             → Autenticação JWT + Google OAuth + Guards
├── dashboard/        → Métricas agregadas e estatísticas
├── whatsapp/         → Integração Meta Business API
├── telegram/         → Bot Telegram + Notificações
├── events/           → SSE para notificações em tempo real
├── notifications/    → Orquestração de notificações
└── common/           → DTOs | Guards | Interceptors | Utils
```

### 1.5. Modelos de Dados (Prisma)

```
Tenant (empresas/clientes)
  ├── Queue (filas especializadas: GENERAL, PRIORITY, VIP)
  │     └── Ticket (senhas/tickets)
  │           └── User/Guest (clientes)
  ├── Agent (DEPRECATED)
  ├── CorporateUser (usuários corporativos - NOVO)
  └── Counter (guichês de atendimento)

CallLog (auditoria completa de chamadas)
```

### 1.6. Principais Fluxos de Negócio

#### Fluxo 1: Cliente Tira Senha
```
Cliente → QR Code → POST /tickets
→ Valida fila/capacidade
→ Cria ticket com número sequencial
→ Calcula posição e tempo estimado
→ Envia notificações (WhatsApp/Telegram)
→ Retorna ticket com QR Code
```

#### Fluxo 2: Empresa Chama Próximo
```
Atendente → POST /queues/{id}/call-next
→ Busca próximo ticket (prioridade + FIFO)
→ Marca como CALLED
→ Registra em CallLog
→ Dispara SSE event
→ Envia notificação ao cliente
→ Retorna ticket chamado
```

#### Fluxo 3: Cliente Acompanha Posição
```
Cliente → GET /tickets/{id}/status
→ Busca ticket no banco
→ Calcula posição atual na fila
→ Calcula tempo estimado (média dinâmica)
→ Retorna status atualizado
```

#### Fluxo 4: Notificação em Tempo Real
```
Ação no DB (INSERT/UPDATE ticket)
→ Trigger PostgreSQL
→ NOTIFY event_channel
→ Backend escuta LISTEN
→ Dispara SSE para clientes conectados
→ Frontend atualiza interface
```

---

## 2. PROBLEMAS IDENTIFICADOS

### 2.1. Services Muito Grandes (Violação SRP)

#### 🔴 `tickets.service.ts` - 776 LINHAS

**Múltiplas Responsabilidades**:
- ✗ Validação de regras de negócio
- ✗ Queries complexas ao banco
- ✗ Cálculos de posição e tempo estimado
- ✗ Envio de notificações (WhatsApp + Telegram)
- ✗ Tratamento de race conditions
- ✗ Geração de números de ticket
- ✗ Auditoria (CallLog)

**Métodos Problemáticos**:
- `create()` - 199 linhas (faz TUDO)
- `getTicketStatusWithEstimate()` - 150 linhas
- `recallTicket()` - 100+ linhas
- `skipTicket()` - 80+ linhas

#### 🔴 `queues.service.ts` - 949 LINHAS

**Múltiplas Responsabilidades**:
- ✗ CRUD de filas
- ✗ Lógica de chamada (call-next)
- ✗ Queries SQL raw complexas
- ✗ Cálculos estatísticos
- ✗ Geração de QR Code
- ✗ Notificações
- ✗ Validações multi-layer

**Métodos Problemáticos**:
- `callNext()` - 250+ linhas (muito complexo)
- `getQueueDetailedStats()` - 200+ linhas
- `notifyTicketsInQueue()` - 150+ linhas

### 2.2. Duplicação de Código

#### Cálculo de Tempo Estimado (3 locais diferentes)
1. `tickets.service.ts` linhas 263-339
2. `queues.service.ts` linhas 284-323
3. `queues.service.ts` linhas 882-909

**Problema**: Lógica duplicada, manutenção difícil, risco de inconsistência.

#### Validações Repetidas
- Validação de tenant ativo (5+ locais)
- Validação de fila ativa (8+ locais)
- Validação de capacidade (4+ locais)

### 2.3. Queries SQL Raw nos Services

**Exemplo**: `queues.service.ts` linhas 284-323
```typescript
const result = await this.prisma.$queryRaw<{ avg: number }[]>`
  SELECT AVG(EXTRACT(EPOCH FROM (c."completedAt" - c."calledAt"))) as avg
  FROM "CallLog" c
  INNER JOIN "Ticket" t ON c."ticketId" = t.id
  WHERE t."queueId" = ${queueId}
    AND c."completedAt" IS NOT NULL
    AND c."calledAt" >= NOW() - INTERVAL '3 hours'
`;
```

**Problemas**:
- ✗ Lógica de acesso a dados no service
- ✗ Dificulta testes unitários
- ✗ SQL misturado com TypeScript
- ✗ Sem type-safety completo

### 2.4. Falta de Camadas Arquiteturais

**Atual**: Controller → Service → Prisma

**Problema**: Service faz TUDO (orquestração + regras + dados + notificações).

**Ideal** (Clean Architecture):
```
Controller → Application Layer (use cases)
           ↓
           Domain Layer (business rules)
           ↓
           Infrastructure Layer (database, APIs)
```

### 2.5. Console.log em Produção

**Exemplos**:
- `tickets.service.ts`: 15+ console.log/console.error
- `queues.service.ts`: 20+ console.log/console.error

**Problema**:
- ✗ Não usa Logger do NestJS
- ✗ Dificulta debugging estruturado
- ✗ Sem níveis de log (debug, info, warn, error)

### 2.6. Constantes Magic Numbers

**Exemplos**:
```typescript
avgServiceTime: 300,        // O que é 300?
capacity: 100,              // Por quê 100?
INTERVAL '3 hours'          // Por quê 3 horas?
INTERVAL '7 days'           // Por quê 7 dias?
```

**Problema**: Valores hardcoded sem explicação.

### 2.7. Modelo de Dados com Redundância

**Agents vs CorporateUsers**: Dois sistemas de autenticação coexistindo
- `Agent` - Sistema antigo (DEPRECATED)
- `CorporateUser` - Sistema novo

**Problema**: Confusão, código duplicado, migração incompleta.

---

## 3. MELHORES PRÁTICAS PESQUISADAS

### 3.1. Clean Architecture (Microsoft DDD Guide)

**Fonte**: [Microsoft - Designing DDD-oriented microservice](https://learn.microsoft.com/en-us/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/ddd-oriented-microservice)

**Princípios**:
- Camadas com responsabilidades claras
- Domain layer não depende de nada (POJO/POCO)
- Application layer orquestra casos de uso (thin)
- Infrastructure layer lida com tecnologias externas

**Estrutura**:
```
Presentation Layer    → Controllers (REST API)
Application Layer     → Use Cases / Orchestration
Domain Layer          → Business Rules (core)
Infrastructure Layer  → Database, External APIs
```

### 3.2. Single Responsibility Principle

**Fonte**: [Refactoring Guru - Composing Methods](https://refactoring.guru/refactoring/techniques)

**Princípio**: "Métodos longos são a raiz de todo mal"

**Soluções**:
- **Extract Method**: Quebrar métodos grandes em menores
- **Extract Class**: Criar classes auxiliares quando há coesão
- **Move Method**: Mover métodos para classes mais apropriadas

### 3.3. Helper Services Pattern (NestJS)

**Fonte**: Comunidade NestJS

**Quando um service fica >500 linhas**:
1. Criar services auxiliares por domínio funcional
2. Injetar via Dependency Injection
3. Manter service principal focado em orquestração

**Exemplo**:
```typescript
// Service principal (thin)
@Injectable()
class TicketsService {
  constructor(
    private estimateService: TicketEstimateService,
    private validationService: TicketValidationService,
    private notificationService: NotificationService,
  ) {}
}
```

### 3.4. Repository Pattern

**Fonte**: Clean Architecture principles

**Benefícios**:
- Isola queries do banco
- Facilita testes (mock do repository)
- Centraliza lógica de acesso a dados
- Permite troca de ORM/DB sem afetar business logic

**Estrutura**:
```typescript
// repository.ts
@Injectable()
class QueueRepository {
  async findWithStats(queueId: string): Promise<QueueWithStats>
  async getAverageServiceTime(queueId: string): Promise<number>
}

// service.ts
@Injectable()
class QueuesService {
  constructor(private repository: QueueRepository) {}
}
```

### 3.5. Domain Events Pattern

**Fonte**: DDD (Domain-Driven Design)

**Para notificações**: Usar eventos de domínio em vez de chamar diretamente.

**Exemplo**:
```typescript
// ANTES (acoplado)
await this.whatsappService.send(...)
await this.telegramService.send(...)

// DEPOIS (desacoplado)
this.eventEmitter.emit('ticket.created', { ticket, queue })
// Listeners tratam notificações
```

---

## 4. ROADMAP DE IMPLEMENTAÇÃO

### FASE 0: PREPARAÇÃO (Semana 1)

#### 0.1. Setup do Projeto
- [ ] Criar branch `refactor/simplify-codebase`
- [ ] Rodar todos os testes E2E e garantir 100% passando
- [ ] Documentar baseline atual (métricas de código)
- [ ] Configurar ferramentas de análise (SonarQube/CodeClimate - opcional)

#### 0.2. Análise Técnica
- [ ] Mapear dependências entre módulos (diagrama)
- [ ] Identificar testes críticos para cada refatoração
- [ ] Criar issues no GitHub para cada tarefa

---

### FASE 1: TICKETS MODULE (Semanas 2-3)

#### 1.1. Extrair Helper Services

##### ✅ TicketEstimateService
**Local**: `src/tickets/helpers/ticket-estimate.service.ts`

**Responsabilidade**: Centralizar TODOS os cálculos de tempo e posição.

**Métodos**:
```typescript
@Injectable()
export class TicketEstimateService {
  async calculateEstimatedTime(queueId: string, position: number): Promise<number>
  async getTicketPosition(queueId: string, ticketId: string): Promise<number>
  private async getAverageServiceTimeReal(queueId: string): Promise<number>
  private async getFallbackServiceTime(queueId: string): Promise<number>
}
```

**Migrar de**:
- `tickets.service.ts` linhas 263-339
- `queues.service.ts` linhas 284-323
- `queues.service.ts` linhas 882-909

##### ✅ TicketValidationService
**Local**: `src/tickets/helpers/ticket-validation.service.ts`

**Responsabilidade**: Todas as validações de regras de negócio.

**Métodos**:
```typescript
@Injectable()
export class TicketValidationService {
  async validateQueueCapacity(queue: Queue): Promise<void>
  async validateQueueActive(queue: Queue): Promise<void>
  async validateTenantActive(tenant: Tenant): Promise<void>
  async validateTicketOwnership(ticketId: string, userId: string): Promise<void>
}
```

##### ✅ TicketNumberService
**Local**: `src/tickets/helpers/ticket-number.service.ts`

**Responsabilidade**: Gerar números de ticket sequenciais.

**Métodos**:
```typescript
@Injectable()
export class TicketNumberService {
  async getNextTicketNumber(queueId: string, prefix: string): Promise<string>
  private generateTicketNumber(prefix: string, sequence: number): string
}
```

##### ✅ TicketNotificationService
**Local**: `src/tickets/helpers/ticket-notification.service.ts`

**Responsabilidade**: Orquestrar envio de notificações.

**Métodos**:
```typescript
@Injectable()
export class TicketNotificationService {
  async notifyTicketCreated(ticket: Ticket, queue: Queue): Promise<void>
  async notifyTicketCalled(ticket: Ticket, queue: Queue): Promise<void>
  async notifyTicketPositionChange(ticket: Ticket, newPosition: number): Promise<void>
}
```

#### 1.2. Refatorar Métodos Principais

##### ✅ TicketsService.create()
**ANTES**: 199 linhas fazendo tudo

**DEPOIS**: ~30-40 linhas de orquestração
```typescript
async create(queueId: string, dto: CreateTicketDto, userId?: string) {
  const queue = await this.validateAndGetQueue(queueId);
  const ticketData = await this.prepareTicketData(queue, dto, userId);
  const ticket = await this.createTicketWithRetry(queueId, queue, ticketData);
  await this.notificationService.notifyTicketCreated(ticket, queue);
  return this.enrichTicketWithEstimate(ticket);
}
```

##### ✅ TicketsService.getTicketStatusWithEstimate()
**ANTES**: 150 linhas

**DEPOIS**: ~20 linhas
```typescript
async getTicketStatusWithEstimate(ticketId: string) {
  const ticket = await this.findTicketWithRelations(ticketId);
  const position = await this.estimateService.getTicketPosition(ticket.queueId, ticketId);
  const estimatedTime = await this.estimateService.calculateEstimatedTime(ticket.queueId, position);
  return { ...ticket, position, estimatedTime };
}
```

#### 1.3. Atualizar Testes
- [ ] Criar testes unitários para cada helper service
- [ ] Atualizar testes de `TicketsService` (usar mocks dos helpers)
- [ ] Rodar testes E2E completos

---

### FASE 2: QUEUES MODULE (Semanas 4-5)

#### 2.1. Criar Repository Pattern

##### ✅ QueueRepository
**Local**: `src/queues/repositories/queue.repository.ts`

**Responsabilidade**: Abstrair TODAS as queries complexas.

**Métodos**:
```typescript
@Injectable()
export class QueueRepository {
  async findQueueWithStats(queueId: string, tenantId: string): Promise<QueueWithStats>
  async getAverageServiceTimeReal(queueId: string, hours: number): Promise<number>
  async getAverageServiceTimeFallback(queueId: string, days: number): Promise<number>
  async getDailyStats(queueId: string, date: Date): Promise<DailyStats>
  async getWaitingTicketsCount(queueId: string): Promise<number>
  async getNextTicketInQueue(queueId: string): Promise<Ticket | null>
}
```

**Migrar queries de**:
- `queues.service.ts` linhas 284-323 (avg service time)
- `queues.service.ts` linhas 450-550 (stats complexas)
- `queues.service.ts` linhas 750-850 (call next logic)

#### 2.2. Extrair Helper Services

##### ✅ QueueStatsService
**Local**: `src/queues/helpers/queue-stats.service.ts`

**Responsabilidade**: Cálculos estatísticos complexos.

**Métodos**:
```typescript
@Injectable()
export class QueueStatsService {
  async getDetailedStats(queueId: string, tenantId: string): Promise<QueueDetailedStats>
  async getDailyMetrics(queueId: string, date: Date): Promise<DailyMetrics>
  private calculateAverageWaitTime(tickets: Ticket[]): number
  private calculatePeakHours(callLogs: CallLog[]): PeakHours
}
```

##### ✅ QueueCallService
**Local**: `src/queues/helpers/queue-call.service.ts`

**Responsabilidade**: Lógica de chamada de próximo ticket.

**Métodos**:
```typescript
@Injectable()
export class QueueCallService {
  async callNextTicket(queueId: string, agentId: string): Promise<Ticket>
  private async selectNextTicketByPriority(queueId: string): Promise<Ticket>
  private async registerCallLog(ticket: Ticket, agentId: string): Promise<CallLog>
}
```

#### 2.3. Refatorar Métodos Principais

##### ✅ QueuesService.callNext()
**ANTES**: 250+ linhas

**DEPOIS**: ~40 linhas
```typescript
async callNext(queueId: string, tenantId: string, agentId: string) {
  const queue = await this.validationService.validateQueueForCall(queueId, tenantId);
  const ticket = await this.callService.callNextTicket(queueId, agentId);
  await this.notificationService.notifyTicketCalled(ticket, queue);
  await this.eventService.emitTicketCalled(ticket);
  return ticket;
}
```

##### ✅ QueuesService.getQueueDetailedStats()
**ANTES**: 200+ linhas

**DEPOIS**: ~15 linhas
```typescript
async getQueueDetailedStats(queueId: string, tenantId: string) {
  await this.validationService.validateQueueAccess(queueId, tenantId);
  return this.statsService.getDetailedStats(queueId, tenantId);
}
```

#### 2.4. Atualizar Testes
- [ ] Criar testes unitários para QueueRepository
- [ ] Criar testes para helper services
- [ ] Rodar testes E2E completos

---

### FASE 3: COMMON PATTERNS (Semana 6)

#### 3.1. Centralizar Constantes

##### ✅ Queue Constants
**Local**: `src/common/constants/queue.constants.ts`

```typescript
export const QUEUE_DEFAULTS = {
  AVG_SERVICE_TIME: 300,
  CAPACITY: 100,
  RECENT_HOURS_WINDOW: 3,
  FALLBACK_DAYS_WINDOW: 7,
} as const;

export const QUEUE_PREFIXES = {
  GENERAL: 'G',
  PRIORITY: 'P',
  VIP: 'V',
} as const;

export const TIME_WINDOWS = {
  RECENT_SERVICE_HOURS: 3,
  FALLBACK_SERVICE_DAYS: 7,
  STATS_REFRESH_MINUTES: 5,
} as const;
```

##### ✅ Notification Constants
**Local**: `src/common/constants/notification.constants.ts`

```typescript
export const NOTIFICATION_TEMPLATES = {
  TICKET_CREATED: 'Sua senha é {number}. Posição: {position}',
  TICKET_CALLED: 'Sua senha {number} foi chamada!',
  // ...
} as const;
```

#### 3.2. Substituir console.log por Logger

**Em TODOS os services**:
```typescript
// ANTES
console.log('🎫 Criando ticket...');
console.error('❌ Erro:', error);

// DEPOIS
private readonly logger = new Logger(TicketsService.name);
this.logger.log(`Criando ticket na fila ${queueId}`);
this.logger.error(`Erro ao criar ticket: ${error.message}`, error.stack);
```

**Arquivos a atualizar**:
- [ ] `tickets.service.ts`
- [ ] `queues.service.ts`
- [ ] `auth.service.ts`
- [ ] `telegram.service.ts`
- [ ] `whatsapp.service.ts`

#### 3.3. Criar Base Classes

##### ✅ BaseValidationService
**Local**: `src/common/services/base-validation.service.ts`

```typescript
@Injectable()
export abstract class BaseValidationService {
  protected async validateTenant(tenantId: string): Promise<Tenant>
  protected async validateTenantActive(tenant: Tenant): Promise<void>
  protected handleValidationError(message: string): never
}
```

---

### FASE 4: LIMPEZA E MIGRAÇÃO (Semana 7)

#### 4.1. Deprecar/Remover Agents Module

**Contexto**: Agents foi substituído por CorporateUsers.

**Plano**:
1. [ ] Verificar se há dependências ativas de `Agent`
2. [ ] Criar migration script (Agent → CorporateUser)
3. [ ] Atualizar testes que usam Agent
4. [ ] Marcar module como @deprecated
5. [ ] Criar issue para remoção futura

#### 4.2. Limpar Código Morto

**Verificar e remover**:
- [ ] Imports não utilizados
- [ ] Métodos privados não chamados
- [ ] DTOs não utilizados
- [ ] Interfaces duplicadas

**Ferramenta**: `npx ts-prune` ou `npx depcheck`

#### 4.3. Padronizar Error Handling

**Criar**: `src/common/exceptions/`
```typescript
// business.exceptions.ts
export class QueueFullException extends BadRequestException {}
export class QueueInactiveException extends BadRequestException {}
export class TicketNotFoundException extends NotFoundException {}
```

**Usar em vez de**:
```typescript
// ANTES
throw new BadRequestException('Fila cheia');

// DEPOIS
throw new QueueFullException();
```

---

### FASE 5: DOCUMENTAÇÃO (Semana 8)

#### 5.1. JSDoc em Métodos Públicos

**Exemplo**:
```typescript
/**
 * Cria um novo ticket na fila especificada
 *
 * @param queueId - ID da fila onde o ticket será criado
 * @param createTicketDto - Dados do cliente (nome, telefone, prioridade)
 * @param userId - ID do usuário autenticado (opcional)
 * @returns Ticket criado com posição e tempo estimado
 * @throws NotFoundException se a fila não existir
 * @throws BadRequestException se a fila estiver cheia ou inativa
 * @throws ForbiddenException se o tenant estiver inativo
 */
async create(queueId: string, createTicketDto: CreateTicketDto, userId?: string): Promise<Ticket>
```

**Aplicar em**:
- [ ] Todos os métodos públicos de services
- [ ] Todos os endpoints de controllers

#### 5.2. README por Módulo

**Criar**: `src/tickets/README.md`

**Conteúdo**:
- Propósito do módulo
- Principais fluxos
- Dependências
- Como testar
- Exemplos de uso

**Módulos a documentar**:
- [ ] tickets/
- [ ] queues/
- [ ] auth/
- [ ] notifications/
- [ ] events/

#### 5.3. Atualizar Documentação Principal

**Atualizar**: `docs/README.md`
- [ ] Adicionar seção sobre nova arquitetura
- [ ] Documentar helper services criados
- [ ] Atualizar diagramas de fluxo

---

### FASE 6: TESTES E QUALIDADE (Semana 9)

#### 6.1. Aumentar Cobertura de Testes Unitários

**Meta**: >80% de cobertura

**Criar testes para**:
- [ ] Todos os helper services
- [ ] Repositories
- [ ] Validation services
- [ ] Notification services

#### 6.2. Adicionar Testes de Integração

**Para cada módulo principal**:
- [ ] tickets/ (integration tests)
- [ ] queues/ (integration tests)
- [ ] auth/ (integration tests)

#### 6.3. Performance Tests

**Criar**: `test/performance/`
- [ ] Load test (criar 1000 tickets simultâneos)
- [ ] Stress test (call-next em alta frequência)
- [ ] Memory leak detection

---

### FASE 7: REVISÃO E MERGE (Semana 10)

#### 7.1. Code Review Completo
- [ ] Revisar todos os PRs criados
- [ ] Verificar conformidade com style guide
- [ ] Validar testes

#### 7.2. Validação Final
- [ ] Rodar TODOS os testes (unit + integration + e2e)
- [ ] Verificar build de produção
- [ ] Testar deploy em ambiente de staging

#### 7.3. Merge e Deploy
- [ ] Merge para develop
- [ ] Deploy em staging
- [ ] Smoke tests
- [ ] Merge para main
- [ ] Deploy em produção

---

## 5. CHECKLIST COMPLETO

### 📦 MÓDULO: TICKETS

#### Helper Services
- [ ] ✅ Criar `TicketEstimateService`
  - [ ] Método: `calculateEstimatedTime()`
  - [ ] Método: `getTicketPosition()`
  - [ ] Método: `getAverageServiceTimeReal()`
  - [ ] Método: `getFallbackServiceTime()`
  - [ ] Testes unitários (>90% coverage)

- [ ] ✅ Criar `TicketValidationService`
  - [ ] Método: `validateQueueCapacity()`
  - [ ] Método: `validateQueueActive()`
  - [ ] Método: `validateTenantActive()`
  - [ ] Método: `validateTicketOwnership()`
  - [ ] Testes unitários

- [ ] ✅ Criar `TicketNumberService`
  - [ ] Método: `getNextTicketNumber()`
  - [ ] Método: `generateTicketNumber()`
  - [ ] Testes unitários

- [ ] ✅ Criar `TicketNotificationService`
  - [ ] Método: `notifyTicketCreated()`
  - [ ] Método: `notifyTicketCalled()`
  - [ ] Método: `notifyTicketPositionChange()`
  - [ ] Testes unitários

#### Refatoração do Service Principal
- [ ] ✅ Refatorar `create()` (199 → ~40 linhas)
- [ ] ✅ Refatorar `getTicketStatusWithEstimate()` (150 → ~20 linhas)
- [ ] ✅ Refatorar `recallTicket()` (~100 → ~30 linhas)
- [ ] ✅ Refatorar `skipTicket()` (~80 → ~25 linhas)
- [ ] ✅ Refatorar `completeTicket()` (~70 → ~20 linhas)
- [ ] ✅ Substituir console.log por Logger
- [ ] ✅ Adicionar JSDoc em métodos públicos
- [ ] ✅ Remover código duplicado

#### Testes
- [ ] ✅ Criar testes unitários para helpers
- [ ] ✅ Atualizar testes de `TicketsService`
- [ ] ✅ Rodar testes E2E
- [ ] ✅ Verificar coverage (meta: >80%)

---

### 📦 MÓDULO: QUEUES

#### Repository Pattern
- [ ] ✅ Criar `QueueRepository`
  - [ ] Método: `findQueueWithStats()`
  - [ ] Método: `getAverageServiceTimeReal()`
  - [ ] Método: `getAverageServiceTimeFallback()`
  - [ ] Método: `getDailyStats()`
  - [ ] Método: `getWaitingTicketsCount()`
  - [ ] Método: `getNextTicketInQueue()`
  - [ ] Testes unitários

#### Helper Services
- [ ] ✅ Criar `QueueStatsService`
  - [ ] Método: `getDetailedStats()`
  - [ ] Método: `getDailyMetrics()`
  - [ ] Método: `calculateAverageWaitTime()`
  - [ ] Método: `calculatePeakHours()`
  - [ ] Testes unitários

- [ ] ✅ Criar `QueueCallService`
  - [ ] Método: `callNextTicket()`
  - [ ] Método: `selectNextTicketByPriority()`
  - [ ] Método: `registerCallLog()`
  - [ ] Testes unitários

- [ ] ✅ Criar `QueueValidationService`
  - [ ] Método: `validateQueueForCall()`
  - [ ] Método: `validateQueueAccess()`
  - [ ] Testes unitários

#### Refatoração do Service Principal
- [ ] ✅ Refatorar `callNext()` (250 → ~40 linhas)
- [ ] ✅ Refatorar `getQueueDetailedStats()` (200 → ~15 linhas)
- [ ] ✅ Refatorar `notifyTicketsInQueue()` (150 → ~30 linhas)
- [ ] ✅ Substituir console.log por Logger
- [ ] ✅ Adicionar JSDoc
- [ ] ✅ Mover queries SQL para repository

#### Testes
- [ ] ✅ Criar testes para QueueRepository
- [ ] ✅ Criar testes para helper services
- [ ] ✅ Atualizar testes de `QueuesService`
- [ ] ✅ Rodar testes E2E

---

### 📦 MÓDULO: COMMON

#### Constantes
- [ ] ✅ Criar `queue.constants.ts`
  - [ ] QUEUE_DEFAULTS
  - [ ] QUEUE_PREFIXES
  - [ ] TIME_WINDOWS

- [ ] ✅ Criar `notification.constants.ts`
  - [ ] NOTIFICATION_TEMPLATES
  - [ ] NOTIFICATION_CHANNELS

- [ ] ✅ Criar `error-messages.constants.ts`
  - [ ] Mensagens padronizadas

#### Base Classes
- [ ] ✅ Criar `BaseValidationService`
- [ ] ✅ Criar `BaseRepository` (opcional)

#### Custom Exceptions
- [ ] ✅ Criar `business.exceptions.ts`
  - [ ] QueueFullException
  - [ ] QueueInactiveException
  - [ ] TicketNotFoundException
  - [ ] TenantInactiveException

---

### 📦 MÓDULO: AUTH

#### Limpeza
- [ ] ✅ Verificar duplicação de lógica
- [ ] ✅ Substituir console.log por Logger
- [ ] ✅ Adicionar JSDoc

---

### 📦 MÓDULO: NOTIFICATIONS

#### Organização
- [ ] ✅ Consolidar lógica de notificações
- [ ] ✅ Criar `NotificationOrchestrator`
- [ ] ✅ Implementar retry logic para falhas

---

### 📦 LIMPEZA GERAL

#### Código Morto
- [ ] ✅ Executar `ts-prune` para encontrar código não usado
- [ ] ✅ Remover imports não utilizados
- [ ] ✅ Remover métodos privados não chamados
- [ ] ✅ Remover DTOs duplicados

#### Agents Deprecation
- [ ] ✅ Verificar dependências de `Agent`
- [ ] ✅ Criar migration script (Agent → CorporateUser)
- [ ] ✅ Marcar module como @deprecated
- [ ] ✅ Atualizar testes

#### Error Handling
- [ ] ✅ Substituir throw new BadRequestException por custom exceptions
- [ ] ✅ Padronizar mensagens de erro
- [ ] ✅ Adicionar error codes

#### Logger
- [ ] ✅ Substituir TODOS console.log/error por Logger
- [ ] ✅ Configurar níveis de log adequados
- [ ] ✅ Adicionar context em cada logger

---

### 📦 DOCUMENTAÇÃO

#### JSDoc
- [ ] ✅ tickets.service.ts (métodos públicos)
- [ ] ✅ queues.service.ts (métodos públicos)
- [ ] ✅ auth.service.ts (métodos públicos)
- [ ] ✅ Todos os controllers

#### README por Módulo
- [ ] ✅ tickets/README.md
- [ ] ✅ queues/README.md
- [ ] ✅ auth/README.md
- [ ] ✅ notifications/README.md
- [ ] ✅ events/README.md

#### Documentação Geral
- [ ] ✅ Atualizar docs/README.md
- [ ] ✅ Criar diagrama de arquitetura atualizado
- [ ] ✅ Documentar helper services criados

---

### 📦 TESTES

#### Unitários
- [ ] ✅ TicketEstimateService (>90% coverage)
- [ ] ✅ TicketValidationService (>90% coverage)
- [ ] ✅ TicketNumberService (>90% coverage)
- [ ] ✅ TicketNotificationService (>90% coverage)
- [ ] ✅ QueueRepository (>90% coverage)
- [ ] ✅ QueueStatsService (>90% coverage)
- [ ] ✅ QueueCallService (>90% coverage)

#### Integração
- [ ] ✅ tickets/ (integration tests)
- [ ] ✅ queues/ (integration tests)
- [ ] ✅ auth/ (integration tests)

#### E2E
- [ ] ✅ Rodar TODOS os testes E2E após cada fase
- [ ] ✅ Adicionar novos casos de teste se necessário

#### Performance
- [ ] ✅ Load test (1000 tickets simultâneos)
- [ ] ✅ Stress test (call-next alta frequência)
- [ ] ✅ Memory leak detection

---

### 📦 QUALIDADE

#### Code Review
- [ ] ✅ Revisar todos os PRs
- [ ] ✅ Validar conformidade com style guide
- [ ] ✅ Verificar testes

#### Build
- [ ] ✅ Build de produção funcional
- [ ] ✅ Verificar bundle size
- [ ] ✅ Rodar lint

#### Deploy
- [ ] ✅ Deploy em staging
- [ ] ✅ Smoke tests
- [ ] ✅ Deploy em produção

---

## 6. MÉTRICAS DE SUCESSO

### 6.1. Métricas de Código

#### ANTES (Baseline Atual)
```
tickets.service.ts:
  - Linhas: 776
  - Métodos públicos: 15
  - Maior método: create() - 199 linhas
  - Complexidade ciclomática: ~450
  - Console.log: 15+

queues.service.ts:
  - Linhas: 949
  - Métodos públicos: 18
  - Maior método: callNext() - 250 linhas
  - Complexidade ciclomática: ~520
  - Console.log: 20+
  - Queries SQL raw: 8+

Geral:
  - Total de linhas: ~6500
  - Duplicação de código: ~15%
  - Cobertura de testes: ~65%
  - Helper services: 0
  - Repositories: 0
```

#### DEPOIS (Meta)
```
tickets.service.ts:
  - Linhas: ~250 (orquestração apenas)
  - Métodos públicos: 12-15
  - Maior método: ~50 linhas
  - Complexidade ciclomática: ~120
  - Console.log: 0 (Logger apenas)
  - Helper services: 4

queues.service.ts:
  - Linhas: ~350 (orquestração apenas)
  - Métodos públicos: 15-18
  - Maior método: ~50 linhas
  - Complexidade ciclomática: ~150
  - Console.log: 0
  - Helper services: 3
  - Repositories: 1 (QueueRepository)

Geral:
  - Total de linhas: ~8000 (mais código, mas melhor organizado)
  - Duplicação de código: <5%
  - Cobertura de testes: >80%
  - Helper services: 10+
  - Repositories: 2+
```

### 6.2. Métricas de Qualidade

#### Objetivos
- ✅ Nenhum método com >100 linhas
- ✅ Nenhum service com >500 linhas
- ✅ Zero console.log (usar Logger)
- ✅ Zero queries SQL raw em services (usar repositories)
- ✅ Duplicação de código <5%
- ✅ Cobertura de testes >80%
- ✅ Todos os testes E2E passando (100%)

### 6.3. Métricas de Legibilidade

#### Junior Developer Test
**Teste prático**: Um dev junior deve conseguir:
1. Entender o fluxo de criação de ticket em <15 minutos
2. Adicionar um novo campo ao ticket sem ajuda em <30 minutos
3. Debugar um problema de notificação em <20 minutos

**Meta**: Tempo médio reduzido em 50%.

---

## 7. REFERÊNCIAS

### 7.1. Artigos e Documentação

1. **Microsoft - DDD-oriented microservice**
   - URL: https://learn.microsoft.com/en-us/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/ddd-oriented-microservice
   - Tópicos: Clean Architecture, Layers, Domain Model

2. **Refactoring Guru - Refactoring Techniques**
   - URL: https://refactoring.guru/refactoring/techniques
   - Tópicos: Extract Method, Extract Class, Move Method

3. **Clean Architecture (DEV Community)**
   - URL: https://dev.to/dazevedo/clean-architecture-keeping-code-clean-and-maintainable-4lnc
   - Tópicos: Separation of Concerns, Testability

4. **NestJS Community - Large Service Refactoring**
   - Fonte: Reddit r/Nestjs_framework
   - Tópicos: Helper Services, Repository Pattern

### 7.2. Princípios Aplicados

- **SOLID Principles**
  - Single Responsibility Principle
  - Open/Closed Principle
  - Dependency Inversion Principle

- **Clean Code**
  - Métodos pequenos e focados
  - Nomes descritivos
  - Evitar duplicação

- **Domain-Driven Design**
  - Layers (Domain, Application, Infrastructure)
  - Repository Pattern
  - Domain Events

### 7.3. Ferramentas

- **Análise de Código**
  - ts-prune (código não usado)
  - depcheck (dependências não usadas)
  - SonarQube (qualidade)

- **Testes**
  - Jest (unit tests)
  - Supertest (E2E tests)
  - Artillery (performance tests)

---

## 8. OBSERVAÇÕES FINAIS

### 8.1. Princípios da Refatoração

1. **Incremental**: Fazer uma mudança por vez
2. **Testes primeiro**: Garantir que testes passam antes e depois
3. **Sem quebrar**: Manter funcionalidade 100% intacta
4. **Revisão**: Code review em cada PR

### 8.2. Riscos e Mitigações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Quebrar funcionalidade existente | Alto | Rodar testes E2E após cada mudança |
| Deadline apertado | Médio | Priorizar fases críticas (1-2) |
| Resistência do time | Médio | Documentar benefícios, fazer demos |
| Performance degradada | Baixo | Performance tests antes/depois |

### 8.3. Comunicação com o Time

**Antes de começar**:
- [ ] Apresentar roadmap para o time
- [ ] Coletar feedback e sugestões
- [ ] Ajustar prioridades se necessário
- [ ] Definir responsáveis por cada fase

**Durante**:
- [ ] Daily updates no Slack/Teams
- [ ] Demo das refatorações concluídas
- [ ] Pair programming quando necessário

**Depois**:
- [ ] Retrospectiva da refatoração
- [ ] Documentar lições aprendidas
- [ ] Celebrar conquistas 🎉

---

**✨ Fim do Roadmap ✨**

Este é um documento vivo. Atualizar conforme necessário durante a implementação.
