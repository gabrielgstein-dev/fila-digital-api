'use client';

import { Dashboard } from './Dashboard';
import { TokenStatusBar } from './TokenStatusBar';
import { useTokenTimeout } from '@/hooks/useTokenTimeout';

export function DashboardWithTimeout() {
  const { timeLeft, isExpired, isExpiring, formatTimeLeft, hasToken } =
    useTokenTimeout({
      warningThreshold: 300, // 5 minutos
      checkInterval: 1000, // 1 segundo
    });

  const handleTokenExpired = () => {
    console.log('❌ Token expirado - redirecionando para login');
    // Aqui você pode implementar a lógica de logout
  };

  const handleTokenExpiring = (secondsLeft: number) => {
    console.log(`⏰ Token expirando em ${secondsLeft} segundos`);
  };

  return (
    <div className="relative">
      {/* Barra de status do token */}
      <TokenStatusBar
        onTokenExpired={handleTokenExpired}
        onTokenExpiring={handleTokenExpiring}
        warningThreshold={300}
        showCountdown={true}
      />

      {/* Dashboard principal */}
      <div className={isExpiring ? 'pt-12' : ''}>
        <Dashboard />
      </div>

      {/* Informações de debug (opcional) */}
      {process.env.NODE_ENV === 'development' && hasToken && (
        <div className="fixed bottom-4 right-4 bg-black bg-opacity-75 text-white p-3 rounded-lg text-sm">
          <div>
            Token Status:{' '}
            {isExpired
              ? '❌ Expirado'
              : isExpiring
                ? '⚠️ Expirando'
                : '✅ Válido'}
          </div>
          {timeLeft && <div>Tempo restante: {formatTimeLeft(timeLeft)}</div>}
        </div>
      )}
    </div>
  );
}
