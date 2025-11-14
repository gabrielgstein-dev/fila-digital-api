# Frontend Next.js - Monitoramento de Tickets em Tempo Real

## 🎯 **Visão Geral**

Este guia mostra como implementar no frontend Next.js para monitorar mudanças de tickets usando o sistema Igniter otimizado com PostgreSQL NOTIFY.

## 🔧 **Implementação**

### **1. Hook Personalizado para Monitoramento de Tickets**

```typescript
// hooks/useTicketMonitoring.ts
import { useState, useEffect, useCallback, useRef } from 'react';

interface TicketNotification {
  id: string;
  action: 'created' | 'updated' | 'deleted' | 'status_changed' | 'called';
  queueId: string;
  timestamp: string;
}

interface TicketData {
  id: string;
  priority: number;
  status: string;
  clientName?: string;
  clientPhone?: string;
  myCallingToken: string;
  queueId: string;
  createdAt: string;
  updatedAt: string;
}

interface UseTicketMonitoringOptions {
  queueId?: string;
  ticketId?: string;
  onTicketChange?: (notification: TicketNotification) => void;
  onError?: (error: Error) => void;
  autoReconnect?: boolean;
  reconnectInterval?: number;
}

export function useTicketMonitoring(options: UseTicketMonitoringOptions = {}) {
  const {
    queueId,
    ticketId,
    onTicketChange,
    onError,
    autoReconnect = true,
    reconnectInterval = 5000,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastNotification, setLastNotification] = useState<TicketNotification | null>(null);
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [currentTicket, setCurrentTicket] = useState<TicketData | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Função para construir a URL do stream
  const buildStreamUrl = useCallback(() => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    
    if (ticketId) {
      return `${baseUrl}/api/rt/tickets/${ticketId}/stream`;
    } else if (queueId) {
      return `${baseUrl}/api/rt/tickets/stream?queueId=${queueId}`;
    } else {
      return `${baseUrl}/api/rt/tickets/stream`;
    }
  }, [queueId, ticketId]);

  // Função para conectar ao stream
  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setIsConnecting(true);
    setError(null);

    try {
      const url = buildStreamUrl();
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('🔌 Conectado ao stream de tickets');
        setIsConnected(true);
        setIsConnecting(false);
        setError(null);
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.event === 'ticket_notification' || data.event === 'queue_ticket_notification') {
            const notification: TicketNotification = {
              id: data.data.id,
              action: data.data.action,
              queueId: data.data.queueId,
              timestamp: data.data.timestamp,
            };

            setLastNotification(notification);
            onTicketChange?.(notification);
          } else if (data.event === 'connection_established') {
            console.log('✅ Conexão estabelecida:', data.data.message);
          } else if (data.event === 'heartbeat') {
            // Heartbeat para manter conexão viva
            console.log('💓 Heartbeat recebido');
          }
        } catch (parseError) {
          console.error('❌ Erro ao processar mensagem:', parseError);
        }
      };

      eventSource.onerror = (error) => {
        console.error('❌ Erro no EventSource:', error);
        setIsConnected(false);
        setIsConnecting(false);
        
        const errorObj = new Error('Erro na conexão com o stream de tickets');
        setError(errorObj);
        onError?.(errorObj);

        // Reconexão automática
        if (autoReconnect && isMountedRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current) {
              console.log('🔄 Tentando reconectar...');
              connect();
            }
          }, reconnectInterval);
        }
      };

    } catch (error) {
      console.error('❌ Erro ao criar EventSource:', error);
      const errorObj = error instanceof Error ? error : new Error('Erro desconhecido');
      setError(errorObj);
      onError?.(errorObj);
      setIsConnecting(false);
    }
  }, [buildStreamUrl, onTicketChange, onError, autoReconnect, reconnectInterval]);

  // Função para desconectar
  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    setIsConnected(false);
    setIsConnecting(false);
  }, []);

  // Função para buscar tickets atuais
  const fetchTickets = useCallback(async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      let url: string;

      if (ticketId) {
        url = `${baseUrl}/api/rt/tickets/${ticketId}`;
      } else if (queueId) {
        url = `${baseUrl}/api/rt/tickets/queue/${queueId}`;
      } else {
        url = `${baseUrl}/api/rt/tickets/stats`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const data = await response.json();
      
      if (ticketId) {
        setCurrentTicket(data);
      } else if (queueId) {
        setTickets(data);
      } else {
        // Stats gerais
        console.log('📊 Estatísticas:', data);
      }
    } catch (error) {
      console.error('❌ Erro ao buscar tickets:', error);
      const errorObj = error instanceof Error ? error : new Error('Erro ao buscar tickets');
      setError(errorObj);
      onError?.(errorObj);
    }
  }, [queueId, ticketId, onError]);

  // Efeito para conectar/desconectar
  useEffect(() => {
    isMountedRef.current = true;
    connect();

    return () => {
      isMountedRef.current = false;
      disconnect();
    };
  }, [connect, disconnect]);

  // Efeito para buscar tickets iniciais
  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  return {
    isConnected,
    isConnecting,
    error,
    lastNotification,
    tickets,
    currentTicket,
    connect,
    disconnect,
    fetchTickets,
  };
}
```

### **2. Componente de Monitoramento de Fila**

```typescript
// components/QueueMonitor.tsx
'use client';

import { useTicketMonitoring } from '@/hooks/useTicketMonitoring';
import { useState, useEffect } from 'react';

interface QueueMonitorProps {
  queueId: string;
  onTicketChange?: (notification: any) => void;
}

export default function QueueMonitor({ queueId, onTicketChange }: QueueMonitorProps) {
  const [ticketCount, setTicketCount] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const {
    isConnected,
    isConnecting,
    error,
    lastNotification,
    tickets,
    fetchTickets,
  } = useTicketMonitoring({
    queueId,
    onTicketChange: (notification) => {
      console.log('🎫 Mudança de ticket detectada:', notification);
      setLastUpdate(new Date());
      onTicketChange?.(notification);
      
      // Atualizar contador de tickets
      if (notification.action === 'created') {
        setTicketCount(prev => prev + 1);
      } else if (notification.action === 'deleted') {
        setTicketCount(prev => Math.max(0, prev - 1));
      }
    },
    onError: (error) => {
      console.error('❌ Erro no monitoramento:', error);
    },
  });

  useEffect(() => {
    if (tickets.length > 0) {
      setTicketCount(tickets.length);
    }
  }, [tickets]);

  return (
    <div className="queue-monitor">
      <div className="status-bar">
        <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
          {isConnecting ? '🔄 Conectando...' : isConnected ? '🟢 Conectado' : '🔴 Desconectado'}
        </div>
        <div className="ticket-count">
          🎫 {ticketCount} tickets
        </div>
        {lastUpdate && (
          <div className="last-update">
            Última atualização: {lastUpdate.toLocaleTimeString()}
          </div>
        )}
      </div>

      {error && (
        <div className="error-message">
          ❌ Erro: {error.message}
        </div>
      )}

      {lastNotification && (
        <div className="notification">
          <h4>Última Notificação:</h4>
          <p>
            Ticket {lastNotification.id} - {lastNotification.action} às {new Date(lastNotification.timestamp).toLocaleTimeString()}
          </p>
        </div>
      )}

      <div className="tickets-list">
        <h3>Tickets na Fila:</h3>
        {tickets.map((ticket) => (
          <div key={ticket.id} className="ticket-item">
            <div className="ticket-info">
              <span className="ticket-id">#{ticket.myCallingToken}</span>
              <span className={`ticket-status ${ticket.status.toLowerCase()}`}>
                {ticket.status}
              </span>
            </div>
            <div className="ticket-details">
              {ticket.clientName && <span>Cliente: {ticket.clientName}</span>}
              {ticket.clientPhone && <span>Telefone: {ticket.clientPhone}</span>}
            </div>
          </div>
        ))}
      </div>

      <button onClick={fetchTickets} disabled={isConnecting}>
        {isConnecting ? 'Atualizando...' : 'Atualizar Tickets'}
      </button>
    </div>
  );
}
```

### **3. Componente de Monitoramento de Ticket Específico**

```typescript
// components/TicketMonitor.tsx
'use client';

import { useTicketMonitoring } from '@/hooks/useTicketMonitoring';
import { useState, useEffect } from 'react';

interface TicketMonitorProps {
  ticketId: string;
  onTicketChange?: (notification: any) => void;
}

export default function TicketMonitor({ ticketId, onTicketChange }: TicketMonitorProps) {
  const [ticketHistory, setTicketHistory] = useState<any[]>([]);

  const {
    isConnected,
    isConnecting,
    error,
    lastNotification,
    currentTicket,
    fetchTickets,
  } = useTicketMonitoring({
    ticketId,
    onTicketChange: (notification) => {
      console.log('🎫 Mudança no ticket detectada:', notification);
      
      // Adicionar à história
      setTicketHistory(prev => [
        ...prev,
        {
          ...notification,
          receivedAt: new Date().toISOString(),
        }
      ]);
      
      onTicketChange?.(notification);
    },
    onError: (error) => {
      console.error('❌ Erro no monitoramento do ticket:', error);
    },
  });

  return (
    <div className="ticket-monitor">
      <div className="status-bar">
        <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
          {isConnecting ? '🔄 Conectando...' : isConnected ? '🟢 Conectado' : '🔴 Desconectado'}
        </div>
        <div className="ticket-id">
          Ticket: {ticketId}
        </div>
      </div>

      {error && (
        <div className="error-message">
          ❌ Erro: {error.message}
        </div>
      )}

      {currentTicket && (
        <div className="current-ticket">
          <h3>Ticket Atual:</h3>
          <div className="ticket-details">
            <p><strong>ID:</strong> {currentTicket.id}</p>
            <p><strong>Token:</strong> {currentTicket.myCallingToken}</p>
            <p><strong>Status:</strong> {currentTicket.status}</p>
            <p><strong>Prioridade:</strong> {currentTicket.priority}</p>
            {currentTicket.clientName && (
              <p><strong>Cliente:</strong> {currentTicket.clientName}</p>
            )}
            {currentTicket.clientPhone && (
              <p><strong>Telefone:</strong> {currentTicket.clientPhone}</p>
            )}
            <p><strong>Criado em:</strong> {new Date(currentTicket.createdAt).toLocaleString()}</p>
            <p><strong>Atualizado em:</strong> {new Date(currentTicket.updatedAt).toLocaleString()}</p>
          </div>
        </div>
      )}

      {lastNotification && (
        <div className="last-notification">
          <h4>Última Mudança:</h4>
          <p>
            Ação: {lastNotification.action} às {new Date(lastNotification.timestamp).toLocaleString()}
          </p>
        </div>
      )}

      {ticketHistory.length > 0 && (
        <div className="ticket-history">
          <h4>Histórico de Mudanças:</h4>
          <div className="history-list">
            {ticketHistory.map((change, index) => (
              <div key={index} className="history-item">
                <span className="action">{change.action}</span>
                <span className="timestamp">
                  {new Date(change.receivedAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button onClick={fetchTickets} disabled={isConnecting}>
        {isConnecting ? 'Atualizando...' : 'Atualizar Ticket'}
      </button>
    </div>
  );
}
```

### **4. Página de Exemplo de Uso**

```typescript
// pages/dashboard.tsx
'use client';

import { useState } from 'react';
import QueueMonitor from '@/components/QueueMonitor';
import TicketMonitor from '@/components/TicketMonitor';

export default function Dashboard() {
  const [selectedQueue, setSelectedQueue] = useState<string>('');
  const [selectedTicket, setSelectedTicket] = useState<string>('');
  const [notifications, setNotifications] = useState<any[]>([]);

  const handleTicketChange = (notification: any) => {
    setNotifications(prev => [...prev, notification]);
    
    // Mostrar notificação para o usuário
    if (notification.action === 'called') {
      alert(`🎉 Seu ticket foi chamado!`);
    } else if (notification.action === 'status_changed') {
      alert(`📝 Status do ticket alterado`);
    }
  };

  return (
    <div className="dashboard">
      <h1>Dashboard de Tickets</h1>
      
      <div className="controls">
        <div className="queue-selector">
          <label>Monitorar Fila:</label>
          <input
            type="text"
            placeholder="ID da fila"
            value={selectedQueue}
            onChange={(e) => setSelectedQueue(e.target.value)}
          />
          <button onClick={() => setSelectedQueue('')}>
            Limpar
          </button>
        </div>

        <div className="ticket-selector">
          <label>Monitorar Ticket:</label>
          <input
            type="text"
            placeholder="ID do ticket"
            value={selectedTicket}
            onChange={(e) => setSelectedTicket(e.target.value)}
          />
          <button onClick={() => setSelectedTicket('')}>
            Limpar
          </button>
        </div>
      </div>

      <div className="monitors">
        {selectedQueue && (
          <div className="queue-monitor-section">
            <h2>Monitor de Fila: {selectedQueue}</h2>
            <QueueMonitor
              queueId={selectedQueue}
              onTicketChange={handleTicketChange}
            />
          </div>
        )}

        {selectedTicket && (
          <div className="ticket-monitor-section">
            <h2>Monitor de Ticket: {selectedTicket}</h2>
            <TicketMonitor
              ticketId={selectedTicket}
              onTicketChange={handleTicketChange}
            />
          </div>
        )}
      </div>

      {notifications.length > 0 && (
        <div className="notifications-log">
          <h3>Log de Notificações:</h3>
          <div className="notifications-list">
            {notifications.map((notification, index) => (
              <div key={index} className="notification-item">
                <span className="action">{notification.action}</span>
                <span className="ticket-id">{notification.id}</span>
                <span className="timestamp">
                  {new Date(notification.timestamp).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

### **5. Estilos CSS**

```css
/* styles/ticket-monitoring.css */
.queue-monitor, .ticket-monitor {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 20px;
  margin: 20px 0;
  background: #f9f9f9;
}

.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding: 10px;
  background: #fff;
  border-radius: 4px;
}

.status-indicator {
  padding: 5px 10px;
  border-radius: 4px;
  font-weight: bold;
}

.status-indicator.connected {
  background: #d4edda;
  color: #155724;
}

.status-indicator.disconnected {
  background: #f8d7da;
  color: #721c24;
}

.ticket-item {
  border: 1px solid #eee;
  border-radius: 4px;
  padding: 10px;
  margin: 5px 0;
  background: #fff;
}

.ticket-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
}

.ticket-status {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
}

.ticket-status.waiting {
  background: #fff3cd;
  color: #856404;
}

.ticket-status.called {
  background: #d1ecf1;
  color: #0c5460;
}

.ticket-status.completed {
  background: #d4edda;
  color: #155724;
}

.error-message {
  background: #f8d7da;
  color: #721c24;
  padding: 10px;
  border-radius: 4px;
  margin: 10px 0;
}

.notification {
  background: #d1ecf1;
  color: #0c5460;
  padding: 10px;
  border-radius: 4px;
  margin: 10px 0;
}

.controls {
  display: flex;
  gap: 20px;
  margin: 20px 0;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
}

.queue-selector, .ticket-selector {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.queue-selector input, .ticket-selector input {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.queue-selector button, .ticket-selector button {
  padding: 8px 16px;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.queue-selector button:hover, .ticket-selector button:hover {
  background: #c82333;
}

.monitors {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.notifications-log {
  margin-top: 30px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
}

.notifications-list {
  max-height: 300px;
  overflow-y: auto;
}

.notification-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  margin: 5px 0;
  background: #fff;
  border-radius: 4px;
  border-left: 4px solid #007bff;
}

@media (max-width: 768px) {
  .monitors {
    grid-template-columns: 1fr;
  }
  
  .controls {
    flex-direction: column;
  }
}
```

## 🚀 **Como Usar**

### **1. Instalar Dependências**

```bash
npm install
# ou
yarn install
```

### **2. Configurar Variáveis de Ambiente**

```env
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### **3. Usar os Componentes**

```typescript
// Em qualquer página ou componente
import QueueMonitor from '@/components/QueueMonitor';
import TicketMonitor from '@/components/TicketMonitor';

// Monitorar uma fila específica
<QueueMonitor queueId="queue-123" />

// Monitorar um ticket específico
<TicketMonitor ticketId="ticket-456" />
```

## 🎯 **Funcionalidades Implementadas**

- ✅ **Conexão automática** ao stream de tickets
- ✅ **Reconexão automática** em caso de erro
- ✅ **Monitoramento de fila** específica
- ✅ **Monitoramento de ticket** específico
- ✅ **Notificações em tempo real** de mudanças
- ✅ **Histórico de mudanças** do ticket
- ✅ **Interface responsiva** e intuitiva
- ✅ **Tratamento de erros** robusto
- ✅ **Heartbeat** para manter conexão viva

## 🔧 **Configurações Avançadas**

### **Personalizar Reconexão**

```typescript
const { isConnected } = useTicketMonitoring({
  queueId: 'queue-123',
  autoReconnect: true,
  reconnectInterval: 3000, // 3 segundos
});
```

### **Tratamento de Erros Personalizado**

```typescript
const { error } = useTicketMonitoring({
  queueId: 'queue-123',
  onError: (error) => {
    // Enviar para serviço de monitoramento
    console.error('Erro no monitoramento:', error);
    // Mostrar notificação para o usuário
    toast.error('Erro na conexão com o servidor');
  },
});
```

**Agora você tem um sistema completo de monitoramento de tickets em tempo real no frontend!** 🎉

