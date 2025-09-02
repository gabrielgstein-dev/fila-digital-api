# 🎯 Matriz de Cobertura de Endpoints E2E

## 📊 Resumo da Cobertura

**Total de Endpoints**: 49
**Cobertos por Testes E2E**: Em desenvolvimento
**Meta**: 100% de cobertura dos endpoints críticos

---

## 🏷️ **System Endpoints** (`/api/v1/`)

| Endpoint | Método | Status | Teste E2E | Observações |
|----------|--------|--------|-----------|-------------|
| `/` | GET | ✅ | `app.e2e-spec.ts` | Hello endpoint |
| `/health` | GET | ✅ | `app.e2e-spec.ts` | Health check |

**Cobertura System**: 2/2 (100%) ✅

---

## 🔐 **Auth Endpoints** (`/api/v1/auth/`)

| Endpoint | Método | Status | Teste E2E | Observações |
|----------|--------|--------|-----------|-------------|
| `/login` | POST | ✅ | `auth.e2e-spec.ts` | Corporate user login |
| `/agent/login` | POST | ✅ | `auth.e2e-spec.ts` | Agent login |
| `/client/login` | POST | ⚠️ | `auth.e2e-spec.ts` | Client login (limitado) |
| `/google` | GET | ✅ | `google-auth.e2e-spec.ts` | Google OAuth redirect |
| `/google/callback` | GET | ✅ | `google-auth.e2e-spec.ts` | Google OAuth callback |
| `/google/token` | POST | ✅ | `google-auth.e2e-spec.ts` | Mobile Google login |

**Cobertura Auth**: 6/6 (100%) ✅

---

## 🏢 **Tenants Endpoints** (`/api/v1/tenants/`)

| Endpoint | Método | Status | Teste E2E | Observações |
|----------|--------|--------|-----------|-------------|
| `/` | POST | ✅ | `tenants.e2e-spec.ts` | Criar tenant (público) |
| `/` | GET | ✅ | `tenants.e2e-spec.ts` | Listar todos (admin only) |
| `/my-tenant` | GET | ✅ | `tenants.e2e-spec.ts` | Tenant do usuário logado |
| `/:id` | GET | ✅ | `tenants.e2e-spec.ts` | Buscar tenant por ID |
| `/slug/:slug` | GET | ✅ | `tenants.e2e-spec.ts` | Buscar por slug (público) |
| `/:id` | PUT | ✅ | `tenants.e2e-spec.ts` | Atualizar tenant |
| `/:id/toggle-active` | PUT | ✅ | `tenants.e2e-spec.ts` | Toggle ativo/inativo |
| `/:id` | DELETE | ✅ | `tenants.e2e-spec.ts` | Deletar tenant |

**Cobertura Tenants**: 8/8 (100%) ✅

---

## 👥 **Agents Endpoints** (`/api/v1/tenants/:tenantId/agents/`)

| Endpoint | Método | Status | Teste E2E | Observações |
|----------|--------|--------|-----------|-------------|
| `/` | POST | ❌ | **PENDENTE** | Criar agente |
| `/` | GET | ❌ | **PENDENTE** | Listar agentes do tenant |
| `/:id` | GET | ❌ | **PENDENTE** | Buscar agente por ID |
| `/:id` | PUT | ❌ | **PENDENTE** | Atualizar agente |
| `/:id/toggle-active` | PUT | ❌ | **PENDENTE** | Toggle ativo/inativo |
| `/:id` | DELETE | ❌ | **PENDENTE** | Deletar agente |

**Cobertura Agents**: 0/6 (0%) ❌

---

## 🏪 **Queues Endpoints** (`/api/v1/`)

| Endpoint | Método | Status | Teste E2E | Observações |
|----------|--------|--------|-----------|-------------|
| `/tenants/:tenantId/queues` | POST | ✅ | `queues.e2e-spec.ts` | Criar fila |
| `/tenants/:tenantId/queues` | GET | ✅ | `queues.e2e-spec.ts` | Listar filas do tenant |
| `/tenants/:tenantId/queues/:id` | GET | ✅ | `queues.e2e-spec.ts` | Buscar fila por ID |
| `/queues/:id/qrcode` | GET | ❌ | **PENDENTE** | Gerar QR Code |
| `/tenants/:tenantId/queues/:id` | PUT | ✅ | `queues.e2e-spec.ts` | Atualizar fila |
| `/tenants/:tenantId/queues/:id` | DELETE | ✅ | `queues.e2e-spec.ts` | Deletar fila |
| `/tenants/:tenantId/queues/:id/call-next` | POST | ❌ | **PENDENTE** | Chamar próximo |
| `/tenants/:tenantId/queues/:id/recall` | POST | ❌ | **PENDENTE** | Rechamar atual |

**Cobertura Queues**: 5/8 (62.5%) ⚠️

---

## 🎫 **Tickets Endpoints** (`/api/v1/`)

| Endpoint | Método | Status | Teste E2E | Observações |
|----------|--------|--------|-----------|-------------|
| `/queues/:queueId/tickets` | POST | ✅ | `tickets.e2e-spec.ts` | Criar ticket (público) |
| `/tickets/:id` | GET | ✅ | `tickets.e2e-spec.ts` | Buscar ticket (público) |
| `/queues/:queueId/status` | GET | ✅ | `tickets.e2e-spec.ts` | Status da fila (público) |
| `/tickets/:id/recall` | PUT | ❌ | **PENDENTE** | Rechamar ticket |
| `/tickets/:id/skip` | PUT | ❌ | **PENDENTE** | Pular ticket |
| `/tickets/:id/complete` | PUT | ❌ | **PENDENTE** | Completar ticket |
| `/tickets/:id/current-calling-token` | PUT | ❌ | **PENDENTE** | Atualizar token atual |

**Cobertura Tickets**: 3/7 (42.8%) ❌

---

## 👤 **Clients Endpoints** (`/api/v1/clients/`)

| Endpoint | Método | Status | Teste E2E | Observações |
|----------|--------|--------|-----------|-------------|
| `/my-tickets` | GET | ✅ | `clients.e2e-spec.ts` | Tickets do cliente |
| `/dashboard` | GET | ❌ | **PENDENTE** | Dashboard consolidado |
| `/queue-metrics` | GET | ❌ | **PENDENTE** | Métricas de fila |
| `/me` | GET | ❌ | **PENDENTE** | Perfil do cliente |

**Cobertura Clients**: 1/4 (25%) ❌

---

## 🏢 **Corporate Users Endpoints** (`/api/v1/tenants/:tenantId/corporate-users/`)

| Endpoint | Método | Status | Teste E2E | Observações |
|----------|--------|--------|-----------|-------------|
| `/` | POST | ✅ | `corporate-users.e2e-spec.ts` | Criar usuário corporativo |
| `/` | GET | ✅ | `corporate-users.e2e-spec.ts` | Listar usuários |
| `/:id` | GET | ✅ | `corporate-users.e2e-spec.ts` | Buscar por ID |
| `/:id` | PATCH | ✅ | `corporate-users.e2e-spec.ts` | Atualizar usuário |
| `/:id` | DELETE | ✅ | `corporate-users.e2e-spec.ts` | Deletar usuário |
| `/:id/toggle-active` | PATCH | ❌ | **PENDENTE** | Toggle ativo/inativo |
| `/:id/permissions` | PATCH | ❌ | **PENDENTE** | Atribuir permissões |
| `/:id/permissions/:resource/:action` | GET | ❌ | **PENDENTE** | Verificar permissão |

**Cobertura Corporate Users**: 5/8 (62.5%) ⚠️

---

## 📊 **Resumo Geral por Módulo**

| Módulo | Endpoints | Cobertos | % Cobertura | Status |
|--------|-----------|----------|-------------|--------|
| System | 2 | 2 | 100% | ✅ |
| Auth | 6 | 6 | 100% | ✅ |
| Tenants | 8 | 8 | 100% | ✅ |
| Agents | 6 | 0 | 0% | ❌ |
| Queues | 8 | 5 | 62.5% | ⚠️ |
| Tickets | 7 | 3 | 42.8% | ❌ |
| Clients | 4 | 1 | 25% | ❌ |
| Corporate Users | 8 | 5 | 62.5% | ⚠️ |

**TOTAL**: 49 endpoints, 30 cobertos = **61.2%** de cobertura

---

## 🎯 **Próximas Prioridades**

### **🔴 CRÍTICO** - Implementar IMEDIATAMENTE
1. **Agents CRUD** (6 endpoints) - 0% cobertura
2. **Tickets Actions** (4 endpoints) - Fluxos críticos de negócio
3. **Queues Actions** (3 endpoints) - Call next, recall

### **🟡 IMPORTANTE** - Implementar em seguida
1. **Clients Dashboard** (3 endpoints) - UX crítica
2. **Corporate Users Permissions** (3 endpoints) - Segurança

### **🟢 DESEJÁVEL** - Implementar por último
1. **QR Code Generation** (1 endpoint) - Funcionalidade adicional

---

## 🧪 **Estratégia de Implementação**

### **Fase 1**: Cobertura Crítica (Meta: 85%)
- Implementar todos os endpoints de **Agents**
- Completar endpoints de **Tickets** (actions)
- Completar endpoints de **Queues** (actions)

### **Fase 2**: Cobertura Completa (Meta: 95%)
- Implementar endpoints de **Clients**
- Completar endpoints de **Corporate Users**

### **Fase 3**: Refinamento (Meta: 100%)
- QR Code e funcionalidades especiais
- Testes de performance e edge cases
- Validação de segurança

---

**Última Atualização**: $(date)
**Status**: 🚧 **EM DESENVOLVIMENTO**
