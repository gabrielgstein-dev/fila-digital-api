# 🎫 Integração Next.js - Sistema de Filas em Tempo Real

## 📋 Guia Completo para Next.js com App Router

Este guia ensina como implementar o **sistema de filas em tempo real** em **Next.js 14+** usando **App Router**, **Server-Sent Events (SSE)** e **TypeScript**.

---

## 🚀 Estrutura do Projeto

```
src/
├── app/
│   ├── queue/
│   │   └── [queueId]/
│   │       └── page.tsx
│   ├── queues/
│   │   └── page.tsx
│   └── layout.tsx
├── components/
│   ├── queue/
│   │   ├── QueueDisplay.tsx
│   │   ├── QueueSelector.tsx
│   │   ├── MultiQueueManager.tsx
│   │   └── ConnectionStatus.tsx
│   └── ui/
│       ├── notification.tsx
│       └── button.tsx
├── hooks/
│   ├── useQueueRealTime.ts
│   ├── useNotifications.ts
│   └── useAuth.ts
├── lib/
│   ├── queue-manager.ts
│   ├── api.ts
│   └── utils.ts
└── types/
    └── queue.ts
```

---

## 🔧 Configuração Inicial

### **1. Dependências**

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0",
    "@types/react": "^18.0.0",
    "tailwindcss": "^3.4.0",
    "lucide-react": "^0.300.0",
    "sonner": "^1.4.0"
  }
}
```

### **2. URLs da API**

```typescript
// src/lib/config.ts
export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
  RT_BASE_URL: process.env.NEXT_PUBLIC_RT_API_URL || 'http://localhost:8080/api/rt',
  ENDPOINTS: {
    // NestJS API
    QUEUES: '/api/v1/queues',
    TICKETS: '/api/v1/tickets',
    AUTH: '/api/v1/auth',
    
    // Igniter.js Real-time API
    RT_TICKETS_STREAM: '/api/rt/tickets/stream',
    RT_TICKETS_QUEUE: '/api/rt/tickets/queue',
    RT_TICKETS_STATS: '/api/rt/tickets/stats',
  }
};
```

### **3. Configuração do Next.js**

```typescript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: true,
  },
  // Para SSE funcionar corretamente
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

---

## 📝 Tipos TypeScript

```typescript
// src/types/queue.ts
export interface Queue {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'paused' | 'closed';
  tenantId: string;
  avgServiceTime?: number;
  capacity?: number;
}

export interface QueueTicketEvent {
  eventType: 'queue-ticket-changed';
  queueId: string;
  currentTicket: string;
  ticketId: string;
  callingNumber: string;
  queueName: string;
  timestamp: string;
  position?: number;
  estimatedWait?: string;
  metadata?: Record<string, any>;
}

export interface QueuePositionEvent {
  eventType: 'position-changed';
  queueId: string;
  userId: string;
  currentPosition: number;
  estimatedWait: string;
  peopleAhead: number;
  ticketNumber: string;
  timestamp: string;
}

export interface QueueStatusEvent {
  eventType: 'queue-status-changed';
  queueId: string;
  status: 'active' | 'paused' | 'closed';
  queueLength: number;
  avgWaitTime?: string;
  message?: string;
  timestamp: string;
}

export interface QueueState {
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
  lastUpdate: Date | null;
}

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  vibrate?: number[];
  requireInteraction?: boolean;
}
```

---

## 🎣 Hooks Personalizados

### **useQueueRealTime Hook**

```typescript
// src/hooks/useQueueRealTime.ts
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { QueueState, QueueTicketEvent, QueuePositionEvent, QueueStatusEvent } from '@/types/queue';

interface UseQueueOptions {
  listenToCurrentTicket?: boolean;
  listenToMyPosition?: boolean;
  includeQueueStatus?: boolean;
  onTicketCalled?: (data: QueueTicketEvent) => void;
  onPositionChanged?: (data: QueuePositionEvent) => void;
  onStatusChanged?: (data: QueueStatusEvent) => void;
  onError?: (error: Event) => void;
}

export function useQueueRealTime(
  queueId: string,
  token: string,
  options: UseQueueOptions = {}
) {
  const {
    listenToCurrentTicket = true,
    listenToMyPosition = true,
    includeQueueStatus = true,
    onTicketCalled,
    onPositionChanged,
    onStatusChanged,
    onError
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
    lastUpdate: null,
  });

  const eventSourcesRef = useRef<Map<string, EventSource>>(new Map());
  const reconnectTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const reconnectAttemptsRef = useRef<Map<string, number>>(new Map());

  // Função para criar EventSource com headers
  const createEventSource = useCallback((url: string) => {
    const eventSource = new EventSource(url);
    
    // Adicionar token via URL params (workaround para headers em SSE)
    const urlWithToken = `${url}${url.includes('?') ? '&' : '?'}token=${token}`;
    return new EventSource(urlWithToken);
  }, [token]);

  // Gerenciar reconexão
  const handleReconnection = useCallback((key: string, createConnection: () => void) => {
    const attempts = reconnectAttemptsRef.current.get(key) || 0;
    const maxAttempts = 5;

    if (attempts < maxAttempts) {
      const delay = Math.min(1000 * Math.pow(2, attempts), 30000);
      
      const timeout = setTimeout(() => {
        console.log(`🔄 Reconectando ${key} - Tentativa ${attempts + 1}/${maxAttempts}`);
        reconnectAttemptsRef.current.set(key, attempts + 1);
        createConnection();
      }, delay);

      reconnectTimeoutsRef.current.set(key, timeout);
    } else {
      console.error(`❌ Máximo de tentativas atingido para ${key}`);
      setQueueState(prev => ({ ...prev, isConnected: false }));
    }
  }, []);

  // Conectar ao ticket atual
  useEffect(() => {
    if (!listenToCurrentTicket || !queueId || !token) return;

    const key = 'current-ticket';
    
    const createConnection = () => {
      const url = `/auth/realtime/queue/${queueId}/current-ticket?includeQueueStatus=${includeQueueStatus}`;
      const eventSource = createEventSource(url);

      eventSource.onopen = () => {
        console.log(`✅ Conectado ao ticket atual da fila ${queueId}`);
        setQueueState(prev => ({ ...prev, isConnected: true }));
        reconnectAttemptsRef.current.set(key, 0);
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.eventType === 'queue-ticket-changed') {
            setQueueState(prev => ({
              ...prev,
              currentTicket: data.currentTicket,
              queueName: data.queueName,
              lastUpdate: new Date(),
            }));
            onTicketCalled?.(data);
          }
          
          if (data.eventType === 'queue-status-changed') {
            setQueueState(prev => ({
              ...prev,
              queueStatus: data.status,
              lastUpdate: new Date(),
            }));
            onStatusChanged?.(data);
          }
        } catch (error) {
          console.error('Erro ao processar evento:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error(`❌ Erro na conexão ${key}:`, error);
        setQueueState(prev => ({ ...prev, isConnected: false }));
        onError?.(error);
        
        eventSource.close();
        eventSourcesRef.current.delete(key);
        handleReconnection(key, createConnection);
      };

      eventSourcesRef.current.set(key, eventSource);
    };

    createConnection();

    return () => {
      const eventSource = eventSourcesRef.current.get(key);
      eventSource?.close();
      eventSourcesRef.current.delete(key);
      
      const timeout = reconnectTimeoutsRef.current.get(key);
      if (timeout) {
        clearTimeout(timeout);
        reconnectTimeoutsRef.current.delete(key);
      }
    };
  }, [queueId, token, listenToCurrentTicket, includeQueueStatus, createEventSource, handleReconnection, onTicketCalled, onStatusChanged, onError]);

  // Conectar à posição
  useEffect(() => {
    if (!listenToMyPosition || !queueId || !token) return;

    const key = 'my-position';
    
    const createConnection = () => {
      const url = `/auth/realtime/queue/${queueId}/my-position`;
      const eventSource = createEventSource(url);

      eventSource.onopen = () => {
        console.log(`✅ Conectado à posição da fila ${queueId}`);
        reconnectAttemptsRef.current.set(key, 0);
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.eventType === 'position-changed') {
            setQueueState(prev => ({
              ...prev,
              myPosition: data.currentPosition,
              estimatedWait: data.estimatedWait,
              peopleAhead: data.peopleAhead,
              ticketNumber: data.ticketNumber,
              isNearCall: data.currentPosition <= 3,
              lastUpdate: new Date(),
            }));
            onPositionChanged?.(data);
          }
        } catch (error) {
          console.error('Erro ao processar posição:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error(`❌ Erro na posição ${key}:`, error);
        onError?.(error);
        
        eventSource.close();
        eventSourcesRef.current.delete(key);
        handleReconnection(key, createConnection);
      };

      eventSourcesRef.current.set(key, eventSource);
    };

    createConnection();

    return () => {
      const eventSource = eventSourcesRef.current.get(key);
      eventSource?.close();
      eventSourcesRef.current.delete(key);
      
      const timeout = reconnectTimeoutsRef.current.get(key);
      if (timeout) {
        clearTimeout(timeout);
        reconnectTimeoutsRef.current.delete(key);
      }
    };
  }, [queueId, token, listenToMyPosition, createEventSource, handleReconnection, onPositionChanged, onError]);

  // Função para desconectar manualmente
  const disconnect = useCallback(() => {
    eventSourcesRef.current.forEach((eventSource, key) => {
      eventSource.close();
      console.log(`🔌 Desconectado de ${key}`);
    });
    
    reconnectTimeoutsRef.current.forEach(timeout => {
      clearTimeout(timeout);
    });
    
    eventSourcesRef.current.clear();
    reconnectTimeoutsRef.current.clear();
    reconnectAttemptsRef.current.clear();
    
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
      lastUpdate: null,
    });
  }, []);

  return {
    queueState,
    disconnect,
    isConnected: queueState.isConnected,
  };
}
```

### **useNotifications Hook**

```typescript
// src/hooks/useNotifications.ts
'use client';

import { useEffect, useCallback, useState } from 'react';
import { toast } from 'sonner';

interface NotificationPermission {
  granted: boolean;
  denied: boolean;
  default: boolean;
}

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>({
    granted: false,
    denied: false,
    default: true,
  });

  // Verificar permissão atual
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const currentPermission = Notification.permission;
      setPermission({
        granted: currentPermission === 'granted',
        denied: currentPermission === 'denied',
        default: currentPermission === 'default',
      });
    }
  }, []);

  // Solicitar permissão
  const requestPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.warn('Notificações não suportadas neste navegador');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      const newPermission = {
        granted: result === 'granted',
        denied: result === 'denied',
        default: result === 'default',
      };
      
      setPermission(newPermission);
      return newPermission.granted;
    } catch (error) {
      console.error('Erro ao solicitar permissão:', error);
      return false;
    }
  }, []);

  // Mostrar notificação
  const showNotification = useCallback((title: string, options?: NotificationOptions) => {
    // Toast sempre visível
    toast(title, {
      description: options?.body,
      duration: 5000,
    });

    // Notificação do browser se permitida
    if (permission.granted && typeof window !== 'undefined') {
      try {
        const notification = new Notification(title, {
          body: options?.body,
          icon: options?.icon || '/favicon.ico',
          badge: options?.badge || '/badge-icon.png',
          requireInteraction: options?.requireInteraction || false,
        });

        // Auto-fechar após 5 segundos
        setTimeout(() => {
          notification.close();
        }, 5000);

        return notification;
      } catch (error) {
        console.error('Erro ao mostrar notificação:', error);
      }
    }
  }, [permission.granted]);

  // Vibrar dispositivo
  const vibrate = useCallback((pattern: number[] = [200, 100, 200]) => {
    if (typeof window !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  }, []);

  return {
    permission,
    requestPermission,
    showNotification,
    vibrate,
  };
}

interface NotificationOptions {
  body?: string;
  icon?: string;
  badge?: string;
  requireInteraction?: boolean;
}
```

---

## 🎨 Componentes

### **ConnectionStatus Component**

```tsx
// src/components/queue/ConnectionStatus.tsx
'use client';

import { Wifi, WifiOff, Clock } from 'lucide-react';

interface ConnectionStatusProps {
  isConnected: boolean;
  lastUpdate: Date | null;
  className?: string;
}

export function ConnectionStatus({ isConnected, lastUpdate, className }: ConnectionStatusProps) {
  const formatLastUpdate = (date: Date | null) => {
    if (!date) return 'Nunca';
    
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'Agora mesmo';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}min atrás`;
    return date.toLocaleTimeString('pt-BR');
  };

  return (
    <div className={`flex items-center gap-2 text-sm ${className}`}>
      {isConnected ? (
        <>
          <Wifi className="h-4 w-4 text-green-500" />
          <span className="text-green-600 font-medium">Conectado</span>
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4 text-red-500" />
          <span className="text-red-600 font-medium">Desconectado</span>
        </>
      )}
      
      {lastUpdate && (
        <>
          <Clock className="h-3 w-3 text-gray-400" />
          <span className="text-gray-500 text-xs">
            {formatLastUpdate(lastUpdate)}
          </span>
        </>
      )}
    </div>
  );
}
```

### **QueueDisplay Component**

```tsx
// src/components/queue/QueueDisplay.tsx
'use client';

import { useEffect } from 'react';
import { useQueueRealTime } from '@/hooks/useQueueRealTime';
import { useNotifications } from '@/hooks/useNotifications';
import { ConnectionStatus } from './ConnectionStatus';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle, 
  Clock, 
  Users, 
  Hash,
  Volume2,
  VolumeX 
} from 'lucide-react';

interface QueueDisplayProps {
  queueId: string;
  queueName?: string;
  token: string;
  onDisconnect?: () => void;
  className?: string;
}

export function QueueDisplay({ 
  queueId, 
  queueName, 
  token, 
  onDisconnect,
  className 
}: QueueDisplayProps) {
  const { showNotification, vibrate, requestPermission, permission } = useNotifications();
  
  const { queueState, disconnect, isConnected } = useQueueRealTime(queueId, token, {
    onTicketCalled: (data) => {
      showNotification('Ticket Chamado!', {
        body: `${data.queueName}: Chamando ${data.currentTicket}`,
        requireInteraction: true,
      });
      vibrate([200, 100, 200]);
    },
    
    onPositionChanged: (data) => {
      if (data.currentPosition <= 3 && data.currentPosition > 0) {
        showNotification('Próximo de ser chamado!', {
          body: `Posição ${data.currentPosition} - ${data.estimatedWait}`,
          requireInteraction: true,
        });
        vibrate([100, 50, 100, 50, 100]);
      }
    },
    
    onStatusChanged: (data) => {
      const statusMessages = {
        active: 'Fila reativada',
        paused: 'Fila pausada',
        closed: 'Fila fechada'
      };
      
      showNotification('Status da Fila', {
        body: statusMessages[data.status] || 'Status atualizado',
      });
    }
  });

  // Solicitar permissão ao montar
  useEffect(() => {
    if (permission.default) {
      requestPermission();
    }
  }, [permission.default, requestPermission]);

  const handleDisconnect = () => {
    disconnect();
    onDisconnect?.();
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg border p-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {queueState.queueName || queueName || 'Carregando...'}
          </h2>
          {queueState.queueStatus && (
            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-2 ${
              queueState.queueStatus === 'active' 
                ? 'bg-green-100 text-green-800'
                : queueState.queueStatus === 'paused'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {queueState.queueStatus === 'active' && '🟢 Ativa'}
              {queueState.queueStatus === 'paused' && '🟡 Pausada'}
              {queueState.queueStatus === 'closed' && '🔴 Fechada'}
            </div>
          )}
        </div>
        
        <ConnectionStatus
          isConnected={isConnected}
          lastUpdate={queueState.lastUpdate}
        />
      </div>

      {/* Ticket Atual */}
      <div className="bg-blue-50 rounded-lg p-6 mb-6 text-center">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">
          🎫 Chamando Agora
        </h3>
        <div className="text-4xl font-bold text-blue-600 mb-2">
          {queueState.currentTicket || 'Aguardando...'}
        </div>
        {queueState.currentTicket && (
          <div className="flex justify-center">
            <Volume2 className="h-5 w-5 text-blue-500 animate-pulse" />
          </div>
        )}
      </div>

      {/* Minha Posição */}
      {queueState.myPosition && (
        <div className={`rounded-lg p-6 transition-all duration-300 ${
          queueState.isNearCall 
            ? 'bg-orange-50 border-2 border-orange-200 animate-pulse' 
            : 'bg-gray-50'
        }`}>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            📍 Sua Posição na Fila
            {queueState.isNearCall && (
              <AlertTriangle className="h-5 w-5 text-orange-500" />
            )}
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">
                #{queueState.myPosition}
              </div>
              <div className="text-sm text-gray-500">Posição</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600 flex items-center justify-center gap-1">
                <Users className="h-5 w-5" />
                {queueState.peopleAhead}
              </div>
              <div className="text-sm text-gray-500">À frente</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 flex items-center justify-center gap-1">
                <Clock className="h-5 w-5" />
                {queueState.estimatedWait}
              </div>
              <div className="text-sm text-gray-500">Estimativa</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 flex items-center justify-center gap-1">
                <Hash className="h-5 w-5" />
                {queueState.ticketNumber}
              </div>
              <div className="text-sm text-gray-500">Seu ticket</div>
            </div>
          </div>

          {queueState.isNearCall && (
            <div className="mt-4 p-3 bg-orange-100 border border-orange-200 rounded-lg">
              <div className="flex items-center gap-2 text-orange-800">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-medium">
                  Atenção! Você está próximo de ser chamado!
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Ações */}
      <div className="mt-6 flex gap-3">
        <Button
          onClick={handleDisconnect}
          variant="outline"
          className="flex-1"
        >
          Desconectar
        </Button>
        
        {!permission.granted && (
          <Button
            onClick={requestPermission}
            variant="outline"
          >
            Ativar Notificações
          </Button>
        )}
      </div>
    </div>
  );
}
```

### **QueueSelector Component**

```tsx
// src/components/queue/QueueSelector.tsx
'use client';

import { useState } from 'react';
import { Queue } from '@/types/queue';
import { Button } from '@/components/ui/button';
import { Search, Clock, Users } from 'lucide-react';

interface QueueSelectorProps {
  queues: Queue[];
  onQueueSelect: (queueId: string) => void;
  selectedQueueId?: string;
  className?: string;
}

export function QueueSelector({ 
  queues, 
  onQueueSelect, 
  selectedQueueId,
  className 
}: QueueSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredQueues = queues.filter(queue =>
    queue.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    queue.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'closed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return '🟢';
      case 'paused': return '🟡';
      case 'closed': return '🔴';
      default: return '⚪';
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg border p-6 ${className}`}>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Selecionar Fila
      </h2>

      {/* Busca */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <input
          type="text"
          placeholder="Buscar fila..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Lista de Filas */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {filteredQueues.map((queue) => (
          <div
            key={queue.id}
            className={`border rounded-lg p-4 cursor-pointer transition-all duration-200 hover:shadow-md ${
              selectedQueueId === queue.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => onQueueSelect(queue.id)}
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-semibold text-gray-900">{queue.name}</h3>
                <p className="text-sm text-gray-500">{queue.type}</p>
              </div>
              
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(queue.status)}`}>
                {getStatusIcon(queue.status)} {queue.status}
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-600">
              {queue.avgServiceTime && (
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{Math.round(queue.avgServiceTime / 60)}min/atendimento</span>
                </div>
              )}
              
              {queue.capacity && (
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>Até {queue.capacity} pessoas</span>
                </div>
              )}
            </div>

            {selectedQueueId === queue.id && (
              <div className="mt-3 pt-3 border-t border-blue-200">
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    onQueueSelect(queue.id);
                  }}
                  className="w-full"
                  size="sm"
                >
                  Conectar a esta Fila
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredQueues.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>Nenhuma fila encontrada</p>
        </div>
      )}
    </div>
  );
}
```

### **MultiQueueManager Component**

```tsx
// src/components/queue/MultiQueueManager.tsx
'use client';

import { useState } from 'react';
import { Queue } from '@/types/queue';
import { QueueDisplay } from './QueueDisplay';
import { QueueSelector } from './QueueSelector';
import { Button } from '@/components/ui/button';
import { Plus, X } from 'lucide-react';

interface MultiQueueManagerProps {
  availableQueues: Queue[];
  token: string;
  maxQueues?: number;
  className?: string;
}

export function MultiQueueManager({ 
  availableQueues, 
  token, 
  maxQueues = 3,
  className 
}: MultiQueueManagerProps) {
  const [activeQueues, setActiveQueues] = useState<string[]>([]);
  const [showSelector, setShowSelector] = useState(false);

  const addQueue = (queueId: string) => {
    if (!activeQueues.includes(queueId) && activeQueues.length < maxQueues) {
      setActiveQueues([...activeQueues, queueId]);
      setShowSelector(false);
    }
  };

  const removeQueue = (queueId: string) => {
    setActiveQueues(activeQueues.filter(id => id !== queueId));
  };

  const getQueueName = (queueId: string) => {
    return availableQueues.find(q => q.id === queueId)?.name || 'Fila Desconhecida';
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Gerenciador de Filas
          </h1>
          <p className="text-gray-600 mt-1">
            {activeQueues.length}/{maxQueues} filas ativas
          </p>
        </div>

        {activeQueues.length < maxQueues && (
          <Button
            onClick={() => setShowSelector(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Adicionar Fila
          </Button>
        )}
      </div>

      {/* Seletor de Fila Modal */}
      {showSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold">Adicionar Fila</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSelector(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="p-6">
              <QueueSelector
                queues={availableQueues.filter(q => !activeQueues.includes(q.id))}
                onQueueSelect={addQueue}
              />
            </div>
          </div>
        </div>
      )}

      {/* Filas Ativas */}
      {activeQueues.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <div className="text-6xl mb-4">🎫</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Nenhuma fila conectada
          </h3>
          <p className="text-gray-600 mb-4">
            Adicione uma fila para começar a receber notificações em tempo real
          </p>
          <Button onClick={() => setShowSelector(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Conectar à Primeira Fila
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {activeQueues.map(queueId => (
            <div key={queueId} className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeQueue(queueId)}
                className="absolute top-2 right-2 z-10 h-8 w-8 p-0 bg-white shadow-md hover:bg-red-50 hover:text-red-600"
              >
                <X className="h-4 w-4" />
              </Button>
              
              <QueueDisplay
                queueId={queueId}
                queueName={getQueueName(queueId)}
                token={token}
                onDisconnect={() => removeQueue(queueId)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Informações */}
      {activeQueues.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="text-blue-600 text-xl">💡</div>
            <div>
              <h4 className="font-semibold text-blue-900 mb-1">
                Dicas para melhor experiência:
              </h4>
              <ul className="text-blue-800 text-sm space-y-1">
                <li>• Mantenha a aba aberta para receber notificações</li>
                <li>• Ative as notificações do navegador</li>
                <li>• O som será reproduzido quando um ticket for chamado</li>
                <li>• Você receberá alertas quando estiver próximo de ser chamado</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## 📄 Páginas Next.js

### **Página de Filas**

```tsx
// src/app/queues/page.tsx
import { Metadata } from 'next';
import { MultiQueueManager } from '@/components/queue/MultiQueueManager';
import { getQueues } from '@/lib/api';
import { getServerSession } from 'next-auth';

export const metadata: Metadata = {
  title: 'Filas em Tempo Real | Sistema de Filas',
  description: 'Acompanhe suas filas em tempo real',
};

export default async function QueuesPage() {
  const session = await getServerSession();
  
  if (!session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Acesso Negado</h1>
          <p>Você precisa estar logado para acessar as filas.</p>
        </div>
      </div>
    );
  }

  const queues = await getQueues(session.user.tenantId);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <MultiQueueManager
          availableQueues={queues}
          token={session.accessToken}
          maxQueues={3}
        />
      </div>
    </div>
  );
}
```

### **Página de Fila Específica**

```tsx
// src/app/queue/[queueId]/page.tsx
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { QueueDisplay } from '@/components/queue/QueueDisplay';
import { getQueue } from '@/lib/api';
import { getServerSession } from 'next-auth';

interface QueuePageProps {
  params: {
    queueId: string;
  };
}

export async function generateMetadata({ params }: QueuePageProps): Promise<Metadata> {
  const queue = await getQueue(params.queueId);
  
  return {
    title: `${queue?.name || 'Fila'} | Sistema de Filas`,
    description: `Acompanhe a fila ${queue?.name || ''} em tempo real`,
  };
}

export default async function QueuePage({ params }: QueuePageProps) {
  const session = await getServerSession();
  
  if (!session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Acesso Negado</h1>
          <p>Você precisa estar logado para acessar esta fila.</p>
        </div>
      </div>
    );
  }

  const queue = await getQueue(params.queueId);
  
  if (!queue) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <QueueDisplay
          queueId={params.queueId}
          queueName={queue.name}
          token={session.accessToken}
        />
      </div>
    </div>
  );
}
```

---

## 🔧 Utilitários e API

### **API Client**

```typescript
// src/lib/api.ts
import { Queue } from '@/types/queue';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export async function getQueues(tenantId?: string): Promise<Queue[]> {
  try {
    const url = tenantId 
      ? `${API_BASE_URL}/queues?tenantId=${tenantId}`
      : `${API_BASE_URL}/queues`;
      
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
      next: { revalidate: 60 }, // Cache por 1 minuto
    });

    if (!response.ok) {
      throw new Error('Falha ao buscar filas');
    }

    return response.json();
  } catch (error) {
    console.error('Erro ao buscar filas:', error);
    return [];
  }
}

export async function getQueue(queueId: string): Promise<Queue | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/queues/${queueId}`, {
      headers: {
        'Content-Type': 'application/json',
      },
      next: { revalidate: 30 }, // Cache por 30 segundos
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch (error) {
    console.error('Erro ao buscar fila:', error);
    return null;
  }
}
```

### **Componente de Button**

```tsx
// src/components/ui/button.tsx
import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    const baseClasses = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50';
    
    const variants = {
      default: 'bg-blue-600 text-white hover:bg-blue-700',
      outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
      ghost: 'text-gray-700 hover:bg-gray-100',
    };
    
    const sizes = {
      default: 'h-10 px-4 py-2',
      sm: 'h-8 px-3 text-sm',
      lg: 'h-12 px-8',
    };

    return (
      <button
        className={cn(
          baseClasses,
          variants[variant],
          sizes[size],
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';

export { Button };
```

### **Utilitários**

```typescript
// src/lib/utils.ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}min`;
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}min`;
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
```

---

## 🎨 Estilos Tailwind

```css
/* src/app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html {
    font-family: system-ui, sans-serif;
  }
}

@layer components {
  .queue-pulse {
    @apply animate-pulse bg-gradient-to-r from-blue-400 to-blue-600;
  }
  
  .near-call-glow {
    @apply shadow-lg shadow-orange-200 animate-pulse;
  }
  
  .connection-indicator {
    @apply flex items-center gap-2 text-sm font-medium;
  }
  
  .notification-toast {
    @apply bg-white border border-gray-200 rounded-lg shadow-lg p-4;
  }
}

@layer utilities {
  .text-balance {
    text-wrap: balance;
  }
}

/* Animações personalizadas */
@keyframes slideInRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes bounceIn {
  0%, 20%, 40%, 60%, 80% {
    transform: translateY(0);
  }
  10% {
    transform: translateY(-10px);
  }
  30% {
    transform: translateY(-5px);
  }
}

.slide-in-right {
  animation: slideInRight 0.3s ease-out;
}

.bounce-in {
  animation: bounceIn 0.6s ease-out;
}
```

---

## 🚀 Exemplo de Uso Completo

### **Layout Principal**

```tsx
// src/app/layout.tsx
import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        {children}
        <Toaster 
          position="top-right" 
          richColors 
          closeButton
          duration={5000}
        />
      </body>
    </html>
  );
}
```

### **Página Home**

```tsx
// src/app/page.tsx
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        <div className="text-8xl mb-8">🎫</div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Sistema de Filas em Tempo Real
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl">
          Acompanhe suas filas em tempo real, receba notificações quando seu ticket 
          for chamado e saiba exatamente quando é sua vez.
        </p>
        
        <div className="space-y-4">
          <Link href="/queues">
            <Button size="lg" className="text-lg px-8 py-4">
              Acessar Filas
            </Button>
          </Link>
          
          <div className="text-sm text-gray-500">
            <p>✅ Notificações em tempo real</p>
            <p>✅ Múltiplas filas simultâneas</p>
            <p>✅ Tempo de espera estimado</p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## 🔧 Configurações de Deploy

### **Variáveis de Ambiente**

```env
# .env.local
NEXT_PUBLIC_API_URL=https://api.filadigital.com
NEXTAUTH_URL=https://app.filadigital.com
NEXTAUTH_SECRET=your-secret-key
```

### **Dockerfile**

```dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm install -g pnpm && pnpm build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
```

---

## 📱 PWA Support

### **Manifest**

```json
{
  "name": "Sistema de Filas",
  "short_name": "Filas",
  "description": "Sistema de filas em tempo real",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#2563eb",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

---

## 🎯 **Resumo da Implementação Next.js**

### ✅ **Recursos Implementados:**

1. **App Router** - Estrutura moderna do Next.js 14+
2. **TypeScript** - Tipagem completa e robusta
3. **Hooks Personalizados** - `useQueueRealTime`, `useNotifications`
4. **Componentes Reutilizáveis** - Design system completo
5. **SSE com Reconexão** - Conexões robustas e automáticas
6. **Notificações Avançadas** - Browser + Toast + Vibração
7. **Multi-filas** - Gerenciamento de múltiplas filas
8. **Responsivo** - Mobile-first design
9. **PWA Ready** - Suporte para instalação
10. **Deploy Ready** - Docker e variáveis de ambiente

### 🚀 **Como Usar:**

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis
cp .env.example .env.local

# 3. Executar desenvolvimento
npm run dev

# 4. Build para produção
npm run build
```

**Sistema Next.js completo e production-ready para filas em tempo real! 🎫✨**



