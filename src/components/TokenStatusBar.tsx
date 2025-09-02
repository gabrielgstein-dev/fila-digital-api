'use client';

import { useTokenTimeout } from '@/hooks/useTokenTimeout';
import { useState } from 'react';

interface TokenStatusBarProps {
  onTokenExpired?: () => void;
  onTokenExpiring?: (secondsLeft: number) => void;
  warningThreshold?: number;
  showCountdown?: boolean;
}

export function TokenStatusBar({
  onTokenExpired,
  onTokenExpiring,
  warningThreshold = 300,
  showCountdown = true,
}: TokenStatusBarProps) {
  const { timeLeft, isExpired, isExpiring, formatTimeLeft, hasToken } =
    useTokenTimeout({
      onTokenExpired,
      onTokenExpiring,
      warningThreshold,
    });

  const [isVisible, setIsVisible] = useState(false);

  // Mostrar a barra apenas quando há token e está próximo da expiração
  useEffect(() => {
    setIsVisible(hasToken && isExpiring && !isExpired);
  }, [hasToken, isExpiring, isExpired]);

  if (!isVisible || !timeLeft) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-white px-4 py-2 z-40">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
          <span className="text-sm font-medium">
            Sua sessão expirará em breve
          </span>
        </div>

        {showCountdown && (
          <div className="text-sm font-bold">{formatTimeLeft(timeLeft)}</div>
        )}
      </div>
    </div>
  );
}
