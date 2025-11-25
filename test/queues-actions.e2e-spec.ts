import { TestHelper } from './test-setup';

describe('Queues Actions E2E', () => {
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

  describe('📞 Queue Call Operations', () => {
    it('deve chamar o próximo ticket da fila', async () => {
      const { tenant, token } =
        await testHelper.setupCompleteTestDataWithAuth();
      const queue = await testHelper.createQueue(tenant.id);

      // Criar alguns tickets na fila
      const ticket1 = await testHelper.createTicket(queue.id, {
        status: 'WAITING',
        clientName: 'Cliente 1',
        priority: 1,
      });

      const response = await testHelper
        .getRequest()
        .post(`/api/v1/tenants/${tenant.id}/queues/${queue.id}/call-next`)
        .set('Authorization', `Bearer ${token}`)
        .expect(201);

      // A resposta é o ticket diretamente, não um objeto com success
      expect(response.body).toMatchObject({
        id: ticket1.id,
        status: 'CALLED',
        calledAt: expect.any(String), // Timestamp como string ISO
      });
    });

    it('deve rechamar o ticket atual da fila', async () => {
      const { tenant, token } =
        await testHelper.setupCompleteTestDataWithAuth();
      const queue = await testHelper.createQueue(tenant.id);

      // Criar ticket e colocá-lo como chamado
      const ticket = await testHelper.createTicket(queue.id, {
        status: 'CALLED',
        clientName: 'Cliente Recall',
        calledAt: new Date(),
      });

      const response = await testHelper
        .getRequest()
        .post(`/api/v1/tenants/${tenant.id}/queues/${queue.id}/recall`)
        .set('Authorization', `Bearer ${token}`)
        .expect(201);

      // A resposta contém message e ticket
      expect(response.body).toMatchObject({
        message: expect.stringContaining('rechamado'),
        ticket: expect.objectContaining({
          id: ticket.id,
          status: 'CALLED',
          calledAt: expect.any(String), // Timestamp como string ISO
        }),
      });
    });

    it('deve gerar QR Code para a fila', async () => {
      const { tenant } = await testHelper.setupCompleteTestData();
      const queue = await testHelper.createQueue(tenant.id);

      const response = await testHelper
        .getRequest()
        .get(`/api/v1/queues/${queue.id}/qrcode`)
        .expect(200);

      expect(response.body).toMatchObject({
        qrCodeUrl: expect.stringContaining(queue.id),
      });
    });
  });

  describe('🔒 Queue Actions Security', () => {
    it('deve impedir ações sem autenticação', async () => {
      const { tenant } = await testHelper.setupCompleteTestData();
      const queue = await testHelper.createQueue(tenant.id);

      // Call next sem auth
      await testHelper
        .getRequest()
        .post(`/api/v1/tenants/${tenant.id}/queues/${queue.id}/call-next`)
        .expect(401);

      // Recall sem auth
      await testHelper
        .getRequest()
        .post(`/api/v1/tenants/${tenant.id}/queues/${queue.id}/recall`)
        .expect(401);
    });

    it('deve validar permissões por role', async () => {
      const { tenant } = await testHelper.setupCompleteTestData();
      const queue = await testHelper.createQueue(tenant.id);

      // Criar agente OPERADOR
      const operador = await testHelper.createAgent(tenant.id, {
        role: 'OPERADOR',
        email: `operador-${Date.now()}@empresa.com`,
      });
      const operadorToken = await testHelper.loginAgent(
        operador.cpf,
        'senha123',
      );

      // OPERADOR deve conseguir chamar próximo
      await testHelper.createTicket(queue.id, { status: 'WAITING' });

      await testHelper
        .getRequest()
        .post(`/api/v1/tenants/${tenant.id}/queues/${queue.id}/call-next`)
        .set('Authorization', `Bearer ${operadorToken}`)
        .expect(201);
    });
  });

  describe('📊 Queue Actions Business Logic', () => {
    it('deve retornar erro quando não há tickets para chamar', async () => {
      const { tenant, token } =
        await testHelper.setupCompleteTestDataWithAuth();
      const queue = await testHelper.createQueue(tenant.id);

      // Fila vazia - pode retornar 404 se não há tickets
      const response = await testHelper
        .getRequest()
        .post(`/api/v1/tenants/${tenant.id}/queues/${queue.id}/call-next`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('deve manter estatísticas da fila atualizadas', async () => {
      const { tenant, token } =
        await testHelper.setupCompleteTestDataWithAuth();
      const queue = await testHelper.createQueue(tenant.id);

      // Criar alguns tickets
      await testHelper.createTicket(queue.id, { status: 'WAITING' });
      await testHelper.createTicket(queue.id, { status: 'WAITING' });

      // Chamar um ticket
      await testHelper
        .getRequest()
        .post(`/api/v1/tenants/${tenant.id}/queues/${queue.id}/call-next`)
        .set('Authorization', `Bearer ${token}`)
        .expect(201);

      // Verificar status da fila
      const statusResponse = await testHelper
        .getRequest()
        .get(`/api/v1/queues/${queue.id}/status`)
        .expect(200);

      expect(statusResponse.body).toMatchObject({
        totalWaiting: 1, // Um foi chamado
      });
      // Verificar que a resposta tem dados da fila
      expect(statusResponse.body).toBeDefined();
    });
  });
});
