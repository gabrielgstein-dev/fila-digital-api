import { useSession } from 'next-auth/react';
import { useEffect, useState, useCallback } from 'react';

interface TokenTimeoutOptions {
  onTokenExpired?: () => void;
  onTokenExpiring?: (secondsLeft: number) => void;
  warningThreshold?: number; // segundos antes da expiração para avisar
  checkInterval?: number; // intervalo para verificar (em ms)
}

export function useTokenTimeout(options: TokenTimeoutOptions = {}) {
  const { data: session, update } = useSession();
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [isExpiring, setIsExpiring] = useState(false);

  const {
    onTokenExpired,
    onTokenExpiring,
    warningThreshold = 300, // 5 minutos
    checkInterval = 1000, // 1 segundo
  } = options;

  const calculateTimeLeft = useCallback(() => {
    if (!session?.user?.accessToken) {
      setTimeLeft(null);
      return null;
    }

    try {
      // Decodificar o JWT para obter a expiração
      const tokenPayload = JSON.parse(
        atob(session.user.accessToken.split('.')[1]),
      );
      const expirationTime = tokenPayload.exp * 1000; // Converter para ms
      const currentTime = Date.now();
      const timeLeftMs = expirationTime - currentTime;

      return Math.max(0, Math.floor(timeLeftMs / 1000)); // Converter para segundos
    } catch (error) {
      console.error('Erro ao decodificar token:', error);
      return null;
    }
  }, [session?.user?.accessToken]);

  const refreshToken = useCallback(async () => {
    try {
      console.log('🔄 Tentando renovar token...');
      await update();
      console.log('✅ Token renovado com sucesso');
    } catch (error) {
      console.error('❌ Erro ao renovar token:', error);
      if (onTokenExpired) {
        onTokenExpired();
      }
    }
  }, [update, onTokenExpired]);

  useEffect(() => {
    if (!session?.user?.accessToken) {
      setTimeLeft(null);
      setIsExpired(false);
      setIsExpiring(false);
      return;
    }

    const interval = setInterval(() => {
      const timeLeftSeconds = calculateTimeLeft();

      if (timeLeftSeconds === null) {
        setTimeLeft(null);
        return;
      }

      setTimeLeft(timeLeftSeconds);

      // Verificar se o token expirou
      if (timeLeftSeconds <= 0) {
        setIsExpired(true);
        setIsExpiring(false);
        if (onTokenExpired) {
          onTokenExpired();
        }
        clearInterval(interval);
        return;
      }

      // Verificar se está próximo da expiração
      if (timeLeftSeconds <= warningThreshold) {
        setIsExpiring(true);
        if (onTokenExpiring) {
          onTokenExpiring(timeLeftSeconds);
        }
      } else {
        setIsExpiring(false);
      }
    }, checkInterval);

    return () => clearInterval(interval);
  }, [
    session?.user?.accessToken,
    calculateTimeLeft,
    warningThreshold,
    checkInterval,
    onTokenExpired,
    onTokenExpiring,
  ]);

  const formatTimeLeft = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }, []);

  return {
    timeLeft,
    isExpired,
    isExpiring,
    formatTimeLeft,
    refreshToken,
    hasToken: !!session?.user?.accessToken,
  };
}
