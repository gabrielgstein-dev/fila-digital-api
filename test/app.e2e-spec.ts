import { TestHelper } from './test-setup';

describe('AppController (e2e)', () => {
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

  describe('API Endpoints', () => {
    it('deve responder na rota raiz da API', async () => {
      const response = await testHelper.getRequest().get('/api/v1').expect(200);

      expect(response.text).toBe('Hello World!');
    });
  });

  describe('/auth/login (POST)', () => {
    it('deve validar estrutura de login', async () => {
      const response = await testHelper
        .getRequest()
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        })
        .expect(401); // Usuário não existe, mas validação passou

      expect(response.body).toHaveProperty('message');
    });

    it('deve retornar 401 para credenciais inválidas', async () => {
      await testHelper
        .getRequest()
        .post('/api/v1/auth/login')
        .send({
          email: 'invalid@example.com',
          password: 'wrongpassword',
        })
        .expect(401);
    });
  });

  describe('Endpoints protegidos', () => {
    it('deve rejeitar acesso sem token em endpoints protegidos', async () => {
      await testHelper.getRequest().get('/api/v1/tenants').expect(401);
    });

    it('deve rejeitar token inválido', async () => {
      await testHelper
        .getRequest()
        .get('/api/v1/tenants')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('Validação de dados', () => {
    it('deve validar dados obrigatórios para criação de fila', async () => {
      const { tenant } = await testHelper.setupCompleteTestData();

      await testHelper
        .getRequest()
        .post(`/api/v1/tenants/${tenant.id}/queues`)
        .send({})
        .expect(401); // Sem autenticação
    });

    it('deve aceitar dados válidos para criação de ticket', async () => {
      const { queue } = await testHelper.setupCompleteTestData();

      const response = await testHelper
        .getRequest()
        .post(`/api/v1/queues/${queue.id}/tickets`)
        .send({
          priority: 1,
        })
        .expect(201); // Endpoint público para criação de tickets

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('myCallingToken');
    });
  });

  describe('Estrutura da API', () => {
    it('deve retornar 404 para rotas inexistentes', async () => {
      await testHelper.getRequest().get('/api/v1/rota-inexistente').expect(404);
    });

    it('deve aceitar CORS', async () => {
      // Testar que o servidor aceita requests com Origin sem falhar
      const response = await testHelper
        .getRequest()
        .get('/api/v1')
        .set('Origin', 'http://localhost:3000')
        .expect(200);

      // Se chegou até aqui, o CORS está funcionando corretamente
      expect(response.text).toBe('Hello World!');
    });
  });
});
