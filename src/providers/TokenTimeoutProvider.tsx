'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import { useTokenTimeout } from '@/hooks/useTokenTimeout';
import { TokenTimeoutModal } from '@/components/TokenTimeoutModal';
import { signOut } from 'next-auth/react';

interface TokenTimeoutContextType {
  showTimeoutModal: boolean;
  setShowTimeoutModal: (show: boolean) => void;
  extendSession: () => void;
  logout: () => void;
}

const TokenTimeoutContext = createContext<TokenTimeoutContextType>({
  showTimeoutModal: false,
  setShowTimeoutModal: () => {},
  extendSession: () => {},
  logout: () => {},
});

export function TokenTimeoutProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [showTimeoutModal, setShowTimeoutModal] = useState(false);

  const extendSession = useCallback(async () => {
    try {
      // Aqui você pode implementar a lógica para estender a sessão
      // Por exemplo, chamar uma API para renovar o token
      console.log('🔄 Estendendo sessão...');

      // Simular renovação de token
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setShowTimeoutModal(false);
      console.log('✅ Sessão estendida com sucesso');
    } catch (error) {
      console.error('❌ Erro ao estender sessão:', error);
      logout();
    }
  }, []);

  const logout = useCallback(() => {
    console.log('🚪 Fazendo logout...');
    signOut({ callbackUrl: '/login' });
  }, []);

  const handleTokenExpiring = useCallback(
    (secondsLeft: number) => {
      console.log(`⏰ Token expirando em ${secondsLeft} segundos`);

      // Mostrar modal quando restam 2 minutos
      if (secondsLeft <= 120 && !showTimeoutModal) {
        setShowTimeoutModal(true);
      }
    },
    [showTimeoutModal],
  );

  const handleTokenExpired = useCallback(() => {
    console.log('❌ Token expirado');
    setShowTimeoutModal(false);
    logout();
  }, [logout]);

  // Hook para monitorar o token
  useTokenTimeout({
    onTokenExpired: handleTokenExpired,
    onTokenExpiring: handleTokenExpiring,
    warningThreshold: 300, // 5 minutos
    checkInterval: 1000, // 1 segundo
  });

  return (
    <TokenTimeoutContext.Provider
      value={{
        showTimeoutModal,
        setShowTimeoutModal,
        extendSession,
        logout,
      }}
    >
      {children}

      <TokenTimeoutModal
        isOpen={showTimeoutModal}
        onClose={() => setShowTimeoutModal(false)}
        onExtend={extendSession}
        timeLeft={120} // 2 minutos para o modal
        formatTimeLeft={(seconds) => {
          const minutes = Math.floor(seconds / 60);
          const secs = seconds % 60;
          return `${minutes}:${secs.toString().padStart(2, '0')}`;
        }}
      />
    </TokenTimeoutContext.Provider>
  );
}

export function useTokenTimeoutContext() {
  const context = useContext(TokenTimeoutContext);
  if (!context) {
    throw new Error(
      'useTokenTimeoutContext deve ser usado dentro de TokenTimeoutProvider',
    );
  }
  return context;
}
