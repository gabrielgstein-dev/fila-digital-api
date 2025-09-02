import { TestHelper } from './test-setup';

describe('Advanced Business Flows E2E', () => {
  let testHelper: TestHelper;

  beforeAll(async () => {
    testHelper = await TestHelper.createInstance();
  });

  afterAll(async () => {
    await testHelper.afterAll();
  });

  beforeEach(async () => {
    await testHelper.beforeEach();
  });

  describe('🏥 Complete Hospital Workflow', () => {
    it('deve processar fluxo completo de hospital com triagem', async () => {
      const { tenant, token } =
        await testHelper.setupCompleteTestDataWithAuth();

      // Criar filas especializadas
      const triagem = await testHelper.createQueue(tenant.id, {
        name: 'Triagem',
        description: 'Triagem inicial',
        queueType: 'PRIORITY',
        capacity: 100,
        avgServiceTime: 180, // 3 minutos
      });

      const emergencia = await testHelper.createQueue(tenant.id, {
        name: 'Emergência',
        description: 'Atendimento de emergência',
        queueType: 'VIP',
        capacity: 20,
        avgServiceTime: 1800, // 30 minutos
      });

      const consulta = await testHelper.createQueue(tenant.id, {
        name: 'Consulta Geral',
        description: 'Consultas gerais',
        queueType: 'GENERAL',
        capacity: 50,
        avgServiceTime: 900, // 15 minutos
      });

      // Paciente 1: Emergência (alta prioridade)
      const paciente1 = await testHelper.createTicket(triagem.id, {
        clientName: 'João Silva',
        clientPhone: '11999999999',
        priority: 5, // Máxima prioridade
        status: 'WAITING',
      });

      // Paciente 2: Consulta normal
      const paciente2 = await testHelper.createTicket(triagem.id, {
        clientName: 'Maria Santos',
        clientPhone: '11888888888',
        priority: 1,
        status: 'WAITING',
      });

      // Processar triagem - chamar próximo (deve ser o de alta prioridade)
      const triagemResponse = await testHelper
        .getRequest()
        .post(`/api/v1/tenants/${tenant.id}/queues/${triagem.id}/call-next`)
        .set('Authorization', `Bearer ${token}`)
        .expect(201);

      expect(triagemResponse.body.id).toBe(paciente1.id);

      // Completar triagem do paciente de emergência
      await testHelper
        .getRequest()
        .put(`/api/v1/tickets/${paciente1.id}/complete`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Criar novo ticket na fila de emergência
      const emergenciaTicket = await testHelper.createTicket(emergencia.id, {
        clientName: 'João Silva',
        clientPhone: '11999999999',
        priority: 5,
        status: 'WAITING',
      });

      // Verificar que foi direcionado corretamente
      expect(emergenciaTicket.queueId).toBe(emergencia.id);
    });

    it('deve gerenciar múltiplos contadores simultaneamente', async () => {
      const { tenant, token } =
        await testHelper.setupCompleteTestDataWithAuth();
      const queue = await testHelper.createQueue(tenant.id);

      // Criar múltiplos contadores com números únicos e pequenos
      const randomSuffix = Math.floor(Math.random() * 1000);
      const contador1 = await testHelper.createCounter(tenant.id, {
        name: 'Guichê 1',
        number: 100 + randomSuffix, // Número pequeno e único
      });

      const contador2 = await testHelper.createCounter(tenant.id, {
        name: 'Guichê 2',
        number: 200 + randomSuffix, // Número pequeno e único
      });

      // Criar vários tickets
      const tickets = [];
      for (let i = 0; i < 6; i++) {
        const ticket = await testHelper.createTicket(queue.id, {
          clientName: `Cliente ${i + 1}`,
          status: 'WAITING',
          priority: 1,
        });
        tickets.push(ticket);
      }

      // Simular atendimento em paralelo nos dois contadores
      // Contador 1 chama primeiro ticket
      const call1 = await testHelper
        .getRequest()
        .post(`/api/v1/tenants/${tenant.id}/queues/${queue.id}/call-next`)
        .set('Authorization', `Bearer ${token}`)
        .expect(201);

      // Contador 2 chama segundo ticket
      const call2 = await testHelper
        .getRequest()
        .post(`/api/v1/tenants/${tenant.id}/queues/${queue.id}/call-next`)
        .set('Authorization', `Bearer ${token}`)
        .expect(201);

      // Verificar que são tickets diferentes
      expect(call1.body.id).not.toBe(call2.body.id);
      expect([tickets[0].id, tickets[1].id]).toContain(call1.body.id);
      expect([tickets[0].id, tickets[1].id]).toContain(call2.body.id);
    });
  });

  describe('🏪 Retail Store Workflow', () => {
    it('deve processar fila de loja com diferentes tipos de atendimento', async () => {
      const { tenant, token } =
        await testHelper.setupCompleteTestDataWithAuth();

      // Filas especializadas de loja
      const caixa = await testHelper.createQueue(tenant.id, {
        name: 'Caixa',
        description: 'Pagamentos e vendas',
        queueType: 'GENERAL',
        capacity: 30,
        avgServiceTime: 300,
      });

      const atendimento = await testHelper.createQueue(tenant.id, {
        name: 'Atendimento ao Cliente',
        description: 'Dúvidas e reclamações',
        queueType: 'GENERAL',
        capacity: 15,
        avgServiceTime: 600,
      });

      const vip = await testHelper.createQueue(tenant.id, {
        name: 'Clientes VIP',
        description: 'Atendimento prioritário',
        queueType: 'VIP',
        capacity: 10,
        avgServiceTime: 900,
      });

      // Cliente regular no caixa
      const clienteRegular = await testHelper.createTicket(caixa.id, {
        clientName: 'Cliente Regular',
        clientPhone: '11111111111',
        priority: 1,
        status: 'WAITING',
      });

      // Cliente VIP
      const clienteVip = await testHelper.createTicket(vip.id, {
        clientName: 'Cliente VIP',
        clientPhone: '11222222222',
        priority: 3,
        status: 'WAITING',
      });

      // Cliente com problema
      const clienteProblema = await testHelper.createTicket(atendimento.id, {
        clientName: 'Cliente com Problema',
        clientPhone: '11333333333',
        priority: 2,
        status: 'WAITING',
      });

      // Verificar status das filas
      const statusCaixa = await testHelper
        .getRequest()
        .get(`/api/v1/queues/${caixa.id}/status`)
        .expect(200);

      const statusVip = await testHelper
        .getRequest()
        .get(`/api/v1/queues/${vip.id}/status`)
        .expect(200);

      expect(statusCaixa.body.totalWaiting).toBe(1);
      expect(statusVip.body.totalWaiting).toBe(1);
    });

    it('deve processar devoluções com prioridade especial', async () => {
      const { tenant, token } =
        await testHelper.setupCompleteTestDataWithAuth();
      const queue = await testHelper.createQueue(tenant.id, {
        name: 'Devoluções',
        queueType: 'PRIORITY',
      });

      // Cliente com devolução urgente
      const devolucaoUrgente = await testHelper.createTicket(queue.id, {
        clientName: 'Devolução Urgente',
        clientPhone: '11444444444',
        priority: 4, // Alta prioridade
        status: 'WAITING',
      });

      // Cliente com devolução normal
      const devolucaoNormal = await testHelper.createTicket(queue.id, {
        clientName: 'Devolução Normal',
        clientPhone: '11555555555',
        priority: 1,
        status: 'WAITING',
      });

      // Deve chamar a devolução urgente primeiro
      const response = await testHelper
        .getRequest()
        .post(`/api/v1/tenants/${tenant.id}/queues/${queue.id}/call-next`)
        .set('Authorization', `Bearer ${token}`)
        .expect(201);

      expect(response.body.id).toBe(devolucaoUrgente.id);
    });
  });

  describe('🏦 Bank Branch Workflow', () => {
    it('deve processar fila de banco com senhas preferenciais', async () => {
      const { tenant, token } =
        await testHelper.setupCompleteTestDataWithAuth();

      const filaGeral = await testHelper.createQueue(tenant.id, {
        name: 'Fila Geral',
        queueType: 'GENERAL',
        avgServiceTime: 480, // 8 minutos
      });

      const filaPreferencial = await testHelper.createQueue(tenant.id, {
        name: 'Fila Preferencial',
        queueType: 'PRIORITY',
        avgServiceTime: 480,
      });

      // Cliente comum
      const clienteComum = await testHelper.createTicket(filaGeral.id, {
        clientName: 'Cliente Comum',
        clientPhone: '11666666666',
        priority: 1,
        status: 'WAITING',
      });

      // Cliente preferencial (idoso/deficiente)
      const clientePreferencial = await testHelper.createTicket(
        filaPreferencial.id,
        {
          clientName: 'Cliente Preferencial',
          clientPhone: '11777777777',
          priority: 3,
          status: 'WAITING',
        },
      );

      // Deve dar prioridade ao cliente preferencial
      const response = await testHelper
        .getRequest()
        .post(
          `/api/v1/tenants/${tenant.id}/queues/${filaPreferencial.id}/call-next`,
        )
        .set('Authorization', `Bearer ${token}`)
        .expect(201);

      expect(response.body.id).toBe(clientePreferencial.id);
    });

    it('deve processar operações bancárias complexas', async () => {
      const { tenant, token } =
        await testHelper.setupCompleteTestDataWithAuth();

      const caixaRapido = await testHelper.createQueue(tenant.id, {
        name: 'Caixa Rápido',
        queueType: 'GENERAL',
        avgServiceTime: 180, // 3 minutos
        capacity: 20,
      });

      const gerencia = await testHelper.createQueue(tenant.id, {
        name: 'Gerência',
        queueType: 'VIP',
        avgServiceTime: 1200, // 20 minutos
        capacity: 5,
      });

      // Operação simples (caixa rápido)
      const operacaoSimples = await testHelper.createTicket(caixaRapido.id, {
        clientName: 'Operação Simples',
        clientPhone: '11888888888',
        priority: 1,
        status: 'WAITING',
      });

      // Operação complexa (gerência)
      const operacaoComplexa = await testHelper.createTicket(gerencia.id, {
        clientName: 'Operação Complexa',
        clientPhone: '11999999999',
        priority: 2,
        status: 'WAITING',
      });

      // Verificar estimativas diferentes
      const dashboardSimples = await testHelper
        .getRequest()
        .get('/api/v1/clients/dashboard')
        .query({ phone: '11888888888' })
        .expect(200);

      const dashboardComplexa = await testHelper
        .getRequest()
        .get('/api/v1/clients/dashboard')
        .query({ phone: '11999999999' })
        .expect(200);

      // Operação complexa deve ter tempo estimado maior
      expect(dashboardComplexa.body.summary.avgWaitTime).toBeGreaterThan(
        dashboardSimples.body.summary.avgWaitTime,
      );
    });
  });

  describe('🎭 Event Management Workflow', () => {
    it('deve gerenciar entrada de evento com diferentes tipos de ingresso', async () => {
      const { tenant, token } =
        await testHelper.setupCompleteTestDataWithAuth();

      const entradaVip = await testHelper.createQueue(tenant.id, {
        name: 'Entrada VIP',
        queueType: 'VIP',
        capacity: 50,
        avgServiceTime: 60, // 1 minuto
      });

      const entradaGeral = await testHelper.createQueue(tenant.id, {
        name: 'Entrada Geral',
        queueType: 'GENERAL',
        capacity: 200,
        avgServiceTime: 30, // 30 segundos
      });

      // Simular chegada de pessoas
      const vips = [];
      const gerais = [];

      for (let i = 0; i < 5; i++) {
        const vip = await testHelper.createTicket(entradaVip.id, {
          clientName: `VIP ${i + 1}`,
          status: 'WAITING',
          priority: 3,
        });
        vips.push(vip);
      }

      for (let i = 0; i < 20; i++) {
        const geral = await testHelper.createTicket(entradaGeral.id, {
          clientName: `Geral ${i + 1}`,
          status: 'WAITING',
          priority: 1,
        });
        gerais.push(geral);
      }

      // Verificar que VIP tem menos pessoas e atendimento mais rápido
      const statusVip = await testHelper
        .getRequest()
        .get(`/api/v1/queues/${entradaVip.id}/status`)
        .expect(200);

      const statusGeral = await testHelper
        .getRequest()
        .get(`/api/v1/queues/${entradaGeral.id}/status`)
        .expect(200);

      expect(statusVip.body.totalWaiting).toBe(5);
      expect(statusGeral.body.totalWaiting).toBe(20);
    });
  });

  describe('🔄 Complex State Transitions', () => {
    it('deve processar ticket que volta para fila após ser pulado', async () => {
      const { tenant, token } =
        await testHelper.setupCompleteTestDataWithAuth();
      const queue = await testHelper.createQueue(tenant.id);

      const ticket = await testHelper.createTicket(queue.id, {
        clientName: 'Cliente Problemático',
        status: 'WAITING',
      });

      // Chamar ticket
      await testHelper
        .getRequest()
        .post(`/api/v1/tenants/${tenant.id}/queues/${queue.id}/call-next`)
        .set('Authorization', `Bearer ${token}`)
        .expect(201);

      // Pular ticket (volta para WAITING)
      const skipResponse = await testHelper
        .getRequest()
        .put(`/api/v1/tickets/${ticket.id}/skip`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(skipResponse.body.status).toBe('WAITING');

      // Chamar novamente
      const recallResponse = await testHelper
        .getRequest()
        .post(`/api/v1/tenants/${tenant.id}/queues/${queue.id}/call-next`)
        .set('Authorization', `Bearer ${token}`)
        .expect(201);

      expect(recallResponse.body.id).toBe(ticket.id);
      expect(recallResponse.body.status).toBe('CALLED');
    });

    it('deve processar múltiplas tentativas de chamada', async () => {
      const { tenant, token } =
        await testHelper.setupCompleteTestDataWithAuth();
      const queue = await testHelper.createQueue(tenant.id);

      const ticket = await testHelper.createTicket(queue.id, {
        clientName: 'Cliente Múltiplas Chamadas',
        status: 'CALLED',
        calledAt: new Date(),
      });

      // Primeira rechamada
      const recall1 = await testHelper
        .getRequest()
        .put(`/api/v1/tickets/${ticket.id}/recall`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Verificar que a primeira rechamada funcionou
      expect(recall1.body.status).toBe('CALLED');
      expect(recall1.body.id).toBe(ticket.id);

      // Aguardar um pouco
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Segunda rechamada
      const recall2 = await testHelper
        .getRequest()
        .put(`/api/v1/tickets/${ticket.id}/recall`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Verificar que a segunda rechamada também funcionou
      expect(recall2.body.status).toBe('CALLED');
      expect(recall2.body.id).toBe(ticket.id);

      // Verificar que ambas as chamadas retornaram o mesmo ticket
      expect(recall1.body.id).toBe(recall2.body.id);
    });
  });
});
