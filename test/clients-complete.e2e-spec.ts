import { TestHelper } from './test-setup';

describe('Clients Complete E2E', () => {
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

  describe('👤 Client Profile Operations', () => {
    it('deve buscar tickets do cliente por telefone', async () => {
      const { tenant } = await testHelper.setupCompleteTestData();
      const queue = await testHelper.createQueue(tenant.id);

      const clientPhone = '11999999999';

      // Criar ticket para o cliente
      await testHelper.createTicket(queue.id, {
        clientName: 'Cliente Teste',
        clientPhone: clientPhone,
        status: 'WAITING',
      });

      const response = await testHelper
        .getRequest()
        .get('/api/v1/clients/my-tickets')
        .query({ phone: clientPhone })
        .expect(200);

      // A resposta é um objeto com client e tickets
      expect(response.body.client).toBeDefined();
      expect(response.body.tickets).toBeDefined();
      expect(Array.isArray(response.body.tickets)).toBe(true);
      expect(response.body.tickets.length).toBeGreaterThanOrEqual(1);
      expect(response.body.tickets[0]).toMatchObject({
        status: 'WAITING',
      });
      // Verificar que encontrou tickets para o cliente correto
      expect(response.body.client.identifier).toBe(clientPhone);
    });

    it('deve buscar tickets do cliente por email', async () => {
      const { tenant } = await testHelper.setupCompleteTestData();
      const queue = await testHelper.createQueue(tenant.id);

      const clientEmail = 'cliente@teste.com';

      // Criar ticket para o cliente
      await testHelper.createTicket(queue.id, {
        clientName: 'Cliente Email',
        clientEmail: clientEmail,
        status: 'WAITING',
      });

      const response = await testHelper
        .getRequest()
        .get('/api/v1/clients/my-tickets')
        .query({ email: clientEmail })
        .expect(200);

      // A resposta é um objeto com client e tickets
      expect(response.body.client).toBeDefined();
      expect(response.body.tickets).toBeDefined();
      expect(Array.isArray(response.body.tickets)).toBe(true);
      expect(response.body.tickets.length).toBeGreaterThanOrEqual(1);
      expect(response.body.tickets[0]).toMatchObject({
        status: 'WAITING',
      });
      // Verificar que encontrou tickets para o cliente correto
      expect(response.body.client.identifier).toBe(clientEmail);
    });
  });

  describe('📊 Client Dashboard', () => {
    it('deve retornar dashboard consolidado do cliente', async () => {
      const { tenant } = await testHelper.setupCompleteTestData();
      const queue1 = await testHelper.createQueue(tenant.id, {
        name: 'Fila 1',
      });
      const queue2 = await testHelper.createQueue(tenant.id, {
        name: 'Fila 2',
      });

      const clientPhone = '11888888888';

      // Criar múltiplos tickets em diferentes filas
      await testHelper.createTicket(queue1.id, {
        clientName: 'Cliente Dashboard',
        clientPhone: clientPhone,
        status: 'WAITING',
      });

      await testHelper.createTicket(queue2.id, {
        clientName: 'Cliente Dashboard',
        clientPhone: clientPhone,
        status: 'CALLED',
      });

      const response = await testHelper
        .getRequest()
        .get('/api/v1/clients/dashboard')
        .query({ phone: clientPhone })
        .expect(200);

      expect(response.body).toMatchObject({
        client: expect.objectContaining({
          identifier: clientPhone,
          totalActiveTickets: expect.any(Number),
        }),
        summary: expect.objectContaining({
          totalWaiting: expect.any(Number),
          totalCalled: expect.any(Number),
          establishmentsCount: expect.any(Number),
        }),
        tickets: expect.any(Array),
      });
    });

    it('deve calcular métricas em tempo real no dashboard', async () => {
      const { tenant } = await testHelper.setupCompleteTestData();
      const queue = await testHelper.createQueue(tenant.id, {
        avgServiceTime: 300, // 5 minutos
      });

      const clientPhone = '11777777777';

      // Criar ticket com posição na fila
      await testHelper.createTicket(queue.id, {
        clientName: 'Cliente Métricas',
        clientPhone: clientPhone,
        status: 'WAITING',
        priority: 1,
      });

      const response = await testHelper
        .getRequest()
        .get('/api/v1/clients/dashboard')
        .query({ phone: clientPhone })
        .expect(200);

      expect(response.body.realTimeMetrics).toBeDefined();
      expect(response.body.summary.avgWaitTime).toBeDefined();
      expect(response.body.summary.nextCallEstimate).toBeDefined();
    });
  });

  describe('📈 Queue Metrics for Clients', () => {
    it('deve retornar métricas de fila para clientes', async () => {
      const { tenant } = await testHelper.setupCompleteTestData();
      const queue = await testHelper.createQueue(tenant.id);

      // Criar alguns tickets para gerar métricas
      await testHelper.createTicket(queue.id, {
        clientName: 'Cliente 1',
        status: 'WAITING',
      });

      await testHelper.createTicket(queue.id, {
        clientName: 'Cliente 2',
        status: 'CALLED',
      });

      await testHelper.createTicket(queue.id, {
        clientName: 'Cliente 3',
        status: 'COMPLETED',
      });

      const response = await testHelper
        .getRequest()
        .get('/api/v1/clients/queue-metrics')
        .query({ queueId: queue.id })
        .expect(200);

      expect(response.body).toMatchObject({
        queue: expect.objectContaining({
          id: queue.id,
          name: expect.any(String),
        }),
        currentMetrics: expect.objectContaining({
          serviceSpeed: expect.any(Number),
          trendDirection: expect.any(String),
        }),
        predictions: expect.objectContaining({
          nextCallIn: expect.any(Number),
        }),
      });
    });

    it('deve filtrar métricas por tenant', async () => {
      const tenant1 = await testHelper.createTenant();
      const tenant2 = await testHelper.createTenant();

      const queue1 = await testHelper.createQueue(tenant1.id);
      const queue2 = await testHelper.createQueue(tenant2.id);

      // Criar tickets em ambos os tenants
      await testHelper.createTicket(queue1.id, {
        clientName: 'Cliente Tenant 1',
        status: 'WAITING',
      });

      await testHelper.createTicket(queue2.id, {
        clientName: 'Cliente Tenant 2',
        status: 'WAITING',
      });

      // Buscar métricas da fila do tenant 1
      const response = await testHelper
        .getRequest()
        .get('/api/v1/clients/queue-metrics')
        .query({ queueId: queue1.id })
        .expect(200);

      expect(response.body.queue.id).toBe(queue1.id);
      // Deve retornar apenas dados do tenant correto
    });
  });

  describe('🔐 Client Security & Validation', () => {
    it('deve validar parâmetros obrigatórios para busca de tickets', async () => {
      // Tentar buscar tickets sem telefone nem email
      await testHelper
        .getRequest()
        .get('/api/v1/clients/my-tickets')
        .expect(400);
    });

    it('deve retornar 404 para cliente sem tickets', async () => {
      await testHelper
        .getRequest()
        .get('/api/v1/clients/my-tickets')
        .query({ phone: '11000000000' }) // Telefone que não tem tickets
        .expect(404);
    });

    it('deve sanitizar dados de entrada', async () => {
      const maliciousPhone = '11999999999; DROP TABLE tickets;';

      await testHelper
        .getRequest()
        .get('/api/v1/clients/my-tickets')
        .query({ phone: maliciousPhone })
        .expect(404); // Não deve encontrar tickets com dados maliciosos
    });
  });

  describe('🌐 Multi-tenant Client Data', () => {
    it('deve isolar dados de clientes entre tenants', async () => {
      const tenant1 = await testHelper.createTenant();
      const tenant2 = await testHelper.createTenant();

      const queue1 = await testHelper.createQueue(tenant1.id);
      const queue2 = await testHelper.createQueue(tenant2.id);

      const clientPhone = '11555555555';

      // Mesmo cliente em diferentes tenants
      await testHelper.createTicket(queue1.id, {
        clientName: 'Cliente Multi-tenant',
        clientPhone: clientPhone,
        status: 'WAITING',
      });

      await testHelper.createTicket(queue2.id, {
        clientName: 'Cliente Multi-tenant',
        clientPhone: clientPhone,
        status: 'CALLED',
      });

      const response = await testHelper
        .getRequest()
        .get('/api/v1/clients/my-tickets')
        .query({ phone: clientPhone })
        .expect(200);

      // Deve retornar tickets de ambos os tenants
      expect(response.body.client).toBeDefined();
      expect(response.body.tickets).toBeDefined();
      expect(Array.isArray(response.body.tickets)).toBe(true);
      expect(response.body.tickets.length).toBe(2);

      // Verificar que temos tickets de diferentes tenants
      const tenantIds = response.body.tickets.map(
        (ticket: any) => ticket.queue.tenant?.id,
      );
      expect(tenantIds.filter(Boolean)).toContain(tenant1.id);
      expect(tenantIds.filter(Boolean)).toContain(tenant2.id);
    });
  });

  describe('⏱️ Real-time Client Updates', () => {
    it('deve fornecer estimativas precisas de tempo de espera', async () => {
      const { tenant } = await testHelper.setupCompleteTestData();
      const queue = await testHelper.createQueue(tenant.id, {
        avgServiceTime: 600, // 10 minutos por atendimento
        capacity: 50,
      });

      const clientPhone = '11666666666';

      // Criar vários tickets antes do cliente para simular fila
      for (let i = 0; i < 5; i++) {
        await testHelper.createTicket(queue.id, {
          clientName: `Cliente ${i}`,
          status: 'WAITING',
          priority: 1,
        });
      }

      // Ticket do cliente
      await testHelper.createTicket(queue.id, {
        clientName: 'Cliente Final',
        clientPhone: clientPhone,
        status: 'WAITING',
        priority: 1,
      });

      const response = await testHelper
        .getRequest()
        .get('/api/v1/clients/dashboard')
        .query({ phone: clientPhone })
        .expect(200);

      expect(response.body.summary.nextCallEstimate).toBeGreaterThan(0);
      expect(response.body.realTimeMetrics.currentServiceSpeed).toBeDefined();
    });
  });
});
