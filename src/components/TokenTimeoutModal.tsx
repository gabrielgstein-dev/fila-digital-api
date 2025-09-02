'use client';

import { useState, useEffect } from 'react';
import { useTokenTimeout } from '@/hooks/useTokenTimeout';
import { signOut } from 'next-auth/react';

interface TokenTimeoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExtend: () => void;
  timeLeft: number;
  formatTimeLeft: (seconds: number) => string;
}

export function TokenTimeoutModal({
  isOpen,
  onClose,
  onExtend,
  timeLeft,
  formatTimeLeft,
}: TokenTimeoutModalProps) {
  const [countdown, setCountdown] = useState(timeLeft);

  useEffect(() => {
    setCountdown(timeLeft);
  }, [timeLeft]);

  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  const handleLogout = () => {
    signOut({ callbackUrl: '/login' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
            <svg
              className="h-6 w-6 text-yellow-600"
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
          </div>

          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Sessão Expirando
          </h3>

          <p className="text-sm text-gray-500 mb-4">Sua sessão expirará em:</p>

          <div className="text-2xl font-bold text-red-600 mb-6">
            {formatTimeLeft(countdown)}
          </div>

          <div className="flex space-x-3">
            <button
              onClick={onExtend}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Estender Sessão
            </button>

            <button
              onClick={handleLogout}
              className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Fazer Logout
            </button>
          </div>

          <button
            onClick={onClose}
            className="mt-3 text-sm text-gray-500 hover:text-gray-700"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
