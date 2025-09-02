import { TestHelper } from './test-setup';

describe('AuthController (e2e)', () => {
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

  describe('/auth/agent/login (POST)', () => {
    it('deve fazer login com credenciais válidas', async () => {
      const { agent, token } = await testHelper.setupCompleteTestDataWithAuth();

      const response = await testHelper
        .getRequest()
        .post('/api/v1/auth/agent/login')
        .send({
          cpf: agent.cpf,
          password: 'senha123',
        })
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(agent.email);
      expect(response.body.user.cpf).toBe(agent.cpf);
      expect(response.body.user.role).toBe('ADMINISTRADOR');
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('deve rejeitar login com senha incorreta', async () => {
      const { agent } = await testHelper.setupCompleteTestData();

      await testHelper
        .getRequest()
        .post('/api/v1/auth/agent/login')
        .send({
          cpf: agent.cpf,
          password: 'senhaerrada',
        })
        .expect(401);
    });

    it('deve rejeitar login com dados inválidos', async () => {
      await testHelper
        .getRequest()
        .post('/api/v1/auth/agent/login')
        .send({
          cpf: 'cpf-invalido',
          password: '123',
        })
        .expect(400);
    });

    it('deve rejeitar login de agente inativo', async () => {
      const { agent } = await testHelper.setupCompleteTestData();

      await testHelper.prisma.agent.update({
        where: { id: agent.id },
        data: { isActive: false },
      });

      await testHelper
        .getRequest()
        .post('/api/v1/auth/agent/login')
        .send({
          cpf: agent.cpf,
          password: 'senha123',
        })
        .expect(401);
    });

    it('deve rejeitar login com CPF inválido', async () => {
      await testHelper
        .getRequest()
        .post('/api/v1/auth/agent/login')
        .send({
          cpf: '12345678901',
          password: 'senha123',
        })
        .expect(401);
    });
  });

  describe('/auth/login (POST) - Corporate User', () => {
    it('deve fazer login de usuário corporativo com credenciais válidas', async () => {
      const tenant = await testHelper.createTenant();
      const user = await testHelper.createCorporateUser(tenant.id, {
        role: 'ADMINISTRADOR',
      });

      const response = await testHelper
        .getRequest()
        .post('/api/v1/auth/login')
        .send({
          email: user.email,
          password: 'senha123',
        })
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(user.email);
      expect(response.body.user.role).toBe('ADMINISTRADOR');
    });
  });
});
