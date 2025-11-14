# 🎫 Guia de Notificações em Tempo Real por Fila

## 📋 Visão Geral

Sistema completo para **ouvir atualizações específicas de filas** usando **Igniter.js**, permitindo que usuários recebam notificações em tempo real sobre:

- **Ticket atual sendo chamado** em uma fila específica
- **Sua posição na fila** e tempo estimado de espera
- **Status da fila** (ativa, pausada, fechada)
- **Mudanças na ordem** de atendimento

## 🚀 Endpoints Disponíveis

### 1. Ouvir Ticket Atual da Fila

```http
GET /auth/realtime/queue/{queueId}/current-ticket
Authorization: Bearer <token>
Accept: text/event-stream
```

**Parâmetros:**
- `queueId`: ID da fila específica
- `includeQueueStatus` (opcional): Incluir status geral da fila

**Eventos Recebidos:**
```javascript
{
  "eventType": "queue-ticket-changed",
  "queueId": "queue123",
  "currentTicket": "A015",
  "ticketId": "ticket456",
  "callingNumber": "A015",
  "queueName": "Atendimento Geral",
  "timestamp": "2024-01-15T10:30:00Z",
  "position": 15,
  "estimatedWait": "25 min"
}
```

### 2. Ouvir Sua Posição na Fila

```http
GET /auth/realtime/queue/{queueId}/my-position
Authorization: Bearer <token>
Accept: text/event-stream
```

**Eventos Recebidos:**
```javascript
{
  "eventType": "position-changed",
  "queueId": "queue123",
  "userId": "user456",
  "currentPosition": 5,
  "estimatedWait": "12 min",
  "peopleAhead": 4,
  "ticketNumber": "A020",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## 💻 Implementação no Frontend

### JavaScript Puro

```javascript
class QueueListener {
  constructor(queueId, userToken) {
    this.queueId = queueId;
    this.token = userToken;
    this.currentTicketSource = null;
    this.positionSource = null;
  }

  // Ouvir ticket atual da fila
  listenToCurrentTicket() {
    this.currentTicketSource = new EventSource(
      `/auth/realtime/queue/${this.queueId}/current-ticket?includeQueueStatus=true`,
      {
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
      }
    );

    this.currentTicketSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.eventType === 'queue-ticket-changed') {
        this.onTicketCalled(data);
      }
    };

    this.currentTicketSource.onerror = (error) => {
      console.error('Erro na conexão SSE:', error);
      this.reconnectCurrentTicket();
    };
  }

  // Ouvir minha posição na fila
  listenToMyPosition() {
    this.positionSource = new EventSource(
      `/auth/realtime/queue/${this.queueId}/my-position`,
      {
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
      }
    );

    this.positionSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.eventType === 'position-changed') {
        this.onPositionChanged(data);
      }
    };
  }

  onTicketCalled(data) {
    // Atualizar display do ticket atual
    document.getElementById('current-ticket').textContent = data.currentTicket;
    document.getElementById('queue-name').textContent = data.queueName;
    
    // Mostrar notificação
    this.showNotification(`Chamando: ${data.currentTicket}`, 'info');
    
    // Tocar som se necessário
    this.playNotificationSound();
  }

  onPositionChanged(data) {
    // Atualizar posição do usuário
    document.getElementById('my-position').textContent = data.currentPosition;
    document.getElementById('estimated-wait').textContent = data.estimatedWait;
    document.getElementById('people-ahead').textContent = data.peopleAhead;
    
    // Notificação se posição mudou significativamente
    if (data.currentPosition <= 3) {
      this.showNotification('Você está próximo de ser chamado!', 'warning');
    }
  }

  showNotification(message, type) {
    // Implementar notificação visual
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 5000);
  }

  playNotificationSound() {
    // Tocar som de notificação
    const audio = new Audio('/sounds/notification.mp3');
    audio.play().catch(e => console.log('Não foi possível tocar o som:', e));
  }

  reconnectCurrentTicket() {
    setTimeout(() => {
      this.listenToCurrentTicket();
    }, 5000);
  }

  disconnect() {
    this.currentTicketSource?.close();
    this.positionSource?.close();
  }
}

// Uso
const queueListener = new QueueListener('queue123', userToken);

// Conectar aos streams
queueListener.listenToCurrentTicket();
queueListener.listenToMyPosition();

// Desconectar quando sair da página
window.addEventListener('beforeunload', () => {
  queueListener.disconnect();
});
```

### React Hook

```typescript
import { useState, useEffect, useCallback } from 'react';

interface QueueState {
  currentTicket: string | null;
  queueName: string | null;
  myPosition: number | null;
  estimatedWait: string | null;
  peopleAhead: number | null;
  isConnected: boolean;
}

export function useQueueListener(queueId: string, token: string) {
  const [queueState, setQueueState] = useState<QueueState>({
    currentTicket: null,
    queueName: null,
    myPosition: null,
    estimatedWait: null,
    peopleAhead: null,
    isConnected: false,
  });

  // Ouvir ticket atual
  useEffect(() => {
    if (!queueId || !token) return;

    const eventSource = new EventSource(
      `/auth/realtime/queue/${queueId}/current-ticket?includeQueueStatus=true`,
      {
        headers: { 'Authorization': `Bearer ${token}` },
      }
    );

    eventSource.onopen = () => {
      setQueueState(prev => ({ ...prev, isConnected: true }));
    };

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.eventType === 'queue-ticket-changed') {
        setQueueState(prev => ({
          ...prev,
          currentTicket: data.currentTicket,
          queueName: data.queueName,
        }));
      }
    };

    eventSource.onerror = () => {
      setQueueState(prev => ({ ...prev, isConnected: false }));
    };

    return () => eventSource.close();
  }, [queueId, token]);

  // Ouvir minha posição
  useEffect(() => {
    if (!queueId || !token) return;

    const positionSource = new EventSource(
      `/auth/realtime/queue/${queueId}/my-position`,
      {
        headers: { 'Authorization': `Bearer ${token}` },
      }
    );

    positionSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.eventType === 'position-changed') {
        setQueueState(prev => ({
          ...prev,
          myPosition: data.currentPosition,
          estimatedWait: data.estimatedWait,
          peopleAhead: data.peopleAhead,
        }));
      }
    };

    return () => positionSource.close();
  }, [queueId, token]);

  return queueState;
}
```

### Componente React

```tsx
import React from 'react';
import { useQueueListener } from './useQueueListener';

interface QueueDisplayProps {
  queueId: string;
  userToken: string;
}

export function QueueDisplay({ queueId, userToken }: QueueDisplayProps) {
  const queueState = useQueueListener(queueId, userToken);

  return (
    <div className="queue-display">
      {/* Status da conexão */}
      <div className={`connection-status ${queueState.isConnected ? 'connected' : 'disconnected'}`}>
        {queueState.isConnected ? '🟢 Conectado' : '🔴 Desconectado'}
      </div>

      {/* Ticket atual sendo chamado */}
      <div className="current-ticket-section">
        <h2>🎫 Chamando Agora</h2>
        <div className="current-ticket">
          {queueState.currentTicket || 'Aguardando...'}
        </div>
        <div className="queue-name">
          {queueState.queueName}
        </div>
      </div>

      {/* Minha posição */}
      <div className="my-position-section">
        <h3>📍 Sua Posição</h3>
        <div className="position-info">
          <div className="position-number">
            {queueState.myPosition ? `#${queueState.myPosition}` : 'N/A'}
          </div>
          <div className="wait-info">
            <p>Pessoas à frente: {queueState.peopleAhead || 0}</p>
            <p>Tempo estimado: {queueState.estimatedWait || 'Calculando...'}</p>
          </div>
        </div>
      </div>

      {/* Alertas visuais */}
      {queueState.myPosition && queueState.myPosition <= 3 && (
        <div className="alert alert-warning">
          ⚠️ Você está próximo de ser chamado!
        </div>
      )}
    </div>
  );
}
```

## 🔧 Integração com Backend

### No Controller de Filas

```typescript
// src/queues/queues.controller.ts
import { QueueNotificationsService } from './queue-notifications.service';

@Controller('queues')
export class QueuesController {
  constructor(
    private readonly queuesService: QueuesService,
    private readonly queueNotifications: QueueNotificationsService,
  ) {}

  @Post(':id/call-next')
  async callNextTicket(@Param('id') queueId: string) {
    const ticket = await this.queuesService.callNextTicket(queueId);
    
    // Notificar sobre o novo ticket chamado
    await this.queueNotifications.notifyTicketCalled(queueId, {
      ticketId: ticket.id,
      myCallingToken: ticket.myCallingToken,
      position: ticket.position,
      tenantId: ticket.tenantId,
    });

    return ticket;
  }

  @Post(':id/pause')
  async pauseQueue(@Param('id') queueId: string) {
    await this.queuesService.pauseQueue(queueId);
    
    // Notificar sobre mudança de status
    await this.queueNotifications.notifyQueueStatusChange(
      queueId, 
      'paused', 
      'Fila pausada temporariamente'
    );

    return { message: 'Fila pausada' };
  }
}
```

### No Service de Tickets

```typescript
// src/tickets/tickets.service.ts
import { QueueNotificationsService } from '../queues/queue-notifications.service';

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queueNotifications: QueueNotificationsService,
  ) {}

  async createTicket(createTicketDto: CreateTicketDto) {
    const ticket = await this.prisma.ticket.create({
      data: createTicketDto,
    });

    // Notificar sobre novo ticket criado
    await this.queueNotifications.onTicketCreated(ticket.id);

    return ticket;
  }

  async completeTicket(ticketId: string) {
    const ticket = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: { status: 'COMPLETED' },
    });

    // Notificar sobre ticket completado
    await this.queueNotifications.onTicketCompleted(ticketId);

    return ticket;
  }
}
```

## 📱 Exemplo de Página Completa

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fila Digital - Tempo Real</title>
    <style>
        .queue-container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            font-family: Arial, sans-serif;
        }
        
        .current-ticket {
            font-size: 3em;
            font-weight: bold;
            text-align: center;
            color: #007bff;
            margin: 20px 0;
        }
        
        .position-info {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        
        .alert {
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        
        .alert-warning {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
        }
        
        .connection-status.connected {
            color: green;
        }
        
        .connection-status.disconnected {
            color: red;
        }
    </style>
</head>
<body>
    <div class="queue-container">
        <div id="connection-status" class="connection-status">🔴 Desconectado</div>
        
        <h1>🎫 Fila Digital</h1>
        
        <div class="current-ticket-section">
            <h2>Chamando Agora:</h2>
            <div id="current-ticket" class="current-ticket">Aguardando...</div>
            <div id="queue-name">Carregando fila...</div>
        </div>
        
        <div class="position-info">
            <h3>📍 Sua Posição na Fila</h3>
            <p>Posição: <span id="my-position">-</span></p>
            <p>Pessoas à frente: <span id="people-ahead">-</span></p>
            <p>Tempo estimado: <span id="estimated-wait">-</span></p>
        </div>
        
        <div id="alerts"></div>
    </div>

    <script>
        // Configuração (obter do contexto da aplicação)
        const QUEUE_ID = 'queue123'; // ID da fila específica
        const USER_TOKEN = 'your-jwt-token'; // Token do usuário

        // Inicializar listener
        const queueListener = new QueueListener(QUEUE_ID, USER_TOKEN);
        queueListener.listenToCurrentTicket();
        queueListener.listenToMyPosition();

        // Implementação da classe QueueListener (código anterior)
        // ...
    </script>
</body>
</html>
```

## 🔧 Configuração no Backend

### Módulo de Filas

```typescript
// src/queues/queues.module.ts
import { QueueNotificationsService } from './queue-notifications.service';

@Module({
  imports: [IgniterModule],
  controllers: [QueuesController],
  providers: [
    QueuesService,
    QueueNotificationsService, // Adicionar o serviço
  ],
  exports: [QueuesService, QueueNotificationsService],
})
export class QueuesModule {}
```

## 📊 Benefícios da Implementação

1. **Experiência do Usuário Superior**
   - Atualizações instantâneas sem refresh
   - Notificações visuais e sonoras
   - Tempo de espera estimado preciso

2. **Performance Otimizada**
   - Polling inteligente (500ms para tickets, 2s para posições)
   - Cache eficiente via Igniter.js
   - Conexões leves via SSE

3. **Escalabilidade**
   - Suporte a múltiplas filas simultâneas
   - Gerenciamento automático de conexões
   - Limpeza automática de cache

4. **Flexibilidade**
   - Diferentes tipos de notificação por fila
   - Configuração por tenant
   - Suporte a diferentes tipos de usuário

---

**Sistema completo de notificações em tempo real por fila usando Igniter.js! 🎫✨**



