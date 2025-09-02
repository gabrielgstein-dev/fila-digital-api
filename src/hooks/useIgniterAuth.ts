import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';

const IGNITER_BASE_URL =
  process.env.NEXT_PUBLIC_IGNITER_URL || 'http://localhost:3001';

export function useIgniterAuthQuery<T>(path: string, options?: any) {
  const { data: session } = useSession();

  return useQuery({
    queryKey: ['igniter', path, session?.user?.id],
    queryFn: async () => {
      const response = await fetch(`${IGNITER_BASE_URL}/api/igniter${path}`, {
        headers: {
          Authorization: `Bearer ${session?.user?.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.json() as T;
    },
    enabled: !!session?.user?.accessToken,
    ...options,
  });
}

export function useIgniterAuthMutation<T, V>(path: string, options?: any) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: V) => {
      const response = await fetch(`${IGNITER_BASE_URL}/api/igniter${path}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.user?.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.json() as T;
    },
    onSuccess: () => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['igniter'] });
    },
    ...options,
  });
}

// Hook específico para métricas do dashboard
export function useDashboardMetrics() {
  const { data: session } = useSession();

  // Métricas públicas (sem auth)
  const publicMetrics = useIgniterAuthQuery('/dashboard/public-metrics', {
    enabled: true, // Sempre habilitado
  });

  // Métricas privadas (com auth)
  const privateMetrics = useIgniterAuthQuery('/dashboard/private-metrics', {
    enabled: !!session?.user?.accessToken,
  });

  // Métricas administrativas (apenas admin)
  const adminMetrics = useIgniterAuthQuery('/dashboard/admin-metrics', {
    enabled:
      !!session?.user?.accessToken &&
      (session?.user?.role === 'admin' ||
        session?.user?.role === 'super_admin'),
  });

  // Métricas do tenant
  const tenantMetrics = useIgniterAuthQuery('/dashboard/tenant-metrics', {
    enabled: !!session?.user?.accessToken,
  });

  return {
    publicMetrics,
    privateMetrics,
    adminMetrics,
    tenantMetrics,
    isLoading:
      publicMetrics.isLoading ||
      privateMetrics.isLoading ||
      adminMetrics.isLoading,
    error: publicMetrics.error || privateMetrics.error || adminMetrics.error,
  };
}

// Hook para dados de gráficos
export function useChartData(type: string, period: string, tenantId?: string) {
  const { data: session } = useSession();

  return useIgniterAuthQuery(
    `/dashboard/chart-data?type=${type}&period=${period}&tenantId=${tenantId || ''}`,
    {
      enabled: !!session?.user?.accessToken,
      queryKey: [
        'igniter',
        'chart-data',
        type,
        period,
        tenantId,
        session?.user?.id,
      ],
    },
  );
}

// Hook para status da conexão
export function useConnectionStatus() {
  const { data: session } = useSession();

  return useIgniterAuthQuery('/dashboard/connection-status', {
    enabled: !!session?.user?.accessToken,
    refetchInterval: 30000, // Refetch a cada 30 segundos
  });
}

// Hook para atualizações em tempo real
export function useRealtimeUpdate() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  return useIgniterAuthMutation('/dashboard/realtime-update', {
    onSuccess: (data) => {
      // Invalidar queries específicas baseado no tipo de evento
      if (
        data.eventType === 'ticket_created' ||
        data.eventType === 'ticket_updated'
      ) {
        queryClient.invalidateQueries({
          queryKey: ['igniter', 'dashboard', 'tickets'],
        });
      }

      if (data.eventType === 'user_joined' || data.eventType === 'user_left') {
        queryClient.invalidateQueries({
          queryKey: ['igniter', 'dashboard', 'users'],
        });
      }

      // Invalidar todas as métricas do dashboard
      queryClient.invalidateQueries({ queryKey: ['igniter', 'dashboard'] });
    },
  });
}

// Hook para verificar permissões
export function useIgniterPermissions() {
  const { data: session } = useSession();

  const permissions = {
    canViewAdminMetrics:
      session?.user?.role === 'admin' || session?.user?.role === 'super_admin',
    canUpdateMetrics:
      session?.user?.role === 'admin' || session?.user?.role === 'super_admin',
    canViewTenantMetrics: !!session?.user?.tenantId,
    canViewPrivateMetrics: !!session?.user?.accessToken,
    canSendRealtimeUpdates: !!session?.user?.accessToken,
  };

  return permissions;
}
