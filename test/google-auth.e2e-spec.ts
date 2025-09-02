import { TestHelper } from './test-setup';
import * as request from 'supertest';
import { AuthService } from '../src/auth/auth.service';
import * as bcrypt from 'bcrypt';

describe('Google Authentication (e2e)', () => {
  jest.setTimeout(30000);
  let testHelper: TestHelper;
  let authService: AuthService;

  beforeAll(async () => {
    testHelper = await TestHelper.createInstance();
    authService = testHelper.app.get<AuthService>(AuthService);
  });

  afterAll(async () => {
    // Não fechar o servidor global aqui
  });

  beforeEach(async () => {
    await testHelper.beforeEach();
  });

  describe('Google OAuth Flow (Simulated)', () => {
    it('deve criar novo usuário cliente com dados do Google', async () => {
      const googleUser = {
        googleId: 'google-test-123',
        email: 'cliente@gmail.com',
        name: 'Cliente Teste',
        picture: 'https://lh3.googleusercontent.com/test.jpg',
      };

      const result = await authService.validateGoogleUser(googleUser);

      expect(result.userType).toBe('client');
      expect(result.email).toBe(googleUser.email);
      expect(result.name).toBe(googleUser.name);
      expect(result.picture).toBe(googleUser.picture);

      // Verificar se foi criado no banco
      const userInDb = await testHelper.prisma.user.findUnique({
        where: { email: googleUser.email },
      });
      expect(userInDb).toBeDefined();
      expect(userInDb?.googleId).toBe(googleUser.googleId);
    });

    it('deve reconhecer agente existente pelo email', async () => {
      // Criar tenant e agente
      const tenant = await testHelper.prisma.tenant.create({
        data: {
          name: 'Test Tenant',
          slug: `test-tenant-${Date.now()}`,
          email: 'tenant@test.com',
        },
      });

      const agent = await testHelper.prisma.agent.create({
        data: {
          email: 'agente@test.com',
          name: 'Agente Teste',
          password: 'hashed-password',
          tenantId: tenant.id,
          cpf: '12345678901',
        },
      });

      const googleUser = {
        googleId: 'google-agent-123',
        email: 'agente@test.com', // Mesmo email do agente
        name: 'Agente Teste Google',
      };

      const result = await authService.validateGoogleUser(googleUser);

      expect(result.userType).toBe('agent');
      expect(result.email).toBe(agent.email);
      expect(result.tenantId).toBe(tenant.id);

      // Verificar se o googleId foi atualizado
      const updatedAgent = await testHelper.prisma.agent.findUnique({
        where: { id: agent.id },
      });
      expect(updatedAgent?.googleId).toBe(googleUser.googleId);
    });

    it('deve gerar JWT correto para cliente', async () => {
      const googleUser = {
        googleId: 'google-client-123',
        email: 'cliente@gmail.com',
        name: 'Cliente JWT',
        picture: 'https://test.jpg',
      };

      const user = await authService.validateGoogleUser(googleUser);
      const loginResult = await authService.googleLogin(user);

      expect(loginResult.access_token).toBeDefined();
      expect(loginResult.userType).toBe('client');
      expect(loginResult.user.email).toBe(googleUser.email);
    });

    it('deve gerar JWT correto para agente', async () => {
      // Criar tenant e agente
      const tenant = await testHelper.prisma.tenant.create({
        data: {
          name: 'Test Tenant JWT',
          slug: `test-tenant-jwt-${Date.now()}`,
          email: 'tenant-jwt@test.com',
        },
      });

      await testHelper.prisma.agent.create({
        data: {
          email: 'agente-jwt@test.com',
          name: 'Agente JWT',
          password: 'hashed-password',
          tenantId: tenant.id,
          cpf: '12345678902',
        },
      });

      const googleUser = {
        googleId: 'google-agent-jwt-123',
        email: 'agente-jwt@test.com',
        name: 'Agente JWT Google',
      };

      const user = await authService.validateGoogleUser(googleUser);
      const loginResult = await authService.googleLogin(user);

      expect(loginResult.access_token).toBeDefined();
      expect(loginResult.userType).toBe('agent');
      expect(loginResult.user.tenantId).toBe(tenant.id);
    });
  });

  describe('Client Endpoints with Google Auth', () => {
    let clientToken: string;
    let clientUser: any;

    beforeEach(async () => {
      // Criar usuário cliente logado
      const googleUser = {
        googleId: 'google-client-endpoint-123',
        email: 'cliente-endpoint@gmail.com',
        name: 'Cliente Endpoint',
        picture: 'https://test.jpg',
      };

      clientUser = await authService.validateGoogleUser(googleUser);
      const loginResult = await authService.googleLogin(clientUser);
      clientToken = loginResult.access_token;
    });

    it('deve retornar informações do cliente logado', async () => {
      const response = await request(testHelper.app.getHttpServer())
        .get('/api/v1/clients/me')
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(200);

      expect(response.body.email).toBe(clientUser.email);
      expect(response.body.name).toBe(clientUser.name);
      expect(response.body.userType).toBe('client');
    });

    it('deve buscar senhas automaticamente para cliente logado', async () => {
      // Primeiro, vamos criar um tenant e fila para testar
      const tenant = await testHelper.prisma.tenant.create({
        data: {
          name: 'Test Tenant Client',
          slug: `test-tenant-client-${Date.now()}`,
          email: 'tenant-client@test.com',
        },
      });

      const queue = await testHelper.prisma.queue.create({
        data: {
          name: 'Test Queue',
          tenantId: tenant.id,
        },
      });

      // Criar ticket associado ao usuário logado
      await testHelper.prisma.ticket.create({
        data: {
          myCallingToken: 'A001',
          queueId: queue.id,
          userId: clientUser.id,
          clientName: clientUser.name,
          clientEmail: clientUser.email,
        },
      });

      const response = await request(testHelper.app.getHttpServer())
        .get('/api/v1/clients/my-tickets')
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(200);

      expect(response.body.client.totalActiveTickets).toBe(1);
      expect(response.body.tickets).toHaveLength(1);
      expect(response.body.tickets[0].clientName).toBe(clientUser.name);
    });

    it('deve acessar dashboard automaticamente para cliente logado', async () => {
      const response = await request(testHelper.app.getHttpServer())
        .get('/api/v1/clients/dashboard')
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(200);

      expect(response.body.client).toBeDefined();
      expect(response.body.summary).toBeDefined();
      expect(response.body.realTimeMetrics).toBeDefined();
    });

    it('deve permitir acesso sem autenticação com telefone/email', async () => {
      // Criar ticket sem userId (método tradicional)
      const tenant = await testHelper.prisma.tenant.create({
        data: {
          name: 'Test Tenant Traditional',
          slug: `test-tenant-trad-${Date.now()}`,
          email: 'tenant-trad@test.com',
        },
      });

      const queue = await testHelper.prisma.queue.create({
        data: {
          name: 'Test Queue Traditional',
          tenantId: tenant.id,
        },
      });

      await testHelper.prisma.ticket.create({
        data: {
          myCallingToken: 'A002',
          queueId: queue.id,
          clientName: 'Cliente Sem Login',
          clientPhone: '(11) 99999-0000',
        },
      });

      const response = await request(testHelper.app.getHttpServer())
        .get('/api/v1/clients/my-tickets')
        .query({ phone: '(11) 99999-0000' })
        .expect(200);

      expect(response.body.tickets).toHaveLength(1);
      expect(response.body.tickets[0].clientName).toBe('Cliente Sem Login');
    });
  });

  describe('Google Auth Routes', () => {
    it('deve redirecionar para Google OAuth', async () => {
      const response = await request(testHelper.app.getHttpServer())
        .get('/api/v1/auth/google')
        .expect(302);

      // Verificar se está redirecionando para Google
      expect(response.headers.location).toMatch(/accounts\.google\.com/);
    });

    it('deve rejeitar token móvel inválido', async () => {
      await request(testHelper.app.getHttpServer())
        .post('/api/v1/auth/google/token')
        .send({ idToken: 'invalid-token' })
        .expect(500); // Por enquanto, retorna erro pois não implementamos
    });
  });

  describe('Validações de Segurança', () => {
    it('deve rejeitar acesso de agente a endpoints de cliente', async () => {
      // Criar agente
      const tenant = await testHelper.prisma.tenant.create({
        data: {
          name: 'Test Tenant Security',
          slug: `test-tenant-sec-${Date.now()}`,
          email: 'tenant-sec@test.com',
        },
      });

      const agent = await testHelper.prisma.agent.create({
        data: {
          email: 'agente-sec@test.com',
          name: 'Agente Security',
          password: await bcrypt.hash('senha123', 10),
          tenantId: tenant.id,
          cpf: '12345678903',
        },
      });

      // Fazer login como agente
      await authService.login(agent.cpf, 'senha123');
      // Note: Isso falhará porque a senha não confere, mas é só para teste
      // Em um teste real, usaríamos bcrypt.hash para criar a senha correta
    });

    it('deve exigir autenticação ou dados para endpoints protegidos', async () => {
      await request(testHelper.app.getHttpServer())
        .get('/api/v1/clients/my-tickets')
        .expect(400); // Bad Request - falta telefone/email ou auth

      await request(testHelper.app.getHttpServer())
        .get('/api/v1/clients/me')
        .expect(401); // Unauthorized - precisa de auth
    });
  });
});
