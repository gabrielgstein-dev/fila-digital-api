'use client';

import {
  useDashboardMetrics,
  useChartData,
  useConnectionStatus,
  useRealtimeUpdate,
  useIgniterPermissions,
} from '@/hooks/useIgniterAuth';
import { useIgniter, useIgniterEvent } from '@/providers/IgniterProvider';
import { useState } from 'react';

export function Dashboard() {
  const { scopes, isConnected, connectionError, lastMessage, reconnect } =
    useIgniter();
  const {
    publicMetrics,
    privateMetrics,
    adminMetrics,
    tenantMetrics,
    isLoading,
    error,
  } = useDashboardMetrics();
  const { data: connectionStatus } = useConnectionStatus();
  const updateMetrics = useRealtimeUpdate();
  const permissions = useIgniterPermissions();

  const [selectedChartType, setSelectedChartType] = useState('tickets');
  const [selectedPeriod, setSelectedPeriod] = useState('week');

  const { data: chartData } = useChartData(selectedChartType, selectedPeriod);

  // Escutar atualizações em tempo real
  useIgniterEvent('dashboard_update', (data) => {
    console.log('📊 Dashboard atualizado via tempo real:', data);
  });

  const handleUpdateMetrics = async () => {
    try {
      await updateMetrics.mutateAsync({
        metricType: 'tickets',
        value: Math.floor(Math.random() * 100),
        description: 'Atualização via dashboard',
      });
    } catch (error) {
      console.error('Erro ao atualizar métricas:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="text-red-800 font-semibold">
          Erro ao carregar dashboard
        </h3>
        <p className="text-red-600">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status da conexão */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Status da Conexão</h2>
          <div className="flex items-center space-x-4">
            <div
              className={`px-3 py-1 rounded-full text-sm ${
                isConnected
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {isConnected ? 'Conectado' : 'Desconectado'}
            </div>
            {connectionError && (
              <button
                onClick={reconnect}
                className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm hover:bg-blue-200"
              >
                Reconectar
              </button>
            )}
          </div>
        </div>

        {connectionError && (
          <p className="text-red-600 text-sm mt-2">{connectionError}</p>
        )}

        <div className="mt-2 text-sm text-gray-600">
          <p>
            <strong>Scopes:</strong> {scopes.join(', ')}
          </p>
          {connectionStatus && (
            <p>
              <strong>Conectado em:</strong>{' '}
              {new Date(connectionStatus.connectedAt).toLocaleString()}
            </p>
          )}
        </div>

        {lastMessage && (
          <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
            <strong>Última mensagem:</strong>{' '}
            {JSON.stringify(lastMessage, null, 2)}
          </div>
        )}
      </div>

      {/* Métricas públicas */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold">Total de Usuários</h3>
          <p className="text-3xl font-bold">
            {publicMetrics?.data?.totalUsers}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold">Total de Tickets</h3>
          <p className="text-3xl font-bold">
            {publicMetrics?.data?.totalTickets}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold">Tempo Médio</h3>
          <p className="text-3xl font-bold">
            {publicMetrics?.data?.avgWaitTime}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold">Status do Sistema</h3>
          <p className="text-3xl font-bold text-green-600">
            {publicMetrics?.data?.systemStatus}
          </p>
        </div>
      </div>

      {/* Métricas privadas */}
      {permissions.canViewPrivateMetrics && privateMetrics?.data && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold">Métricas do Usuário</h3>
            <div className="space-y-2 mt-4">
              <p className="text-sm text-gray-600">
                <strong>ID:</strong> {privateMetrics.data.userMetrics.userId}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Role:</strong> {privateMetrics.data.userMetrics.role}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Tenant:</strong>{' '}
                {privateMetrics.data.userMetrics.tenantId}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Último Login:</strong>{' '}
                {new Date(
                  privateMetrics.data.userMetrics.lastLogin,
                ).toLocaleString()}
              </p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold">Métricas do Tenant</h3>
            <div className="space-y-2 mt-4">
              <p className="text-sm text-gray-600">
                <strong>Tickets:</strong>{' '}
                {privateMetrics.data.tenantMetrics.totalTickets}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Agentes:</strong>{' '}
                {privateMetrics.data.tenantMetrics.activeAgents}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Tempo:</strong>{' '}
                {privateMetrics.data.tenantMetrics.avgWaitTime}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Fila:</strong>{' '}
                {privateMetrics.data.tenantMetrics.queueLength}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Métricas administrativas */}
      {permissions.canViewAdminMetrics && adminMetrics?.data && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold">Métricas Administrativas</h3>
          <div className="grid grid-cols-4 gap-4 mt-4">
            <div>
              <p className="text-sm text-gray-600">Total de Tenants</p>
              <p className="text-2xl font-bold">
                {adminMetrics.data.systemMetrics.totalTenants}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Receita Total</p>
              <p className="text-2xl font-bold">
                R$ {adminMetrics.data.systemMetrics.totalRevenue}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Saúde do Sistema</p>
              <p className="text-2xl font-bold text-green-600">
                {adminMetrics.data.systemMetrics.systemHealth}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Uptime</p>
              <p className="text-2xl font-bold">
                {adminMetrics.data.systemMetrics.uptime}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Métricas do tenant */}
      {permissions.canViewTenantMetrics && tenantMetrics?.data && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold">Métricas do Tenant</h3>
          <div className="grid grid-cols-5 gap-4 mt-4">
            <div>
              <p className="text-sm text-gray-600">Total de Usuários</p>
              <p className="text-2xl font-bold">
                {tenantMetrics.data.metrics.totalUsers}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Tickets Ativos</p>
              <p className="text-2xl font-bold">
                {tenantMetrics.data.metrics.activeTickets}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Tickets Concluídos</p>
              <p className="text-2xl font-bold">
                {tenantMetrics.data.metrics.completedTickets}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Tempo de Resolução</p>
              <p className="text-2xl font-bold">
                {tenantMetrics.data.metrics.avgResolutionTime}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Satisfação</p>
              <p className="text-2xl font-bold">
                {tenantMetrics.data.metrics.customerSatisfaction}/5
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Gráficos */}
      {chartData?.data && (
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Dados do Gráfico</h3>
            <div className="flex space-x-4">
              <select
                value={selectedChartType}
                onChange={(e) => setSelectedChartType(e.target.value)}
                className="px-3 py-1 border rounded"
              >
                <option value="users">Usuários</option>
                <option value="tickets">Tickets</option>
                <option value="sessions">Sessões</option>
                <option value="revenue">Receita</option>
              </select>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-3 py-1 border rounded"
              >
                <option value="day">Dia</option>
                <option value="week">Semana</option>
                <option value="month">Mês</option>
                <option value="year">Ano</option>
              </select>
            </div>
          </div>

          <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
            <div className="text-center">
              <p className="text-gray-600">
                Gráfico: {selectedChartType} - {selectedPeriod}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Labels: {chartData.data.chartData.labels.join(', ')}
              </p>
              <p className="text-sm text-gray-500">
                Dados: {chartData.data.chartData.datasets[0].data.join(', ')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Botão para testar atualizações */}
      {permissions.canUpdateMetrics && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold">Teste de Atualizações</h3>
          <button
            onClick={handleUpdateMetrics}
            disabled={updateMetrics.isPending}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {updateMetrics.isPending ? 'Atualizando...' : 'Atualizar Métricas'}
          </button>
        </div>
      )}
    </div>
  );
}
