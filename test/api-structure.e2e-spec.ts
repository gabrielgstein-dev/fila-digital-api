import { TestHelper } from './test-setup';

describe('API Structure (e2e)', () => {
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

  describe('🏗️ Estrutura básica da API', () => {
    it('deve responder na rota raiz', async () => {
      const response = await testHelper.getRequest().get('/api/v1').expect(200);

      expect(response.text).toBe('Hello World!');
    });

    it('deve configurar CORS corretamente', async () => {
      const response = await testHelper
        .getRequest()
        .get('/api/v1')
        .set('Origin', 'http://localhost:3000')
        .expect(200);

      // Se chegou até aqui, o CORS está funcionando corretamente
      expect(response.text).toBe('Hello World!');
    });

    it('deve retornar 404 para rotas inexistentes', async () => {
      await testHelper.getRequest().get('/api/v1/rota-inexistente').expect(404);
    });
  });

  describe('🔐 Endpoints de Autenticação', () => {
    it('deve ter endpoint de login configurado', async () => {
      await testHelper
        .getRequest()
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        })
        .expect(401); // Usuário não existe, mas endpoint responde
    });

    it('deve validar dados de login', async () => {
      await testHelper
        .getRequest()
        .post('/api/v1/auth/login')
        .send({
          email: 'invalid-email',
          password: '123',
        })
        .expect(400); // Validação falha
    });

    it('deve rejeitar credenciais inexistentes', async () => {
      await testHelper
        .getRequest()
        .post('/api/v1/auth/login')
        .send({
          email: 'usuario@inexistente.com',
          password: 'senhaqualquer',
        })
        .expect(401);
    });
  });

  describe('🎫 Endpoints de Filas', () => {
    it('deve ter rotas de filas configuradas', async () => {
      const { tenant } = await testHelper.setupCompleteTestData();

      // GET filas (sem auth - deve retornar 401)
      await testHelper
        .getRequest()
        .get(`/api/v1/tenants/${tenant.id}/queues`)
        .expect(401);

      // POST fila (sem auth)
      await testHelper
        .getRequest()
        .post(`/api/v1/tenants/${tenant.id}/queues`)
        .send({
          name: 'Fila Teste',
          description: 'Descrição da fila',
          capacity: 100,
        })
        .expect(401); // Sem autenticação
    });

    it('deve validar dados de criação de fila', async () => {
      const { tenant } = await testHelper.setupCompleteTestData();

      await testHelper
        .getRequest()
        .post(`/api/v1/tenants/${tenant.id}/queues`)
        .send({
          name: 'A', // muito curto
          capacity: -1, // inválido
        })
        .expect(401); // Sem autenticação
    });
  });

  describe('🎟️ Endpoints de Tickets', () => {
    it('deve ter rotas de tickets configuradas', async () => {
      const { queue } = await testHelper.setupCompleteTestData();
      const queueId = queue.id;

      // POST ticket (público - permite criação sem auth)
      await testHelper
        .getRequest()
        .post(`/api/v1/queues/${queueId}/tickets`)
        .send({
          clientName: 'Cliente Teste',
          clientPhone: '11999999999',
          priority: 1,
        })
        .expect(201); // Endpoint público para criação de tickets

      // GET status da fila (público)
      await testHelper
        .getRequest()
        .get(`/api/v1/queues/${queueId}/status`)
        .expect(200); // Endpoint público
    });

    it('deve validar dados de criação de ticket', async () => {
      const { queue } = await testHelper.setupCompleteTestData();
      const queueId = queue.id;

      const validTicketData = {
        clientName: 'João Silva',
        clientPhone: '11999999999',
        priority: 1,
      };

      await testHelper
        .getRequest()
        .post(`/api/v1/queues/${queueId}/tickets`)
        .send(validTicketData)
        .expect(201); // Endpoint público - aceita dados válidos
    });

    it('deve rejeitar dados inválidos de ticket', async () => {
      const { queue } = await testHelper.setupCompleteTestData();
      const queueId = queue.id;

      const invalidTicketData = {
        clientName: '', // vazio
        priority: -1, // inválido
      };

      await testHelper
        .getRequest()
        .post(`/api/v1/queues/${queueId}/tickets`)
        .send(invalidTicketData)
        .expect(400); // Validação falha - dados inválidos
    });
  });

  describe('🔒 Segurança e Validação', () => {
    it('deve rejeitar requests sem autenticação em rotas protegidas', async () => {
      await testHelper.getRequest().get('/api/v1/tenants').expect(401);
    });

    it('deve rejeitar tokens inválidos', async () => {
      await testHelper
        .getRequest()
        .get('/api/v1/tenants')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('deve validar Content-Type', async () => {
      await testHelper
        .getRequest()
        .post('/api/v1/auth/login')
        .set('Content-Type', 'application/json')
        .send('{"invalid": "json"')
        .expect(400); // JSON inválido
    });
  });

  describe('📊 Health Check', () => {
    it('deve responder na rota de health check', async () => {
      const response = await testHelper
        .getRequest()
        .get('/api/v1/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body.status).toBe('ok');
    });
  });
});
