# 🎨 Frontend Integration Guide - Novas Funcionalidades

## 📋 Visão Geral

Este documento descreve as implementações necessárias no **frontend** para integrar com as novas funcionalidades da API de filas:

1. ✅ **Tipos específicos de senha** (C, E, B, T, X, P, U)
2. ✅ **Sistema de abandono inteligente** com tolerância configurável
3. ✅ **Estatísticas de abandono** por fila
4. ✅ **Limpeza manual** de tickets abandonados

---

## 🏗️ Mudanças no Backend (Já Implementadas)

### **Novos Campos na API:**

```typescript
// Queue Model - Novos campos
interface Queue {
  // ... campos existentes
  serviceType: 'GENERAL' | 'CONSULTA' | 'EXAMES' | 'BALCAO' | 'TRIAGEM' | 'CAIXA' | 'PEDIATRIA' | 'URGENCIA';
  toleranceMinutes: number; // Default: 30 minutos
}

// Ticket Model - Prefixos automáticos
interface Ticket {
  // ... campos existentes  
  myCallingToken: string; // Agora: "B1", "C1", "E1", "T1", "X1", "P1", "U1"
  // Para filas prioritárias: "BP1", "CP1", etc.
}
```

### **Endpoints Atuais:**

```typescript
// Estatísticas de abandono
GET /api/v1/tenants/{tenantId}/queues/{queueId}/abandonment-stats
// Response: { totalTickets, noShowTickets, abandonmentRate, period }

// Limpeza manual de tickets abandonados  
POST /api/v1/tenants/{tenantId}/queues/{queueId}/cleanup
// Response: { cleanedCount, queueId, message }

// Endpoints de Tempo Real (Igniter.js)
GET /api/rt/tickets/stream - Stream geral de tickets
GET /api/rt/tickets/{ticketId}/stream - Stream de ticket específico
GET /api/rt/tickets/{ticketId} - Buscar ticket específico
GET /api/rt/tickets/queue/{queueId} - Buscar tickets de uma fila
GET /api/rt/tickets/stats - Estatísticas do sistema
```

---

## 🎯 Implementações Necessárias no Frontend

### **1. 📝 Formulário de Criação/Edição de Filas**

#### **Adicionar campos novos:**

```tsx
// Componente: CreateQueueForm.tsx
interface CreateQueueFormData {
  name: string;
  description?: string;
  queueType: 'GENERAL' | 'PRIORITY' | 'VIP';
  
  // 🆕 NOVOS CAMPOS
  serviceType: 'GENERAL' | 'CONSULTA' | 'EXAMES' | 'BALCAO' | 'TRIAGEM' | 'CAIXA' | 'PEDIATRIA' | 'URGENCIA';
  toleranceMinutes: number; // Default: 30
  
  capacity?: number;
  avgServiceTime: number;
}

const CreateQueueForm = () => {
  return (
    <form>
      {/* Campos existentes... */}
      
      {/* 🆕 NOVO: Tipo de Serviço */}
      <div className="form-group">
        <label>Tipo de Serviço</label>
        <select name="serviceType" required>
          <option value="GENERAL">Geral</option>
          <option value="CONSULTA">Consulta Médica</option>
          <option value="EXAMES">Exames</option>
          <option value="BALCAO">Balcão de Atendimento</option>
          <option value="TRIAGEM">Triagem</option>
          <option value="CAIXA">Caixa/Financeiro</option>
          <option value="PEDIATRIA">Pediatria</option>
          <option value="URGENCIA">Urgência</option>
        </select>
        <small>Determina o prefixo da senha (C, E, B, T, X, P, U)</small>
      </div>

      {/* 🆕 NOVO: Tolerância de Abandono */}
      <div className="form-group">
        <label>Tolerância para Abandono (minutos)</label>
        <input 
          type="number" 
          name="toleranceMinutes" 
          min="5" 
          max="120" 
          defaultValue={30}
          required 
        />
        <small>
          Tempo limite para marcar ticket como "não compareceu" após ser chamado
        </small>
      </div>
    </form>
  );
};
```

#### **Preview do Tipo de Senha:**

```tsx
// Componente: PasswordPreview.tsx
const PasswordPreview = ({ serviceType, queueType }) => {
  const getPasswordPrefix = (serviceType, queueType) => {
    const prefixMap = {
      'CONSULTA': 'C',
      'EXAMES': 'E',
      'BALCAO': 'B', 
      'TRIAGEM': 'T',
      'CAIXA': 'X',
      'PEDIATRIA': 'P',
      'URGENCIA': 'U',
      'GENERAL': 'G'
    };
    
    let prefix = prefixMap[serviceType] || 'G';
    
    // Adicionar P para prioritárias (exceto urgência)
    if (queueType === 'PRIORITY' && serviceType !== 'URGENCIA') {
      prefix += 'P';
    }
    
    return prefix;
  };

  const prefix = getPasswordPrefix(serviceType, queueType);
  
  return (
    <div className="password-preview">
      <span className="label">Exemplo de senha:</span>
      <span className="password-example">{prefix}1, {prefix}2, {prefix}3...</span>
    </div>
  );
};
```

---

### **2. 📊 Dashboard de Filas - Melhorias**

#### **Exibir informações dos novos tipos:**

```tsx
// Componente: QueueCard.tsx
const QueueCard = ({ queue }) => {
  const serviceTypeLabels = {
    'CONSULTA': { label: 'Consulta', icon: '🩺', color: 'blue' },
    'EXAMES': { label: 'Exames', icon: '🔬', color: 'green' },
    'BALCAO': { label: 'Balcão', icon: '🏢', color: 'gray' },
    'TRIAGEM': { label: 'Triagem', icon: '🚨', color: 'orange' },
    'CAIXA': { label: 'Caixa', icon: '💰', color: 'yellow' },
    'PEDIATRIA': { label: 'Pediatria', icon: '👶', color: 'pink' },
    'URGENCIA': { label: 'Urgência', icon: '🚑', color: 'red' },
  };

  const serviceInfo = serviceTypeLabels[queue.serviceType] || 
    { label: 'Geral', icon: '📋', color: 'gray' };

  return (
    <div className="queue-card">
      <div className="queue-header">
        <span className="service-icon">{serviceInfo.icon}</span>
        <h3>{queue.name}</h3>
        <span className={`service-badge ${serviceInfo.color}`}>
          {serviceInfo.label}
        </span>
      </div>

      <div className="queue-stats">
        <div className="stat">
          <span className="label">Aguardando:</span>
          <span className="value">{queue.totalWaiting}</span>
        </div>
        
        <div className="stat">
          <span className="label">Senha atual:</span>
          <span className="current-password">{queue.currentNumber}</span>
        </div>

        {/* 🆕 NOVO: Tolerância */}
        <div className="stat">
          <span className="label">Tolerância:</span>
          <span className="value">{queue.toleranceMinutes}min</span>
        </div>
      </div>
    </div>
  );
};
```

---

### **3. 🧹 Ferramentas de Administração**

#### **Painel de Limpeza de Tickets:**

```tsx
// Componente: QueueMaintenancePanel.tsx
const QueueMaintenancePanel = ({ queueId, tenantId }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  // Buscar estatísticas de abandono
  const fetchAbandonmentStats = async () => {
    try {
      const response = await api.get(
        `/tenants/${tenantId}/queues/${queueId}/abandonment-stats`
      );
      setStats(response.data);
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
    }
  };

  // Limpeza manual
  const handleManualCleanup = async () => {
    if (!confirm('Deseja limpar tickets abandonados desta fila?')) return;
    
    setLoading(true);
    try {
      const response = await api.post(
        `/tenants/${tenantId}/queues/${queueId}/cleanup`
      );
      
      alert(`✅ ${response.data.message}`);
      await fetchAbandonmentStats(); // Atualizar stats
    } catch (error) {
      alert('❌ Erro na limpeza: ' + error.response?.data?.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAbandonmentStats();
  }, [queueId]);

  return (
    <div className="maintenance-panel">
      <h4>🧹 Manutenção da Fila</h4>
      
      {/* Estatísticas de Abandono */}
      {stats && (
        <div className="abandonment-stats">
          <h5>📊 Estatísticas (últimos 7 dias)</h5>
          <div className="stats-grid">
            <div className="stat-card">
              <span className="label">Total de Tickets:</span>
              <span className="value">{stats.totalTickets}</span>
            </div>
            <div className="stat-card">
              <span className="label">Não Compareceram:</span>
              <span className="value danger">{stats.noShowTickets}</span>
            </div>
            <div className="stat-card">
              <span className="label">Taxa de Abandono:</span>
              <span className={`value ${stats.abandonmentRate > 20 ? 'danger' : 'success'}`}>
                {stats.abandonmentRate}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Botão de Limpeza Manual */}
      <div className="cleanup-section">
        <button 
          onClick={handleManualCleanup}
          disabled={loading}
          className="btn btn-warning"
        >
          {loading ? '🔄 Limpando...' : '🧹 Limpeza Manual'}
        </button>
        <small>
          Remove tickets que ultrapassaram o tempo de tolerância
        </small>
      </div>
    </div>
  );
};
```

---

### **4. 🎫 Interface de Tickets - Melhorias**

#### **Exibir novos tipos de senha:**

```tsx
// Componente: TicketDisplay.tsx
const TicketDisplay = ({ ticket }) => {
  // Detectar tipo de senha pelo prefixo
  const getPasswordType = (token) => {
    const prefix = token.replace(/\d+$/, '');
    const types = {
      'B': { label: 'Balcão', color: 'gray' },
      'BP': { label: 'Balcão Prioritário', color: 'orange' },
      'C': { label: 'Consulta', color: 'blue' },
      'CP': { label: 'Consulta Prioritária', color: 'blue' },
      'E': { label: 'Exames', color: 'green' },
      'T': { label: 'Triagem', color: 'orange' },
      'X': { label: 'Caixa', color: 'yellow' },
      'P': { label: 'Pediatria', color: 'pink' },
      'U': { label: 'Urgência', color: 'red' },
    };
    
    return types[prefix] || { label: 'Geral', color: 'gray' };
  };

  const passwordType = getPasswordType(ticket.myCallingToken);

  return (
    <div className="ticket-card">
      <div className="ticket-header">
        <span className={`password-badge ${passwordType.color}`}>
          {ticket.myCallingToken}
        </span>
        <span className="password-type">
          {passwordType.label}
        </span>
      </div>

      <div className="ticket-info">
        <p><strong>Cliente:</strong> {ticket.clientName}</p>
        <p><strong>Status:</strong> {ticket.status}</p>
        <p><strong>Posição:</strong> {ticket.position}</p>
        
        {/* 🆕 NOVO: Tempo de tolerância */}
        {ticket.status === 'CALLED' && (
          <div className="tolerance-warning">
            ⏰ Tolerância: {ticket.queue.toleranceMinutes} minutos
          </div>
        )}
      </div>
    </div>
  );
};
```

---

### **5. 📱 Interface do Cliente - QR Code**

#### **Mostrar tipo de senha na confirmação:**

```tsx
// Componente: QueueConfirmation.tsx  
const QueueConfirmation = ({ queue, ticket }) => {
  const serviceTypeLabels = {
    'CONSULTA': '🩺 Consulta Médica',
    'EXAMES': '🔬 Exames',
    'BALCAO': '🏢 Balcão de Atendimento',
    'TRIAGEM': '🚨 Triagem',
    'CAIXA': '💰 Caixa',
    'PEDIATRIA': '👶 Pediatria',
    'URGENCIA': '🚑 Urgência',
  };

  return (
    <div className="confirmation-screen">
      <div className="success-icon">✅</div>
      
      <h2>Senha Retirada com Sucesso!</h2>
      
      <div className="ticket-info">
        <div className="password-display">
          <span className="password">{ticket.myCallingToken}</span>
          <span className="service-type">
            {serviceTypeLabels[queue.serviceType] || '📋 Atendimento Geral'}
          </span>
        </div>

        <div className="queue-info">
          <p><strong>Fila:</strong> {queue.name}</p>
          <p><strong>Posição:</strong> {ticket.position}º na fila</p>
          <p><strong>Tempo estimado:</strong> {Math.round(ticket.estimatedTime / 60)} minutos</p>
          
          {/* 🆕 NOVO: Aviso de tolerância */}
          <div className="tolerance-notice">
            <p>⏰ <strong>Importante:</strong> Após ser chamado, você tem 
               <strong> {queue.toleranceMinutes} minutos</strong> para comparecer.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
```

---

## 🎨 Sugestões de UI/UX

### **Cores por Tipo de Serviço:**

```css
/* Paleta de cores sugerida */
.service-consulta { background: #3b82f6; color: white; }
.service-exames { background: #10b981; color: white; }
.service-balcao { background: #6b7280; color: white; }
.service-triagem { background: #f59e0b; color: white; }
.service-caixa { background: #eab308; color: black; }
.service-pediatria { background: #ec4899; color: white; }
.service-urgencia { background: #dc2626; color: white; }

/* Estados de prioridade */
.priority-high { border-left: 4px solid #dc2626; }
.priority-normal { border-left: 4px solid #6b7280; }
```

### **Ícones Sugeridos:**

- 🩺 Consulta
- 🔬 Exames  
- 🏢 Balcão
- 🚨 Triagem
- 💰 Caixa
- 👶 Pediatria
- 🚑 Urgência

---

## 📋 Checklist de Implementação

### **Frontend Tasks:**

- [ ] **Formulário de Fila**
  - [ ] Adicionar campo `serviceType` (dropdown)
  - [ ] Adicionar campo `toleranceMinutes` (number input)
  - [ ] Implementar preview do tipo de senha
  - [ ] Validação dos novos campos

- [ ] **Dashboard de Filas**
  - [ ] Exibir ícones por tipo de serviço
  - [ ] Mostrar tolerância configurada
  - [ ] Atualizar cards com novas informações

- [ ] **Painel de Administração**
  - [ ] Implementar estatísticas de abandono
  - [ ] Botão de limpeza manual
  - [ ] Alertas para alta taxa de abandono

- [ ] **Interface de Tickets**
  - [ ] Badges coloridos por tipo de senha
  - [ ] Indicador de tempo de tolerância
  - [ ] Status visual melhorado

- [ ] **Interface do Cliente**
  - [ ] Confirmação com tipo de serviço
  - [ ] Aviso sobre tolerância
  - [ ] Melhor identificação visual da senha

### **Testes Necessários:**

- [ ] Criação de filas com novos tipos
- [ ] Geração de senhas com prefixos corretos
- [ ] Estatísticas de abandono funcionando
- [ ] Limpeza manual de tickets
- [ ] Responsividade mobile
- [ ] Acessibilidade (WCAG)

---

## 🚀 Conclusão

Com essas implementações, o frontend terá:

1. ✅ **Interface completa** para gerenciar tipos de senha
2. ✅ **Ferramentas administrativas** para limpeza e estatísticas  
3. ✅ **Experiência do cliente** melhorada com informações claras
4. ✅ **Sistema visual** intuitivo com cores e ícones

**O resultado será um sistema de filas mais profissional e adequado para ambientes hospitalares/clínicos!** 🏥✨



