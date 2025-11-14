# Análise de Métricas e Auditoria - Sistema de Filas

## 📊 Métricas Solicitadas

1. **Tempo médio de atendimento**
2. **Próxima estimativa**
3. **Total processado**
4. **Atendidos hoje**
5. **Espera média**

---

## ✅ O que ESTÁ sendo guardado

### 1. Tabela `tickets`
- ✅ `createdAt` - Data de criação do ticket
- ✅ `calledAt` - Data/hora em que o ticket foi chamado
- ✅ `completedAt` - Data/hora em que o ticket foi completado
- ✅ `status` - Status atual (WAITING, CALLED, COMPLETED, NO_SHOW, CANCELLED)
- ✅ `estimatedTime` - Tempo estimado (calculado na criação)
- ✅ `priority` - Prioridade do ticket
- ✅ `myCallingToken` - Token da senha (ex: G1, G2)

**Uso atual:**
- Cálculo de tempo médio de atendimento: `completedAt - calledAt` (em tempo real)
- Cálculo de espera média: baseado em tickets completados hoje
- Total processado: contagem de tickets COMPLETED/NO_SHOW do dia

### 2. Tabela `queue_ticket_history`
- ✅ `id` - ID único do registro
- ✅ `queueId` - ID da fila
- ✅ `ticketId` - ID do ticket
- ✅ `action` - Ação realizada (CALLED, COMPLETED, NO_SHOW, CANCELLED)
- ✅ `callingToken` - Token da senha
- ✅ `calledBy` - ID do usuário que chamou (pode ser null)
- ✅ `calledAt` - Data/hora da ação
- ✅ `metadata` - JSON com dados adicionais:
  - Para CALLED: `clientName`, `clientPhone`, `priority`, `estimatedTime`
  - Para COMPLETED: `serviceTime` (em segundos), `status`

**Status:** ✅ Tabela existe e está sendo populada pelo trigger `notify_and_log_ticket_change()`

**Problema:** ❌ Esta tabela NÃO está sendo usada para calcular métricas. As métricas são calculadas diretamente da tabela `tickets`.

### 3. Tabela `call_logs`
- ✅ `id` - ID único
- ✅ `action` - Ação (CALLED, RECALLED, SKIPPED, COMPLETED, NO_SHOW)
- ✅ `calledAt` - Data/hora da ação
- ✅ `serviceTime` - Tempo de serviço em segundos (pode ser null)
- ✅ `ticketId` - ID do ticket
- ✅ `queueId` - ID da fila
- ✅ `agentId` - ID do agente
- ✅ `counterId` - ID do balcão

**Status:** ⚠️ Tabela existe no schema, mas **NÃO está sendo populada** no fluxo atual.

**Problema:** ❌ Esta tabela não está sendo usada. O `serviceTime` deveria ser salvo aqui quando um ticket é completado.

---

## ❌ O que NÃO está sendo guardado/calculado corretamente

### 1. Tempo médio de atendimento
**Status atual:**
- ✅ Calculado em tempo real: `completedAt - calledAt` dos tickets COMPLETED
- ✅ Método: `QueueReportsService.getAverageServiceTime()` (últimos 7 dias)
- ✅ Método: `QueuesService.calculateAverageWaitTime()` (apenas tickets completados hoje)

**Problemas:**
- ❌ Não usa `queue_ticket_history` que já tem `serviceTime` no metadata
- ❌ Não usa `call_logs` que tem campo `serviceTime` dedicado
- ❌ Cálculo é feito apenas quando necessário, não há cache/persistência
- ❌ Não há histórico de evolução do tempo médio ao longo do tempo

**Sugestão:**
- Usar `queue_ticket_history.metadata->>'serviceTime'` para cálculos históricos
- Popular `call_logs.serviceTime` quando ticket é completado
- Criar tabela de agregações diárias para performance

### 2. Próxima estimativa
**Status atual:**
- ✅ Calculado em tempo real: `position * avgServiceTime`
- ✅ Método: `QueuesService.calculateNextEstimatedTime()`
- ✅ Usa `queue.avgServiceTime` (valor fixo configurado na fila)

**Problemas:**
- ❌ Usa `avgServiceTime` fixo da fila, não o tempo médio real de atendimento
- ❌ Não considera variações de horário (pico vs. normal)
- ❌ Não considera prioridade dos tickets

**Sugestão:**
- Calcular estimativa baseada no tempo médio real dos últimos atendimentos
- Usar `queue_ticket_history` para calcular tempo médio recente (últimas 2-3 horas)
- Considerar posição na fila e prioridade

### 3. Total processado
**Status atual:**
- ✅ Calculado em tempo real: contagem de tickets COMPLETED/NO_SHOW
- ✅ Método: `QueuesService.getQueueDetailedStats()` (apenas do dia atual)

**Problemas:**
- ❌ Não há histórico persistido (apenas cálculo em tempo real)
- ❌ Não há agregações por período (dia, semana, mês)
- ❌ Não há separação por tipo (COMPLETED vs NO_SHOW)

**Sugestão:**
- Usar `queue_ticket_history` para contar ações COMPLETED/NO_SHOW
- Criar tabela de agregações diárias: `queue_daily_stats`
- Permitir consulta histórica por período

### 4. Atendidos hoje
**Status atual:**
- ✅ Calculado em tempo real: contagem de tickets COMPLETED do dia
- ✅ Método: `QueuesService.getQueueDetailedStats()` (filtro por `completedAt >= hoje`)

**Problemas:**
- ❌ Mesmos problemas do "Total processado"
- ❌ Não diferencia por horário (manhã, tarde, noite)

**Sugestão:**
- Usar `queue_ticket_history` com filtro por data
- Criar agregações por hora do dia
- Permitir consulta histórica

### 5. Espera média
**Status atual:**
- ✅ Calculado em tempo real: média de `completedAt - calledAt` dos tickets completados hoje
- ✅ Método: `QueuesService.calculateAverageWaitTime()`
- ✅ Método alternativo: `QueueReportsService.getAverageWaitTime()` (últimos 7 dias)

**Problemas:**
- ❌ Cálculo apenas para tickets completados hoje (pode ser poucos dados)
- ❌ Não considera tempo de espera de tickets ainda aguardando
- ❌ Não usa `queue_ticket_history` que já tem `serviceTime`

**Sugestão:**
- Usar `queue_ticket_history.metadata->>'serviceTime'` para cálculos históricos
- Calcular espera média considerando tickets ainda aguardando (tempo desde criação)
- Criar agregações diárias

---

## 🔍 Análise de Auditoria

### Dados disponíveis para auditoria

#### ✅ Histórico completo de ações
- `queue_ticket_history` guarda TODAS as ações (CALLED, COMPLETED, NO_SHOW, CANCELLED)
- Inclui timestamp exato (`calledAt`)
- Inclui quem chamou (`calledBy` - quando disponível)
- Inclui metadata com informações do ticket

#### ✅ Rastreabilidade
- Cada ticket tem `createdAt`, `calledAt`, `completedAt`
- Cada ação no histórico tem timestamp
- Relação entre tickets e filas está preservada

#### ⚠️ Dados faltando para auditoria completa
- ❌ `call_logs` não está sendo populado (teria agentId, counterId)
- ❌ Não há registro de quem completou o ticket (apenas quem chamou)
- ❌ Não há registro de tempo de espera antes de ser chamado (apenas tempo de serviço)

---

## 📋 Recomendações

### 1. Usar `queue_ticket_history` para cálculos
**Ação:** Modificar serviços para usar `queue_ticket_history` em vez de calcular diretamente de `tickets`

**Benefícios:**
- Performance melhor (tabela otimizada para consultas históricas)
- Dados mais confiáveis (já inclui `serviceTime` calculado)
- Histórico completo preservado

### 2. Popular `call_logs` quando ticket é completado
**Ação:** Adicionar lógica para inserir em `call_logs` quando ticket muda para COMPLETED

**Benefícios:**
- Rastreabilidade de qual agente/balcão atendeu
- Tempo de serviço dedicado em campo próprio
- Melhor para relatórios de performance de agentes

### 3. Criar tabela de agregações diárias
**Ação:** Criar `queue_daily_stats` com métricas pré-calculadas por dia

**Estrutura sugerida:**
```sql
CREATE TABLE queue_daily_stats (
  id TEXT PRIMARY KEY,
  queueId TEXT NOT NULL,
  date DATE NOT NULL,
  totalProcessed INTEGER DEFAULT 0,
  totalCompleted INTEGER DEFAULT 0,
  totalNoShow INTEGER DEFAULT 0,
  avgServiceTime INTEGER DEFAULT 0,
  avgWaitTime INTEGER DEFAULT 0,
  peakHour INTEGER,
  createdAt TIMESTAMP DEFAULT NOW(),
  UNIQUE(queueId, date)
);
```

**Benefícios:**
- Performance muito melhor para consultas históricas
- Facilita relatórios e dashboards
- Permite análise de tendências

### 4. Melhorar cálculo de próxima estimativa
**Ação:** Usar tempo médio real dos últimos atendimentos em vez de valor fixo

**Implementação:**
```typescript
// Calcular tempo médio das últimas 2-3 horas
const recentServiceTimes = await prisma.$queryRaw`
  SELECT
    (metadata->>'serviceTime')::integer as serviceTime
  FROM queue_ticket_history
  WHERE "queueId" = ${queueId}
    AND action = 'COMPLETED'
    AND "calledAt" >= NOW() - INTERVAL '3 hours'
    AND metadata->>'serviceTime' IS NOT NULL
`;

const avgRecentServiceTime = recentServiceTimes.length > 0
  ? recentServiceTimes.reduce((sum, r) => sum + r.serviceTime, 0) / recentServiceTimes.length
  : queue.avgServiceTime;

const nextEstimatedTime = position * avgRecentServiceTime;
```

### 5. Adicionar tempo de espera antes de ser chamado
**Ação:** Calcular e salvar `waitTime` = `calledAt - createdAt` no metadata de `queue_ticket_history`

**Benefícios:**
- Permite calcular espera média real (não apenas tempo de serviço)
- Facilita análise de qualidade de atendimento

---

## 📊 Resumo Executivo

### ✅ O que funciona
- Dados básicos estão sendo guardados (tickets, histórico)
- Cálculos em tempo real funcionam
- Histórico de ações está sendo registrado

### ⚠️ O que precisa melhorar
- Usar `queue_ticket_history` para cálculos (não apenas `tickets`)
- Popular `call_logs` para rastreabilidade completa
- Criar agregações diárias para performance
- Melhorar cálculo de estimativas usando dados reais

### ❌ O que está faltando
- Histórico persistido de métricas (apenas cálculo em tempo real)
- Agregações por período (dia, semana, mês)
- Rastreabilidade de agente/balcão (call_logs não populado)
- Tempo de espera antes de ser chamado (apenas tempo de serviço)

---

## 🎯 Prioridades

1. **ALTA:** Usar `queue_ticket_history` para cálculos de métricas
2. **ALTA:** Popular `call_logs` quando ticket é completado
3. **MÉDIA:** Criar tabela de agregações diárias
4. **MÉDIA:** Melhorar cálculo de próxima estimativa
5. **BAIXA:** Adicionar tempo de espera antes de ser chamado
