# 🎫 Integração Frontend - Notificações de Fila em Tempo Real

## 📋 Guia Completo para Desenvolvedores Frontend

Este guia ensina como **integrar o sistema de filas em tempo real** no frontend usando **Server-Sent Events (SSE)** com **Igniter.js**.

---

## 🚀 Endpoints Disponíveis

### 1. **Stream Geral de Tickets**
```http
GET /api/rt/tickets/stream
Authorization: Bearer <token>
Accept: text/event-stream
```

### 2. **Stream de Fila Específica**
```http
GET /api/rt/tickets/queue/{queueId}/stream
Authorization: Bearer <token>
Accept: text/event-stream
```

### 3. **Stream de Ticket Específico**
```http
GET /api/rt/tickets/{ticketId}/stream
Authorization: Bearer <token>
Accept: text/event-stream
```

### 4. **Buscar Ticket Específico**
```http
GET /api/rt/tickets/{ticketId}
Authorization: Bearer <token>
```

### 5. **Buscar Tickets de uma Fila**
```http
GET /api/rt/tickets/queue/{queueId}
Authorization: Bearer <token>
```

### 6. **Estatísticas do Sistema**
```http
GET /api/rt/tickets/stats
Authorization: Bearer <token>
```

---

## 💻 Implementação JavaScript Puro

### **Classe Base para Gerenciar Filas**

```javascript
class QueueRealTimeManager {
  constructor(baseUrl, authToken) {
    this.baseUrl = baseUrl;
    this.token = authToken;
    this.activeConnections = new Map();
    this.reconnectAttempts = new Map();
    this.maxReconnectAttempts = 5;
  }

  /**
   * Conecta a uma fila específica para ouvir o ticket atual
   */
  connectToQueue(queueId, options = {}) {
    const {
      onTicketCalled = () => {},
      onQueueStatusChange = () => {},
      onError = () => {},
      includeQueueStatus = true
    } = options;

    // Evitar múltiplas conexões à mesma fila
    if (this.activeConnections.has(`current-${queueId}`)) {
      console.warn(`Já conectado à fila ${queueId}`);
      return;
    }

    const url = `${this.baseUrl}/auth/realtime/queue/${queueId}/current-ticket?includeQueueStatus=${includeQueueStatus}`;
    
    const eventSource = new EventSource(url, {
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    });

    // Eventos recebidos
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.eventType) {
          case 'queue-ticket-changed':
            onTicketCalled(data);
            break;
          case 'queue-status-changed':
            onQueueStatusChange(data);
            break;
          case 'queue-heartbeat':
            console.log(`Heartbeat da fila ${queueId}:`, data.timestamp);
            break;
        }
      } catch (error) {
        console.error('Erro ao processar evento:', error);
      }
    };

    // Conexão estabelecida
    eventSource.onopen = () => {
      console.log(`✅ Conectado à fila ${queueId}`);
      this.reconnectAttempts.set(`current-${queueId}`, 0);
    };

    // Erro na conexão
    eventSource.onerror = (error) => {
      console.error(`❌ Erro na conexão da fila ${queueId}:`, error);
      onError(error);
      this.handleReconnection(`current-${queueId}`, () => this.connectToQueue(queueId, options));
    };

    this.activeConnections.set(`current-${queueId}`, eventSource);
  }

  /**
   * Conecta para ouvir a posição específica do usuário na fila
   */
  connectToMyPosition(queueId, options = {}) {
    const {
      onPositionChanged = () => {},
      onError = () => {}
    } = options;

    if (this.activeConnections.has(`position-${queueId}`)) {
      console.warn(`Já conectado à posição da fila ${queueId}`);
      return;
    }

    const url = `${this.baseUrl}/auth/realtime/queue/${queueId}/my-position`;
    
    const eventSource = new EventSource(url, {
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    });

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.eventType === 'position-changed') {
          onPositionChanged(data);
        }
      } catch (error) {
        console.error('Erro ao processar posição:', error);
      }
    };

    eventSource.onopen = () => {
      console.log(`✅ Conectado à posição da fila ${queueId}`);
      this.reconnectAttempts.set(`position-${queueId}`, 0);
    };

    eventSource.onerror = (error) => {
      console.error(`❌ Erro na posição da fila ${queueId}:`, error);
      onError(error);
      this.handleReconnection(`position-${queueId}`, () => this.connectToMyPosition(queueId, options));
    };

    this.activeConnections.set(`position-${queueId}`, eventSource);
  }

  /**
   * Gerencia reconexão automática
   */
  handleReconnection(connectionKey, reconnectFn) {
    const attempts = this.reconnectAttempts.get(connectionKey) || 0;
    
    if (attempts < this.maxReconnectAttempts) {
      const delay = Math.pow(2, attempts) * 1000; // Backoff exponencial
      
      setTimeout(() => {
        console.log(`🔄 Tentativa de reconexão ${attempts + 1}/${this.maxReconnectAttempts} para ${connectionKey}`);
        this.reconnectAttempts.set(connectionKey, attempts + 1);
        reconnectFn();
      }, delay);
    } else {
      console.error(`❌ Máximo de tentativas de reconexão atingido para ${connectionKey}`);
    }
  }

  /**
   * Desconecta de uma fila específica
   */
  disconnect(queueId) {
    const currentKey = `current-${queueId}`;
    const positionKey = `position-${queueId}`;

    [currentKey, positionKey].forEach(key => {
      const connection = this.activeConnections.get(key);
      if (connection) {
        connection.close();
        this.activeConnections.delete(key);
        this.reconnectAttempts.delete(key);
        console.log(`🔌 Desconectado de ${key}`);
      }
    });
  }

  /**
   * Desconecta de todas as filas
   */
  disconnectAll() {
    this.activeConnections.forEach((connection, key) => {
      connection.close();
      console.log(`🔌 Desconectado de ${key}`);
    });
    
    this.activeConnections.clear();
    this.reconnectAttempts.clear();
  }

  /**
   * Lista conexões ativas
   */
  getActiveConnections() {
    return Array.from(this.activeConnections.keys());
  }
}
```

### **Uso Básico**

```javascript
// Inicializar o gerenciador
const queueManager = new QueueRealTimeManager('https://api.filadigital.com', userToken);

// Conectar à fila de exames
queueManager.connectToQueue('queue-exames-123', {
  onTicketCalled: (data) => {
    // Ticket chamado na fila
    document.getElementById('current-ticket').textContent = data.currentTicket;
    document.getElementById('queue-name').textContent = data.queueName;
    
    // Notificação visual
    showNotification(`Chamando: ${data.currentTicket}`, 'info');
    
    // Som de notificação
    playNotificationSound();
  },
  
  onQueueStatusChange: (data) => {
    // Status da fila mudou
    const statusElement = document.getElementById('queue-status');
    statusElement.textContent = data.status;
    statusElement.className = `status ${data.status}`;
    
    if (data.status === 'paused') {
      showNotification('Fila pausada temporariamente', 'warning');
    }
  },
  
  onError: (error) => {
    console.error('Erro na conexão:', error);
    showNotification('Erro de conexão. Tentando reconectar...', 'error');
  }
});

// Conectar para ouvir minha posição
queueManager.connectToMyPosition('queue-exames-123', {
  onPositionChanged: (data) => {
    // Posição atualizada
    document.getElementById('my-position').textContent = data.currentPosition;
    document.getElementById('estimated-wait').textContent = data.estimatedWait;
    document.getElementById('people-ahead').textContent = data.peopleAhead;
    
    // Alerta se próximo de ser chamado
    if (data.currentPosition <= 3) {
      showNotification('⚠️ Você está próximo de ser chamado!', 'warning');
      document.body.classList.add('near-call');
    }
  }
});

// Funções auxiliares
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  // Auto-remover após 5 segundos
  setTimeout(() => {
    notification.remove();
  }, 5000);
}

function playNotificationSound() {
  const audio = new Audio('/assets/notification.mp3');
  audio.play().catch(e => console.log('Som não disponível:', e));
}

// Limpar conexões ao sair da página
window.addEventListener('beforeunload', () => {
  queueManager.disconnectAll();
});
```

---

## ⚛️ Implementação React

### **Hook Personalizado**

```typescript
import { useState, useEffect, useCallback, useRef } from 'react';

interface QueueState {
  // Ticket atual
  currentTicket: string | null;
  queueName: string | null;
  queueStatus: 'active' | 'paused' | 'closed' | null;
  
  // Minha posição
  myPosition: number | null;
  estimatedWait: string | null;
  peopleAhead: number | null;
  ticketNumber: string | null;
  
  // Estado da conexão
  isConnected: boolean;
  isNearCall: boolean;
}

interface UseQueueOptions {
  listenToCurrentTicket?: boolean;
  listenToMyPosition?: boolean;
  includeQueueStatus?: boolean;
}

export function useQueueRealTime(
  queueId: string, 
  token: string,
  options: UseQueueOptions = {}
) {
  const {
    listenToCurrentTicket = true,
    listenToMyPosition = true,
    includeQueueStatus = true
  } = options;

  const [queueState, setQueueState] = useState<QueueState>({
    currentTicket: null,
    queueName: null,
    queueStatus: null,
    myPosition: null,
    estimatedWait: null,
    peopleAhead: null,
    ticketNumber: null,
    isConnected: false,
    isNearCall: false,
  });

  const eventSourcesRef = useRef<Map<string, EventSource>>(new Map());

  // Conectar ao ticket atual
  useEffect(() => {
    if (!listenToCurrentTicket || !queueId || !token) return;

    const url = `/auth/realtime/queue/${queueId}/current-ticket?includeQueueStatus=${includeQueueStatus}`;
    const eventSource = new EventSource(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

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
      
      if (data.eventType === 'queue-status-changed') {
        setQueueState(prev => ({
          ...prev,
          queueStatus: data.status,
        }));
      }
    };

    eventSource.onerror = () => {
      setQueueState(prev => ({ ...prev, isConnected: false }));
    };

    eventSourcesRef.current.set('current', eventSource);

    return () => {
      eventSource.close();
      eventSourcesRef.current.delete('current');
    };
  }, [queueId, token, listenToCurrentTicket, includeQueueStatus]);

  // Conectar à minha posição
  useEffect(() => {
    if (!listenToMyPosition || !queueId || !token) return;

    const url = `/auth/realtime/queue/${queueId}/my-position`;
    const eventSource = new EventSource(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.eventType === 'position-changed') {
        setQueueState(prev => ({
          ...prev,
          myPosition: data.currentPosition,
          estimatedWait: data.estimatedWait,
          peopleAhead: data.peopleAhead,
          ticketNumber: data.ticketNumber,
          isNearCall: data.currentPosition <= 3,
        }));
      }
    };

    eventSourcesRef.current.set('position', eventSource);

    return () => {
      eventSource.close();
      eventSourcesRef.current.delete('position');
    };
  }, [queueId, token, listenToMyPosition]);

  // Função para desconectar manualmente
  const disconnect = useCallback(() => {
    eventSourcesRef.current.forEach(eventSource => {
      eventSource.close();
    });
    eventSourcesRef.current.clear();
    
    setQueueState({
      currentTicket: null,
      queueName: null,
      queueStatus: null,
      myPosition: null,
      estimatedWait: null,
      peopleAhead: null,
      ticketNumber: null,
      isConnected: false,
      isNearCall: false,
    });
  }, []);

  return { queueState, disconnect };
}
```

### **Componente de Fila**

```tsx
import React, { useEffect } from 'react';
import { useQueueRealTime } from './hooks/useQueueRealTime';

interface QueueDisplayProps {
  queueId: string;
  userToken: string;
  onTicketCalled?: (ticket: string) => void;
  onNearCall?: () => void;
}

export function QueueDisplay({ queueId, userToken, onTicketCalled, onNearCall }: QueueDisplayProps) {
  const { queueState, disconnect } = useQueueRealTime(queueId, userToken);

  // Notificações quando ticket é chamado
  useEffect(() => {
    if (queueState.currentTicket && onTicketCalled) {
      onTicketCalled(queueState.currentTicket);
    }
  }, [queueState.currentTicket, onTicketCalled]);

  // Alerta quando próximo de ser chamado
  useEffect(() => {
    if (queueState.isNearCall && onNearCall) {
      onNearCall();
    }
  }, [queueState.isNearCall, onNearCall]);

  return (
    <div className="queue-display">
      {/* Status da conexão */}
      <div className={`connection-indicator ${queueState.isConnected ? 'connected' : 'disconnected'}`}>
        {queueState.isConnected ? '🟢 Conectado' : '🔴 Desconectado'}
      </div>

      {/* Informações da fila */}
      <div className="queue-info">
        <h2>{queueState.queueName || 'Carregando...'}</h2>
        
        {queueState.queueStatus && (
          <div className={`queue-status ${queueState.queueStatus}`}>
            Status: {queueState.queueStatus}
          </div>
        )}
      </div>

      {/* Ticket atual sendo chamado */}
      <div className="current-ticket-section">
        <h3>🎫 Chamando Agora</h3>
        <div className="current-ticket">
          {queueState.currentTicket || 'Aguardando...'}
        </div>
      </div>

      {/* Minha posição na fila */}
      {queueState.myPosition && (
        <div className={`my-position-section ${queueState.isNearCall ? 'near-call' : ''}`}>
          <h3>📍 Sua Posição</h3>
          
          <div className="position-info">
            <div className="position-number">#{queueState.myPosition}</div>
            <div className="wait-details">
              <p>Pessoas à frente: {queueState.peopleAhead}</p>
              <p>Tempo estimado: {queueState.estimatedWait}</p>
              <p>Seu ticket: {queueState.ticketNumber}</p>
            </div>
          </div>

          {queueState.isNearCall && (
            <div className="near-call-alert">
              ⚠️ Você está próximo de ser chamado!
            </div>
          )}
        </div>
      )}

      {/* Botão de desconectar */}
      <button onClick={disconnect} className="disconnect-btn">
        Desconectar
      </button>
    </div>
  );
}
```

### **Componente de Múltiplas Filas**

```tsx
import React, { useState } from 'react';
import { QueueDisplay } from './QueueDisplay';

interface Queue {
  id: string;
  name: string;
  type: string;
}

interface MultiQueueManagerProps {
  userToken: string;
  availableQueues: Queue[];
}

export function MultiQueueManager({ userToken, availableQueues }: MultiQueueManagerProps) {
  const [activeQueues, setActiveQueues] = useState<string[]>([]);
  const [notifications, setNotifications] = useState<string[]>([]);

  const addQueue = (queueId: string) => {
    if (!activeQueues.includes(queueId)) {
      setActiveQueues([...activeQueues, queueId]);
    }
  };

  const removeQueue = (queueId: string) => {
    setActiveQueues(activeQueues.filter(id => id !== queueId));
  };

  const handleTicketCalled = (queueId: string, ticket: string) => {
    const queue = availableQueues.find(q => q.id === queueId);
    const message = `Fila ${queue?.name}: Chamando ${ticket}`;
    
    setNotifications(prev => [message, ...prev.slice(0, 4)]); // Manter apenas 5 notificações
    
    // Notificação do browser
    if (Notification.permission === 'granted') {
      new Notification('Ticket Chamado', {
        body: message,
        icon: '/favicon.ico'
      });
    }
  };

  const handleNearCall = (queueId: string) => {
    const queue = availableQueues.find(q => q.id === queueId);
    
    if (Notification.permission === 'granted') {
      new Notification('Próximo de ser chamado!', {
        body: `Fila ${queue?.name}: Você está próximo!`,
        icon: '/favicon.ico'
      });
    }
  };

  return (
    <div className="multi-queue-manager">
      {/* Seletor de filas */}
      <div className="queue-selector">
        <h3>Selecionar Filas</h3>
        {availableQueues.map(queue => (
          <label key={queue.id} className="queue-option">
            <input
              type="checkbox"
              checked={activeQueues.includes(queue.id)}
              onChange={(e) => {
                if (e.target.checked) {
                  addQueue(queue.id);
                } else {
                  removeQueue(queue.id);
                }
              }}
            />
            {queue.name} ({queue.type})
          </label>
        ))}
      </div>

      {/* Notificações recentes */}
      {notifications.length > 0 && (
        <div className="recent-notifications">
          <h4>Notificações Recentes</h4>
          {notifications.map((notification, index) => (
            <div key={index} className="notification-item">
              {notification}
            </div>
          ))}
        </div>
      )}

      {/* Displays das filas ativas */}
      <div className="active-queues">
        {activeQueues.map(queueId => (
          <QueueDisplay
            key={queueId}
            queueId={queueId}
            userToken={userToken}
            onTicketCalled={(ticket) => handleTicketCalled(queueId, ticket)}
            onNearCall={() => handleNearCall(queueId)}
          />
        ))}
      </div>
    </div>
  );
}
```

---

## 🎨 CSS Sugerido

```css
/* Estilos base */
.queue-display {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 20px;
  margin: 10px;
  background: white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

/* Indicador de conexão */
.connection-indicator {
  position: absolute;
  top: 10px;
  right: 10px;
  font-size: 12px;
  font-weight: bold;
}

.connection-indicator.connected {
  color: #28a745;
}

.connection-indicator.disconnected {
  color: #dc3545;
}

/* Ticket atual */
.current-ticket {
  font-size: 3em;
  font-weight: bold;
  text-align: center;
  color: #007bff;
  margin: 20px 0;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
}

/* Posição do usuário */
.my-position-section {
  background: #e9ecef;
  padding: 15px;
  border-radius: 8px;
  margin: 15px 0;
  transition: all 0.3s ease;
}

.my-position-section.near-call {
  background: #fff3cd;
  border: 2px solid #ffc107;
  animation: pulse 2s infinite;
}

.position-number {
  font-size: 2em;
  font-weight: bold;
  color: #495057;
  text-align: center;
}

.wait-details p {
  margin: 5px 0;
  font-size: 14px;
}

/* Alerta de proximidade */
.near-call-alert {
  background: #f8d7da;
  color: #721c24;
  padding: 10px;
  border-radius: 4px;
  text-align: center;
  font-weight: bold;
  margin-top: 10px;
}

/* Status da fila */
.queue-status.active {
  color: #28a745;
}

.queue-status.paused {
  color: #ffc107;
}

.queue-status.closed {
  color: #dc3545;
}

/* Notificações */
.notification {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 15px;
  border-radius: 4px;
  color: white;
  font-weight: bold;
  z-index: 9999;
  animation: slideIn 0.3s ease;
}

.notification.info {
  background: #17a2b8;
}

.notification.warning {
  background: #ffc107;
  color: #212529;
}

.notification.error {
  background: #dc3545;
}

/* Animações */
@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.02); }
  100% { transform: scale(1); }
}

@keyframes slideIn {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

/* Responsivo */
@media (max-width: 768px) {
  .current-ticket {
    font-size: 2em;
    padding: 15px;
  }
  
  .queue-display {
    margin: 5px;
    padding: 15px;
  }
}
```

---

## 🔔 Permissões e Notificações

### **Solicitar Permissão para Notificações**

```javascript
// Solicitar permissão ao carregar a página
async function requestNotificationPermission() {
  if ('Notification' in window) {
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      console.log('✅ Permissão para notificações concedida');
    } else {
      console.log('❌ Permissão para notificações negada');
    }
  }
}

// Chamar ao inicializar a aplicação
requestNotificationPermission();
```

### **Service Worker para Notificações em Background**

```javascript
// sw.js - Service Worker
self.addEventListener('message', event => {
  if (event.data.type === 'QUEUE_NOTIFICATION') {
    const { title, body, icon } = event.data.payload;
    
    self.registration.showNotification(title, {
      body,
      icon,
      badge: '/badge-icon.png',
      vibrate: [200, 100, 200],
      actions: [
        {
          action: 'view',
          title: 'Ver Fila'
        }
      ]
    });
  }
});
```

---

## 🚨 Tratamento de Erros

### **Estratégias de Reconexão**

```javascript
class RobustQueueConnection {
  constructor(queueId, token) {
    this.queueId = queueId;
    this.token = token;
    this.reconnectAttempts = 0;
    this.maxAttempts = 5;
    this.isIntentionallyClosed = false;
  }

  connect() {
    const url = `/auth/realtime/queue/${this.queueId}/current-ticket`;
    this.eventSource = new EventSource(url, {
      headers: { 'Authorization': `Bearer ${this.token}` }
    });

    this.eventSource.onerror = (error) => {
      if (!this.isIntentionallyClosed) {
        this.handleReconnection();
      }
    };

    this.eventSource.onopen = () => {
      this.reconnectAttempts = 0; // Reset contador
      console.log(`✅ Reconectado à fila ${this.queueId}`);
    };
  }

  handleReconnection() {
    if (this.reconnectAttempts < this.maxAttempts) {
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      
      setTimeout(() => {
        this.reconnectAttempts++;
        console.log(`🔄 Tentativa ${this.reconnectAttempts}/${this.maxAttempts} - Fila ${this.queueId}`);
        this.connect();
      }, delay);
    } else {
      console.error(`❌ Falha definitiva na conexão da fila ${this.queueId}`);
      this.showPermanentError();
    }
  }

  showPermanentError() {
    // Mostrar mensagem de erro permanente ao usuário
    const errorDiv = document.createElement('div');
    errorDiv.className = 'connection-error';
    errorDiv.innerHTML = `
      <p>❌ Erro de conexão com a fila ${this.queueId}</p>
      <button onclick="location.reload()">Recarregar Página</button>
    `;
    document.body.appendChild(errorDiv);
  }

  disconnect() {
    this.isIntentionallyClosed = true;
    if (this.eventSource) {
      this.eventSource.close();
    }
  }
}
```

---

## 📱 Exemplo de Aplicação Completa

### **HTML Básico**

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fila Digital - Tempo Real</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div id="app">
        <header>
            <h1>🎫 Sistema de Filas</h1>
            <div id="connection-status">Conectando...</div>
        </header>

        <main>
            <!-- Seletor de fila -->
            <section class="queue-selector">
                <label for="queue-select">Selecionar Fila:</label>
                <select id="queue-select">
                    <option value="">Escolha uma fila...</option>
                    <option value="queue-exames-123">Exames Médicos</option>
                    <option value="queue-consultas-456">Consultas</option>
                    <option value="queue-procedimentos-789">Procedimentos</option>
                </select>
            </section>

            <!-- Display da fila -->
            <section id="queue-display" class="queue-display" style="display: none;">
                <div class="current-ticket-section">
                    <h2>Chamando Agora:</h2>
                    <div id="current-ticket" class="current-ticket">-</div>
                    <div id="queue-name" class="queue-name">-</div>
                </div>

                <div class="my-position-section">
                    <h3>📍 Sua Posição</h3>
                    <div class="position-info">
                        <div id="my-position" class="position-number">-</div>
                        <div class="wait-details">
                            <p>Pessoas à frente: <span id="people-ahead">-</span></p>
                            <p>Tempo estimado: <span id="estimated-wait">-</span></p>
                            <p>Seu ticket: <span id="ticket-number">-</span></p>
                        </div>
                    </div>
                </div>

                <button id="disconnect-btn" class="disconnect-btn">Desconectar</button>
            </section>
        </main>
    </div>

    <!-- Área de notificações -->
    <div id="notifications-area"></div>

    <script src="app.js"></script>
</body>
</html>
```

### **JavaScript Principal**

```javascript
// app.js
class QueueApp {
  constructor() {
    this.queueManager = null;
    this.currentQueueId = null;
    this.userToken = this.getUserToken(); // Implementar obtenção do token
    
    this.initializeApp();
  }

  initializeApp() {
    // Solicitar permissões
    this.requestNotificationPermission();
    
    // Event listeners
    document.getElementById('queue-select').addEventListener('change', (e) => {
      this.selectQueue(e.target.value);
    });
    
    document.getElementById('disconnect-btn').addEventListener('click', () => {
      this.disconnectFromQueue();
    });

    // Inicializar gerenciador
    this.queueManager = new QueueRealTimeManager('https://api.filadigital.com', this.userToken);
  }

  selectQueue(queueId) {
    if (!queueId) return;

    // Desconectar da fila anterior
    if (this.currentQueueId) {
      this.queueManager.disconnect(this.currentQueueId);
    }

    this.currentQueueId = queueId;
    
    // Mostrar interface
    document.getElementById('queue-display').style.display = 'block';
    
    // Conectar à nova fila
    this.connectToQueue(queueId);
  }

  connectToQueue(queueId) {
    // Conectar ao ticket atual
    this.queueManager.connectToQueue(queueId, {
      onTicketCalled: (data) => {
        document.getElementById('current-ticket').textContent = data.currentTicket;
        document.getElementById('queue-name').textContent = data.queueName;
        
        this.showNotification(`Chamando: ${data.currentTicket}`, 'info');
        this.playNotificationSound();
      },
      
      onQueueStatusChange: (data) => {
        this.updateQueueStatus(data.status);
      },
      
      onError: () => {
        this.updateConnectionStatus(false);
      }
    });

    // Conectar à minha posição
    this.queueManager.connectToMyPosition(queueId, {
      onPositionChanged: (data) => {
        document.getElementById('my-position').textContent = data.currentPosition;
        document.getElementById('estimated-wait').textContent = data.estimatedWait;
        document.getElementById('people-ahead').textContent = data.peopleAhead;
        document.getElementById('ticket-number').textContent = data.ticketNumber;
        
        // Alerta se próximo
        if (data.currentPosition <= 3) {
          this.showNearCallAlert();
        }
      }
    });

    this.updateConnectionStatus(true);
  }

  disconnectFromQueue() {
    if (this.currentQueueId) {
      this.queueManager.disconnect(this.currentQueueId);
      this.currentQueueId = null;
    }
    
    document.getElementById('queue-display').style.display = 'none';
    document.getElementById('queue-select').value = '';
    this.updateConnectionStatus(false);
  }

  updateConnectionStatus(connected) {
    const statusEl = document.getElementById('connection-status');
    statusEl.textContent = connected ? '🟢 Conectado' : '🔴 Desconectado';
    statusEl.className = connected ? 'connected' : 'disconnected';
  }

  updateQueueStatus(status) {
    const messages = {
      'active': 'Fila ativa',
      'paused': 'Fila pausada',
      'closed': 'Fila fechada'
    };
    
    this.showNotification(messages[status] || 'Status atualizado', 'info');
  }

  showNearCallAlert() {
    this.showNotification('⚠️ Você está próximo de ser chamado!', 'warning');
    document.body.classList.add('near-call');
    
    // Vibrar se disponível
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.getElementById('notifications-area').appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 5000);

    // Notificação do browser
    if (Notification.permission === 'granted') {
      new Notification('Fila Digital', {
        body: message,
        icon: '/favicon.ico'
      });
    }
  }

  playNotificationSound() {
    const audio = new Audio('/assets/notification.mp3');
    audio.play().catch(() => {}); // Ignorar erros de autoplay
  }

  async requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }

  getUserToken() {
    // Implementar obtenção do token (localStorage, cookie, etc.)
    return localStorage.getItem('authToken') || '';
  }
}

// Inicializar aplicação
document.addEventListener('DOMContentLoaded', () => {
  new QueueApp();
});
```

---

## 🎯 **Resumo para o Frontend**

1. **Use Server-Sent Events (SSE)** - Não WebSocket
2. **Conecte-se a filas específicas** - Cada fila tem seu próprio endpoint
3. **Gerencie reconexões automáticas** - Implementar backoff exponencial
4. **Trate diferentes tipos de eventos** - Ticket chamado, posição, status
5. **Implemente notificações visuais e sonoras** - Melhor UX
6. **Solicite permissões de notificação** - Para alerts em background
7. **Mantenha o estado da conexão** - Indicadores visuais
8. **Limpe conexões ao sair** - Evitar vazamentos de memória

**Sistema completo de integração frontend com notificações em tempo real por fila específica! 🎫✨**



