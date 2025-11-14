# 💳 Sistema de Assinaturas - Proposta de Implementação

## 📋 Visão Geral

Sistema completo de assinaturas para controlar recursos e funcionalidades disponíveis para cada empresa (tenant) baseado no plano contratado.

## 🎯 Objetivos

1. **Controle de Recursos**: Limitar número de filas, agentes, tickets, etc. por plano
2. **Gestão de Planos**: Criar e gerenciar diferentes planos de assinatura
3. **Histórico**: Manter histórico completo de assinaturas e mudanças de plano
4. **Flexibilidade**: Permitir planos customizados e limites específicos
5. **Pré-configuração**: Facilitar cadastro inicial com plano padrão

## 🗄️ Estrutura de Dados

### 1. SubscriptionPlan (Planos de Assinatura)

Define os planos disponíveis no sistema (ex: Free, Basic, Pro, Enterprise).

**Campos:**
- `id`: ID único do plano
- `name`: Nome do plano (ex: "Básico", "Profissional")
- `slug`: Identificador único (ex: "basic", "pro")
- `description`: Descrição do plano
- `price`: Preço mensal (em centavos)
- `billingCycle`: Ciclo de cobrança (MONTHLY, YEARLY)
- `isActive`: Se o plano está ativo para novos cadastros
- `features`: JSON com features habilitadas
- `limits`: JSON com limites do plano
- `createdAt`, `updatedAt`: Timestamps

**Limits (JSON):**
```json
{
  "maxQueues": 5,
  "maxAgents": 10,
  "maxCorporateUsers": 20,
  "maxTicketsPerDay": 1000,
  "maxCounters": 3,
  "hasAnalytics": true,
  "hasCustomBranding": false,
  "hasSMSNotifications": true,
  "hasEmailNotifications": true,
  "hasAPIAccess": false,
  "maxStorageGB": 1,
  "supportLevel": "email" // email, chat, phone, dedicated
}
```

### 2. Subscription (Assinaturas Ativas)

Representa a assinatura ativa de um tenant.

**Campos:**
- `id`: ID único da assinatura
- `tenantId`: Referência ao tenant
- `planId`: Referência ao plano
- `status`: Status da assinatura (ACTIVE, TRIAL, EXPIRED, CANCELLED, SUSPENDED)
- `startDate`: Data de início
- `endDate`: Data de término (null para planos sem expiração)
- `trialEndDate`: Data de término do trial (se aplicável)
- `autoRenew`: Se renova automaticamente
- `paymentMethod`: Método de pagamento (CREDIT_CARD, PIX, BOLETO, etc.)
- `externalSubscriptionId`: ID da assinatura no gateway de pagamento
- `currentPeriodStart`: Início do período atual
- `currentPeriodEnd`: Fim do período atual
- `canceledAt`: Data de cancelamento (se cancelada)
- `cancelReason`: Motivo do cancelamento
- `metadata`: JSON com dados adicionais
- `createdAt`, `updatedAt`: Timestamps

### 3. SubscriptionHistory (Histórico)

Registra todas as mudanças de assinatura.

**Campos:**
- `id`: ID único
- `subscriptionId`: Referência à assinatura
- `tenantId`: Referência ao tenant
- `action`: Ação realizada (CREATED, UPGRADED, DOWNGRADED, RENEWED, CANCELLED, EXPIRED, TRIAL_STARTED, TRIAL_ENDED)
- `fromPlanId`: Plano anterior (se mudança)
- `toPlanId`: Plano novo (se mudança)
- `reason`: Motivo da mudança
- `metadata`: JSON com dados adicionais
- `createdAt`: Timestamp

### 4. Tenant (Atualização)

Adicionar campos ao modelo Tenant:

**Novos campos:**
- `subscriptionId`: Referência à assinatura ativa (opcional)
- `subscriptionStatus`: Status atual (derivado da subscription)
- `trialEndsAt`: Data de término do trial (se em trial)
- `billingEmail`: Email para cobrança
- `billingDocument`: CPF/CNPJ para cobrança
- `billingAddress`: Endereço completo (JSON)
- `subscription`: Relação com Subscription

## 📊 Planos Sugeridos

### 1. Free (Gratuito)
- **Limites:**
  - 1 fila
  - 2 agentes
  - 5 usuários corporativos
  - 100 tickets/dia
  - 1 guichê
  - Sem analytics avançado
  - Sem customização
  - Suporte por email

### 2. Basic (Básico)
- **Limites:**
  - 5 filas
  - 10 agentes
  - 20 usuários corporativos
  - 1.000 tickets/dia
  - 3 guichês
  - Analytics básico
  - Notificações SMS/Email
  - Suporte por email/chat

### 3. Professional (Profissional)
- **Limites:**
  - 20 filas
  - 50 agentes
  - 100 usuários corporativos
  - 10.000 tickets/dia
  - 10 guichês
  - Analytics completo
  - Customização de marca
  - API access
  - Suporte prioritário

### 4. Enterprise (Empresarial)
- **Limites:**
  - Filas ilimitadas
  - Agentes ilimitados
  - Usuários ilimitados
  - Tickets ilimitados
  - Guichês ilimitados
  - Todos os recursos
  - Suporte dedicado
  - SLA garantido

## 🔄 Fluxo de Cadastro

### Opção 1: Cadastro com Trial (Recomendado)

1. **Cliente cria empresa** (`POST /api/v1/tenants`)
   - Sistema cria tenant
   - Sistema cria subscription com plano "Free" ou "Trial"
   - Status: `TRIAL`
   - Trial de 14 dias (configurável)

2. **Durante o trial:**
   - Acesso completo aos recursos do plano escolhido
   - Notificações de término do trial
   - Dashboard mostra dias restantes

3. **Após trial:**
   - Se não houver pagamento: downgrade para "Free"
   - Se houver pagamento: mantém plano e status `ACTIVE`

### Opção 2: Cadastro Direto com Plano

1. **Cliente cria empresa** (`POST /api/v1/tenants`)
   - Body inclui `planSlug` ou `planId`
   - Sistema cria tenant
   - Sistema cria subscription com plano escolhido
   - Status: `ACTIVE` ou `TRIAL` (dependendo do plano)

## 🛡️ Controle de Limites

### Middleware/Guard de Limites

Criar um guard que verifica limites antes de permitir ações:

```typescript
@UseGuards(SubscriptionLimitsGuard)
@Post('tenants/:tenantId/queues')
async createQueue() {
  // Só executa se não exceder limite de filas
}
```

**Verificações:**
- Antes de criar fila: verificar `maxQueues`
- Antes de criar agente: verificar `maxAgents`
- Antes de criar ticket: verificar `maxTicketsPerDay`
- Antes de acessar feature: verificar se feature está habilitada

### Service de Verificação

```typescript
class SubscriptionService {
  async checkLimit(tenantId: string, limitType: string): Promise<boolean>
  async getCurrentLimits(tenantId: string): Promise<SubscriptionLimits>
  async canUseFeature(tenantId: string, feature: string): Promise<boolean>
}
```

## 📝 Pré-configuração no Cadastro

### Endpoint Atualizado

```typescript
POST /api/v1/tenants
Body: {
  name: string,
  slug: string,
  email?: string,
  phone?: string,
  planSlug?: string, // Novo: plano inicial
  trialDays?: number, // Novo: dias de trial (padrão: 14)
  billingEmail?: string, // Novo: email para cobrança
}
```

### Comportamento Padrão

1. Se `planSlug` não for informado:
   - Criar com plano "Free" (limites básicos)
   - Status: `ACTIVE`

2. Se `planSlug` for informado:
   - Criar com plano especificado
   - Status: `TRIAL` (se plano permitir trial)
   - Trial de 14 dias (ou `trialDays` se informado)

3. Se plano for "Free":
   - Status: `ACTIVE` (sem trial)

## 🔔 Notificações e Alertas

### Eventos a Monitorar

1. **Trial expirando em breve** (3 dias antes)
2. **Trial expirado** (hoje)
3. **Assinatura expirando** (7 dias antes)
4. **Assinatura expirada** (hoje)
5. **Limite próximo** (80% do limite atingido)
6. **Limite excedido** (tentativa de criar recurso além do limite)

## 📈 Métricas e Analytics

### Dashboard de Assinaturas

- Total de assinantes por plano
- Taxa de conversão de trial
- Churn rate
- MRR (Monthly Recurring Revenue)
- ARR (Annual Recurring Revenue)
- Limites mais atingidos

## 🔐 Segurança

1. **Validação de limites**: Sempre verificar no backend
2. **Rate limiting**: Por plano (ex: API calls)
3. **Audit log**: Registrar todas as mudanças de assinatura
4. **Webhook**: Notificar sistema externo de mudanças

## 🚀 Implementação Faseada

### Fase 1: Estrutura Básica
- [ ] Criar modelos no Prisma
- [ ] Criar planos padrão (Free, Basic, Pro)
- [ ] Atualizar endpoint de criação de tenant
- [ ] Criar subscription automaticamente no cadastro

### Fase 2: Controle de Limites
- [ ] Criar SubscriptionService
- [ ] Criar guards de verificação de limites
- [ ] Implementar verificações em endpoints críticos
- [ ] Criar endpoints para consultar limites

### Fase 3: Gestão de Assinaturas
- [ ] Endpoints para atualizar assinatura
- [ ] Endpoints para cancelar assinatura
- [ ] Sistema de notificações
- [ ] Dashboard de assinaturas

### Fase 4: Integração com Gateway
- [ ] Integração com gateway de pagamento
- [ ] Webhooks de pagamento
- [ ] Renovação automática
- [ ] Gestão de métodos de pagamento

## 📚 Endpoints Sugeridos

### Assinaturas
- `GET /api/v1/subscriptions/plans` - Listar planos disponíveis
- `GET /api/v1/subscriptions/my-subscription` - Minha assinatura atual
- `PUT /api/v1/subscriptions/:id/upgrade` - Fazer upgrade
- `PUT /api/v1/subscriptions/:id/downgrade` - Fazer downgrade
- `PUT /api/v1/subscriptions/:id/cancel` - Cancelar assinatura
- `GET /api/v1/subscriptions/:id/history` - Histórico de assinaturas
- `GET /api/v1/subscriptions/limits` - Limites atuais

### Tenants (Atualizado)
- `POST /api/v1/tenants` - Criar com plano inicial
- `GET /api/v1/tenants/:id/subscription` - Assinatura do tenant

## 💡 Considerações Importantes

1. **Backward Compatibility**: Tenants existentes devem receber plano "Free" automaticamente
2. **Grace Period**: Permitir uso por alguns dias após expiração antes de bloquear
3. **Upgrade/Downgrade**: Permitir mudança de plano a qualquer momento
4. **Prorating**: Calcular valores proporcionais em mudanças de plano
5. **Data Retention**: Manter dados mesmo após cancelamento (configurável)

