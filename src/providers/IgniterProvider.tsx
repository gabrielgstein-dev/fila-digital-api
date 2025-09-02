'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { useSession } from 'next-auth/react';
import { createUserScopes, createRealtimeScopes } from '@/igniter/utils/scopes';

interface IgniterContextType {
  scopes: string[];
  isConnected: boolean;
  connectionError: string | null;
  eventSource: EventSource | null;
  lastMessage: any;
  reconnect: () => void;
}

const IgniterContext = createContext<IgniterContextType>({
  scopes: [],
  isConnected: false,
  connectionError: null,
  eventSource: null,
  lastMessage: null,
  reconnect: () => {},
});

export function IgniterProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [scopes, setScopes] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);
  const [lastMessage, setLastMessage] = useState<any>(null);

  const connectToIgniterSSE = useCallback(
    (userScopes: string[]) => {
      try {
        // Fechar conexão anterior se existir
        if (eventSource) {
          eventSource.close();
        }

        const scopesParam = encodeURIComponent(JSON.stringify(userScopes));
        const sseUrl = `/api/igniter/sse?scopes=${scopesParam}`;

        console.log('🔌 Conectando ao Igniter.js SSE:', sseUrl);

        const newEventSource = new EventSource(sseUrl);

        newEventSource.onopen = () => {
          setIsConnected(true);
          setConnectionError(null);
          console.log('✅ Conectado ao Igniter.js SSE');
        };

        newEventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            setLastMessage(data);
            console.log('📡 Dados recebidos via SSE:', data);

            // Aqui você pode processar os dados recebidos
            // Por exemplo, atualizar estado do React Query
            if (data.type === 'dashboard_update') {
              // Invalidar queries do dashboard
              window.dispatchEvent(
                new CustomEvent('igniter-dashboard-update', { detail: data }),
              );
            }
          } catch (error) {
            console.error('❌ Erro ao processar mensagem SSE:', error);
          }
        };

        newEventSource.onerror = (error) => {
          console.error('❌ Erro na conexão SSE:', error);
          setConnectionError('Erro na conexão em tempo real');
          setIsConnected(false);
        };

        setEventSource(newEventSource);

        return newEventSource;
      } catch (error) {
        console.error('❌ Erro ao conectar SSE:', error);
        setConnectionError('Erro ao conectar');
        setIsConnected(false);
      }
    },
    [eventSource],
  );

  const reconnect = useCallback(() => {
    if (session?.user) {
      const userScopes = createUserScopes(session);
      setScopes(userScopes);
      connectToIgniterSSE(userScopes);
    }
  }, [session, connectToIgniterSSE]);

  useEffect(() => {
    if (status === 'authenticated' && session) {
      const userScopes = createUserScopes(session);
      setScopes(userScopes);

      // Conectar ao SSE do Igniter.js
      connectToIgniterSSE(userScopes);
    } else {
      setScopes([]);
      setIsConnected(false);
      if (eventSource) {
        eventSource.close();
        setEventSource(null);
      }
    }
  }, [session, status, connectToIgniterSSE]);

  // Cleanup na desmontagem
  useEffect(() => {
    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [eventSource]);

  // Auto-reconnect em caso de erro
  useEffect(() => {
    if (connectionError && session?.user) {
      const timeout = setTimeout(() => {
        console.log('🔄 Tentando reconectar...');
        reconnect();
      }, 5000);

      return () => clearTimeout(timeout);
    }
  }, [connectionError, session, reconnect]);

  return (
    <IgniterContext.Provider
      value={{
        scopes,
        isConnected,
        connectionError,
        eventSource,
        lastMessage,
        reconnect,
      }}
    >
      {children}
    </IgniterContext.Provider>
  );
}

export function useIgniter() {
  const context = useContext(IgniterContext);
  if (!context) {
    throw new Error('useIgniter deve ser usado dentro de IgniterProvider');
  }
  return context;
}

// Hook para escutar atualizações específicas
export function useIgniterEvent(
  eventType: string,
  callback: (data: any) => void,
) {
  useEffect(() => {
    const handleEvent = (event: CustomEvent) => {
      if (event.detail.type === eventType) {
        callback(event.detail);
      }
    };

    window.addEventListener(
      'igniter-dashboard-update',
      handleEvent as EventListener,
    );

    return () => {
      window.removeEventListener(
        'igniter-dashboard-update',
        handleEvent as EventListener,
      );
    };
  }, [eventType, callback]);
}

// Hook para verificar permissões
export function useIgniterPermission(requiredScopes: string[]): boolean {
  const { scopes } = useIgniter();

  return requiredScopes.some((required) =>
    scopes.some(
      (user) =>
        user === required ||
        (user.endsWith(':*') && required.startsWith(user.slice(0, -2))),
    ),
  );
}
