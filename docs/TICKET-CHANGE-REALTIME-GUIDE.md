# 🎫 Guia de Mudança de Ticket em Tempo Real

## 📋 Visão Geral

Este sistema implementa mudança de ticket com notificações em tempo real usando **exclusivamente o Igniter.js**, que fornece **Server-Sent Events (SSE)** otimizados e gerenciamento inteligente de cache para máxima performance e experiência do usuário.

## 🚀 Funcionalidades

- ✅ **Mudança de ticket segura** com validações robustas
- ✅ **Notificações em tempo real** via Igniter.js SSE otimizado
- ✅ **Cache inteligente** de notificações com TTL configurável
- ✅ **Invalidação automática** de sessões ativas
- ✅ **Rate limiting** para proteção contra ataques
- ✅ **Suporte multi-usuário** (Corporate Users, Agents, Clients)
- ✅ **Hierarquia de permissões** respeitada
- ✅ **Performance otimizada** com polling inteligente
- ✅ **Auditoria e logs** de segurança

## 🔧 API Endpoints

### 1. Mudança de Ticket (REST)

```http
POST /auth/change-ticket
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentTicket": "ticketAtual123!",
  "newTicket": "novoTicket456@",
  "confirmTicket": "novoTicket456@"
}
```

**Resposta de Sucesso:**
```json
{
  "message": "Ticket alterado com sucesso",
  "changedAt": "2024-01-15T10:30:00Z",
  "requiresReauth": true,
  "invalidatedSessions": 3
}
```

### 2. Stream de Mudanças em Tempo Real (SSE)

```http
GET /auth/realtime/ticket-changes
Authorization: Bearer <token>
Accept: text/event-stream
```

**Eventos Recebidos:**
```javascript
// Evento de ticket alterado
{
  "eventType": "ticket-changed",
  "userId": "user123",
  "message": "Seu ticket foi alterado com sucesso",
  "timestamp": "2024-01-15T10:30:00Z",
  "requiresReauth": true,
  "metadata": {
    "userType": "corporate_user",
    "tenantId": "tenant123"
  }
}

// Evento de sessão invalidada
{
  "eventType": "session-invalidated",
  "userId": "user123",
  "message": "Sua sessão foi invalidada",
  "timestamp": "2024-01-15T10:30:00Z",
  "requiresReauth": true,
  "metadata": {
    "reason": "ticket-changed"
  }
}
```

### 3. Stream de Eventos de Segurança (SSE)

```http
GET /auth/realtime/security-events?tenantScope=true
Authorization: Bearer <token>
Accept: text/event-stream
```

## 💻 Implementação no Frontend

### JavaScript/TypeScript

```typescript
class TicketChangeManager {
  private eventSource: EventSource | null = null;

  constructor(private token: string) {}

  // Alterar ticket
  async changeTicket(tickets: {
    currentTicket: string;
    newTicket: string;
    confirmTicket: string;
  }) {
    const response = await fetch('/auth/change-ticket', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tickets),
    });

    if (!response.ok) {
      throw new Error('Falha ao alterar ticket');
    }

    return response.json();
  }

  // Conectar ao stream SSE
  connectToTicketChanges() {
    this.eventSource = new EventSource('/auth/realtime/ticket-changes', {
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
    });

    this.eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleTicketEvent(data);
    };

    this.eventSource.onerror = (error) => {
      console.error('Erro na conexão SSE:', error);
      this.reconnectSSE();
    };
  }

  // Conectar via polling para complementar SSE (opcional)
  startPolling() {
    // O Igniter.js já gerencia tudo via SSE, mas podemos fazer polling adicional se necessário
    this.pollingInterval = setInterval(async () => {
      try {
        const response = await fetch('/auth/realtime/ticket-changes/poll', {
          headers: {
            'Authorization': `Bearer ${this.token}`,
          },
        });

        if (response.ok) {
          const notifications = await response.json();
          notifications.forEach(notification => {
            this.handleTicketEvent(notification);
          });
        }
      } catch (error) {
        console.error('Erro no polling:', error);
      }
    }, 5000); // A cada 5 segundos
  }

  private handleTicketEvent(data: any) {
    switch (data.eventType || data.type) {
      case 'ticket-changed':
        this.showNotification('Ticket alterado com sucesso!', 'success');
        if (data.requiresReauth) {
          this.redirectToLogin();
        }
        break;

      case 'session-invalidated':
        this.showNotification('Sua sessão foi invalidada', 'warning');
        this.redirectToLogin();
        break;
    }
  }

  private handleSessionInvalidation(data: any) {
    this.showNotification('Sessão invalidada: ' + data.reason, 'warning');
    this.redirectToLogin();
  }

  private showNotification(message: string, type: 'success' | 'warning' | 'error') {
    // Implementar notificação (toast, modal, etc.)
    console.log(`[${type.toUpperCase()}] ${message}`);
  }

  private redirectToLogin() {
    // Redirecionar para página de login
    window.location.href = '/login';
  }

  private reconnectSSE() {
    setTimeout(() => {
      this.connectToTicketChanges();
    }, 5000); // Tentar reconectar após 5 segundos
  }

  disconnect() {
    this.eventSource?.close();
  }
}

// Uso
const ticketManager = new TicketChangeManager(userToken);

// Conectar ao stream SSE via Igniter.js
ticketManager.connectToTicketChanges();

// Opcionalmente, iniciar polling adicional
ticketManager.startPolling();

// Alterar ticket
ticketManager.changeTicket({
  currentTicket: 'ticketAtual123!',
  newTicket: 'novoTicket456@',
  confirmTicket: 'novoTicket456@',
}).then(result => {
  console.log('Ticket alterado:', result);
}).catch(error => {
  console.error('Erro:', error);
});
```

### React Hook

```typescript
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';

interface TicketChangeState {
  isChanging: boolean;
  error: string | null;
  success: boolean;
}

export function useTicketChange() {
  const { token, logout } = useAuth();
  const [state, setState] = useState<TicketChangeState>({
    isChanging: false,
    error: null,
    success: false,
  });

  // Conectar ao SSE
  useEffect(() => {
    if (!token) return;

    const eventSource = new EventSource('/auth/realtime/ticket-changes', {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.eventType === 'ticket-changed') {
        setState(prev => ({ ...prev, success: true }));

        if (data.requiresReauth) {
          setTimeout(() => {
            logout();
          }, 2000); // Dar tempo para mostrar mensagem de sucesso
        }
      }
    };

    return () => eventSource.close();
  }, [token, logout]);

  const changeTicket = useCallback(async (tickets: {
    currentTicket: string;
    newTicket: string;
    confirmTicket: string;
  }) => {
    setState({ isChanging: true, error: null, success: false });

    try {
      const response = await fetch('/auth/change-ticket', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tickets),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Falha ao alterar ticket');
      }

      const result = await response.json();
      setState({ isChanging: false, error: null, success: true });
      return result;

    } catch (error) {
      setState({
        isChanging: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        success: false,
      });
      throw error;
    }
  }, [token]);

  return {
    changeTicket,
    isChanging: state.isChanging,
    error: state.error,
    success: state.success,
  };
}
```

### Componente React

```tsx
import React, { useState } from 'react';
import { useTicketChange } from './useTicketChange';

export function TicketChangeForm() {
  const { changeTicket, isChanging, error, success } = useTicketChange();
  const [tickets, setTickets] = useState({
    currentTicket: '',
    newTicket: '',
    confirmTicket: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await changeTicket(tickets);
      setTickets({ currentTicket: '', newTicket: '', confirmTicket: '' });
    } catch (error) {
      // Erro já é tratado pelo hook
    }
  };

  return (
    <form onSubmit={handleSubmit} className="ticket-change-form">
      <div className="form-group">
        <label htmlFor="currentTicket">Ticket Atual</label>
        <input
          type="password"
          id="currentTicket"
          value={tickets.currentTicket}
          onChange={(e) => setTickets(prev => ({
            ...prev,
            currentTicket: e.target.value
          }))}
          required
          disabled={isChanging}
        />
      </div>

      <div className="form-group">
        <label htmlFor="newTicket">Novo Ticket</label>
        <input
          type="password"
          id="newTicket"
          value={tickets.newTicket}
          onChange={(e) => setTickets(prev => ({
            ...prev,
            newTicket: e.target.value
          }))}
          required
          disabled={isChanging}
          minLength={8}
        />
      </div>

      <div className="form-group">
        <label htmlFor="confirmTicket">Confirmar Novo Ticket</label>
        <input
          type="password"
          id="confirmTicket"
          value={tickets.confirmTicket}
          onChange={(e) => setTickets(prev => ({
            ...prev,
            confirmTicket: e.target.value
          }))}
          required
          disabled={isChanging}
        />
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          Ticket alterado com sucesso! Você será redirecionado para o login.
        </div>
      )}

      <button
        type="submit"
        disabled={isChanging || !tickets.currentTicket || !tickets.newTicket || !tickets.confirmTicket}
        className="btn btn-primary"
      >
        {isChanging ? 'Alterando...' : 'Alterar Ticket'}
      </button>
    </form>
  );
}
```

## 🔒 Validações de Segurança

### Validações de Ticket

1. **Comprimento mínimo**: 8 caracteres
2. **Complexidade**: Deve conter:
   - Pelo menos 1 letra minúscula
   - Pelo menos 1 letra maiúscula
   - Pelo menos 1 número
   - Pelo menos 1 caractere especial (@$!%*?&)
3. **Não pode ser igual ao ticket atual**
4. **Confirmação deve coincidir**

### Rate Limiting

- **3 tentativas por 5 minutos** por usuário
- Proteção contra ataques de força bruta
- Bloqueio temporário após tentativas excessivas

### Invalidação de Sessões

- **Todas as sessões ativas** são invalidadas após mudança
- **Tokens JWT** são marcados como inválidos
- **Usuário deve fazer login novamente**

## 🛠️ Configuração

### Variáveis de Ambiente

```env
# JWT Configuration
JWT_SECRET=sua_chave_secreta_jwt
JWT_EXPIRES_IN=7d

# Rate Limiting
THROTTLE_TTL=300000
THROTTLE_LIMIT=3
```

### Dependências Necessárias

```json
{
  "dependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/jwt": "^10.0.0",
    "@nestjs/throttler": "^5.0.0",
    "@igniter-js/core": "^0.3.0",
    "bcrypt": "^5.1.0",
    "class-validator": "^0.14.0",
    "rxjs": "^7.8.0"
  }
}
```

## 📊 Monitoramento

### Métricas Disponíveis

- Número de mudanças de ticket por período
- Tentativas falhadas de mudança
- Sessões invalidadas
- Conexões SSE ativas
- Performance dos endpoints

### Logs de Segurança

```typescript
// Exemplo de log gerado
{
  "timestamp": "2024-01-15T10:30:00Z",
  "level": "info",
  "message": "Ticket changed successfully",
  "userId": "user123",
  "userType": "corporate_user",
  "tenantId": "tenant123",
  "sessionId": "session456",
  "invalidatedSessions": 3,
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0..."
}
```

## 🧪 Testes

### Executar Testes

```bash
# Testes unitários
npm run test

# Testes e2e
npm run test:e2e

# Testes específicos de mudança de ticket
npm run test:e2e -- --testNamePattern="Ticket Change"
```

### Cenários de Teste

- ✅ Mudança de ticket com dados válidos
- ✅ Rejeição de ticket atual incorreto
- ✅ Rejeição de tickets que não coincidem
- ✅ Validação de complexidade de ticket
- ✅ Rate limiting
- ✅ Invalidação de sessões
- ✅ Notificações em tempo real
- ✅ Conexões SSE
- ✅ Eventos em tempo real

## 🚨 Considerações de Segurança

1. **Sempre validar ticket atual** antes de permitir mudança
2. **Usar HTTPS** em produção para proteger dados
3. **Implementar auditoria** de mudanças de ticket
4. **Monitorar tentativas suspeitas** de mudança
5. **Configurar alertas** para administradores
6. **Backup de configurações** de segurança
7. **Testar regularmente** a funcionalidade

## 📞 Suporte

Para dúvidas ou problemas:

1. Consulte os logs da aplicação
2. Verifique as métricas de monitoramento
3. Execute os testes automatizados
4. Consulte a documentação da API

---

**Implementação completa de mudança de ticket em tempo real com máxima segurança e experiência do usuário! 🎫✨**
