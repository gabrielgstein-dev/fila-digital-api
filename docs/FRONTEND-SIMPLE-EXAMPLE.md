# Exemplo Simples - Frontend Next.js

## 🚀 **Implementação Rápida**

### **1. Hook Simples para Monitoramento**

```typescript
// hooks/useTicketStream.ts
import { useState, useEffect, useRef } from 'react';

export function useTicketStream(queueId?: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const url = queueId 
      ? `${baseUrl}/api/rt/tickets/stream?queueId=${queueId}`
      : `${baseUrl}/api/rt/tickets/stream`;

    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('✅ Conectado ao stream de tickets');
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.event === 'ticket_notification') {
        console.log('🎫 Nova notificação:', data.data);
        setLastUpdate(new Date());
        
        // Atualizar lista de tickets
        if (data.data.action === 'created') {
          setTickets(prev => [...prev, data.data]);
        } else if (data.data.action === 'updated') {
          setTickets(prev => prev.map(ticket => 
            ticket.id === data.data.id ? { ...ticket, ...data.data } : ticket
          ));
        } else if (data.data.action === 'deleted') {
          setTickets(prev => prev.filter(ticket => ticket.id !== data.data.id));
        }
      }
    };

    eventSource.onerror = (error) => {
      console.error('❌ Erro no stream:', error);
      setIsConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, [queueId]);

  return {
    isConnected,
    tickets,
    lastUpdate,
  };
}
```

### **2. Componente Simples**

```typescript
// components/TicketList.tsx
'use client';

import { useTicketStream } from '@/hooks/useTicketStream';

export default function TicketList({ queueId }: { queueId?: string }) {
  const { isConnected, tickets, lastUpdate } = useTicketStream(queueId);

  return (
    <div className="ticket-list">
      <div className="status">
        Status: {isConnected ? '🟢 Conectado' : '🔴 Desconectado'}
        {lastUpdate && (
          <span> | Última atualização: {lastUpdate.toLocaleTimeString()}</span>
        )}
      </div>
      
      <div className="tickets">
        <h3>Tickets ({tickets.length})</h3>
        {tickets.map((ticket) => (
          <div key={ticket.id} className="ticket">
            <span>#{ticket.myCallingToken}</span>
            <span className={`status ${ticket.status}`}>
              {ticket.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### **3. Página de Exemplo**

```typescript
// pages/tickets.tsx
import TicketList from '@/components/TicketList';

export default function TicketsPage() {
  return (
    <div>
      <h1>Monitor de Tickets</h1>
      
      {/* Monitorar todas as filas */}
      <TicketList />
      
      {/* Monitorar fila específica */}
      <TicketList queueId="queue-123" />
    </div>
  );
}
```

### **4. CSS Simples**

```css
/* styles/tickets.css */
.ticket-list {
  max-width: 600px;
  margin: 20px auto;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.status {
  margin-bottom: 20px;
  padding: 10px;
  background: #f8f9fa;
  border-radius: 4px;
}

.tickets h3 {
  margin-bottom: 15px;
}

.ticket {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  margin: 5px 0;
  background: #fff;
  border: 1px solid #eee;
  border-radius: 4px;
}

.ticket .status {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
}

.ticket .status.waiting {
  background: #fff3cd;
  color: #856404;
}

.ticket .status.called {
  background: #d1ecf1;
  color: #0c5460;
}
```

## 🎯 **Como Usar**

1. **Copie o código** para seus arquivos
2. **Configure a variável** `NEXT_PUBLIC_API_URL` no `.env.local`
3. **Importe o componente** onde precisar
4. **Pronto!** Seu monitor de tickets está funcionando

## 📝 **Variáveis de Ambiente**

```env
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:3001
```

**É isso! Agora você tem um monitor de tickets funcionando em tempo real!** 🎉

