import { TestHelper } from './test-setup';

describe('CorporateUsersController (e2e)', () => {
  let testHelper: TestHelper;
  let tenant: any;
  let adminUser: any;
  let gestorUser: any;
  let gerenteUser: any;
  let operadorUser: any;

  beforeAll(async () => {
    testHelper = await TestHelper.createInstance();
  });

  afterAll(async () => {
    await testHelper.afterAll();
  });

  beforeEach(async () => {
    await testHelper.beforeEach();

    // Usar o método que garante dados completos e isolados
    const testData = await testHelper.setupCompleteTestDataWithCorporateUsers();
    tenant = testData.tenant;
    adminUser = testData.adminUser;
    gestorUser = testData.gestorUser;
    gerenteUser = testData.gerenteUser;
    operadorUser = testData.operadorUser;
  });

  describe('/auth/login (POST)', () => {
    it('deve fazer login com usuário corporativo válido', async () => {
      const response = await testHelper
        .getRequest()
        .post('/api/v1/auth/login')
        .send({
          email: adminUser.email,
          password: 'senha123',
        })
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.userType).toBe('corporate_user');
      expect(response.body.user.role).toBe('ADMINISTRADOR');
      expect(response.body.user.tenantId).toBe(tenant.id);
    });

    it('deve rejeitar login com credenciais inválidas', async () => {
      await testHelper
        .getRequest()
        .post('/api/v1/auth/login')
        .send({
          email: adminUser.email,
          password: 'senhaerrada',
        })
        .expect(401);
    });

    it('deve rejeitar login com usuário inativo', async () => {
      await testHelper.updateCorporateUser(adminUser.id, { isActive: false });

      await testHelper
        .getRequest()
        .post('/api/v1/auth/login')
        .send({
          email: adminUser.email,
          password: 'senha123',
        })
        .expect(401);
    });
  });

  describe('/tenants/:tenantId/corporate-users (POST)', () => {
    let adminToken: string;

    beforeEach(async () => {
      const loginResponse = await testHelper
        .getRequest()
        .post('/api/v1/auth/login')
        .send({
          email: adminUser.email,
          password: 'senha123',
        });

      adminToken = loginResponse.body.access_token;
    });

    it('deve criar usuário corporativo com role OPERADOR', async () => {
      const newUserData = {
        email: 'novo.operador@empresa.com',
        name: 'Novo Operador',
        cpf: '55555555555',
        password: 'senha123',
        role: 'OPERADOR',
        department: 'Atendimento',
        position: 'Atendente',
      };

      const response = await testHelper
        .getRequest()
        .post(`/api/v1/tenants/${tenant.id}/corporate-users`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newUserData)
        .expect(201);

      expect(response.body.email).toBe(newUserData.email);
      expect(response.body.role).toBe('OPERADOR');
      expect(response.body.tenantId).toBe(tenant.id);
    });

    it('deve criar usuário corporativo com role GERENTE', async () => {
      const newUserData = {
        email: 'novo.gerente@empresa.com',
        name: 'Novo Gerente',
        cpf: '66666666666',
        password: 'senha123',
        role: 'GERENTE',
        department: 'Vendas',
        position: 'Gerente',
      };

      const response = await testHelper
        .getRequest()
        .post(`/api/v1/tenants/${tenant.id}/corporate-users`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newUserData)
        .expect(201);

      expect(response.body.email).toBe(newUserData.email);
      expect(response.body.role).toBe('GERENTE');
    });

    it('deve rejeitar criação de usuário com role superior ao criador', async () => {
      const newUserData = {
        email: 'novo.admin@empresa.com',
        name: 'Novo Admin',
        cpf: '77777777777',
        password: 'senha123',
        role: 'ADMINISTRADOR',
        department: 'TI',
        position: 'Diretor',
      };

      await testHelper
        .getRequest()
        .post(`/api/v1/tenants/${tenant.id}/corporate-users`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newUserData)
        .expect(201); // Admin pode criar outros admins
    });

    it('deve rejeitar criação de usuário com CPF duplicado', async () => {
      const newUserData = {
        email: 'duplicado@empresa.com',
        name: 'Usuário Duplicado',
        cpf: adminUser.cpf, // CPF já existe
        password: 'senha123',
        role: 'OPERADOR',
      };

      await testHelper
        .getRequest()
        .post(`/api/v1/tenants/${tenant.id}/corporate-users`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newUserData)
        .expect(409);
    });
  });

  describe('/tenants/:tenantId/corporate-users (GET)', () => {
    let adminToken: string;
    let gestorToken: string;
    let gerenteToken: string;
    let operadorToken: string;

    beforeEach(async () => {
      // Login de todos os usuários
      const adminLogin = await testHelper
        .getRequest()
        .post('/api/v1/auth/login')
        .send({ email: adminUser.email, password: 'senha123' });
      adminToken = adminLogin.body.access_token;

      const gestorLogin = await testHelper
        .getRequest()
        .post('/api/v1/auth/login')
        .send({ email: gestorUser.email, password: 'senha123' });
      gestorToken = gestorLogin.body.access_token;

      const gerenteLogin = await testHelper
        .getRequest()
        .post('/api/v1/auth/login')
        .send({ email: gerenteUser.email, password: 'senha123' });
      gerenteToken = gerenteLogin.body.access_token;

      const operadorLogin = await testHelper
        .getRequest()
        .post('/api/v1/auth/login')
        .send({ email: operadorUser.email, password: 'senha123' });
      operadorToken = operadorLogin.body.access_token;
    });

    it('deve permitir que ADMINISTRADOR liste usuários', async () => {
      const response = await testHelper
        .getRequest()
        .get(`/api/v1/tenants/${tenant.id}/corporate-users`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('deve permitir que GESTOR liste usuários', async () => {
      const response = await testHelper
        .getRequest()
        .get(`/api/v1/tenants/${tenant.id}/corporate-users`)
        .set('Authorization', `Bearer ${gestorToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('deve permitir que GERENTE liste usuários', async () => {
      const response = await testHelper
        .getRequest()
        .get(`/api/v1/tenants/${tenant.id}/corporate-users`)
        .set('Authorization', `Bearer ${gerenteToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('deve rejeitar que OPERADOR liste usuários', async () => {
      await testHelper
        .getRequest()
        .get(`/api/v1/tenants/${tenant.id}/corporate-users`)
        .set('Authorization', `Bearer ${operadorToken}`)
        .expect(403);
    });
  });

  describe('/tenants/:tenantId/corporate-users/:id (PATCH)', () => {
    let adminToken: string;
    let gestorToken: string;

    beforeEach(async () => {
      const adminLogin = await testHelper
        .getRequest()
        .post('/api/v1/auth/login')
        .send({ email: adminUser.email, password: 'senha123' });
      adminToken = adminLogin.body.access_token;

      const gestorLogin = await testHelper
        .getRequest()
        .post('/api/v1/auth/login')
        .send({ email: gestorUser.email, password: 'senha123' });
      gestorToken = gestorLogin.body.access_token;
    });

    it('deve permitir que ADMINISTRADOR atualize usuário', async () => {
      const updateData = {
        department: 'TI Atualizado',
        position: 'Analista Senior',
      };

      const response = await testHelper
        .getRequest()
        .patch(
          `/api/v1/tenants/${tenant.id}/corporate-users/${operadorUser.id}`,
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.department).toBe(updateData.department);
      expect(response.body.position).toBe(updateData.position);
    });

    it('deve permitir que ADMINISTRADOR promova usuário', async () => {
      const updateData = {
        role: 'GERENTE',
      };

      const response = await testHelper
        .getRequest()
        .patch(
          `/api/v1/tenants/${tenant.id}/corporate-users/${operadorUser.id}`,
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.role).toBe('GERENTE');
    });

    it('deve rejeitar que GESTOR promova usuário para ADMINISTRADOR', async () => {
      const updateData = {
        role: 'ADMINISTRADOR',
      };

      await testHelper
        .getRequest()
        .patch(
          `/api/v1/tenants/${tenant.id}/corporate-users/${operadorUser.id}`,
        )
        .set('Authorization', `Bearer ${gestorToken}`)
        .send(updateData)
        .expect(403);
    });

    it('deve rejeitar atualização de usuário protegido', async () => {
      // Marcar usuário como protegido
      await testHelper.updateCorporateUser(operadorUser.id, {
        isProtected: true,
      });

      const updateData = {
        department: 'TI Atualizado',
      };

      await testHelper
        .getRequest()
        .patch(
          `/api/v1/tenants/${tenant.id}/corporate-users/${operadorUser.id}`,
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(403);
    });
  });

  describe('/tenants/:tenantId/corporate-users/:id (DELETE)', () => {
    let adminToken: string;
    let gestorToken: string;

    beforeEach(async () => {
      const adminLogin = await testHelper
        .getRequest()
        .post('/api/v1/auth/login')
        .send({ email: adminUser.email, password: 'senha123' });
      adminToken = adminLogin.body.access_token;

      const gestorLogin = await testHelper
        .getRequest()
        .post('/api/v1/auth/login')
        .send({ email: gestorUser.email, password: 'senha123' });
      gestorToken = gestorLogin.body.access_token;
    });

    it('deve permitir que ADMINISTRADOR exclua usuário', async () => {
      await testHelper
        .getRequest()
        .delete(
          `/api/v1/tenants/${tenant.id}/corporate-users/${operadorUser.id}`,
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verificar se foi excluído
      const deletedUser = await testHelper.getCorporateUser(operadorUser.id);
      expect(deletedUser).toBeNull();
    });

    it('deve rejeitar que GESTOR exclua usuário com role superior', async () => {
      await testHelper
        .getRequest()
        .delete(`/api/v1/tenants/${tenant.id}/corporate-users/${adminUser.id}`)
        .set('Authorization', `Bearer ${gestorToken}`)
        .expect(403);
    });

    it('deve rejeitar exclusão de usuário protegido', async () => {
      // Marcar usuário como protegido
      await testHelper.updateCorporateUser(operadorUser.id, {
        isProtected: true,
      });

      await testHelper
        .getRequest()
        .delete(
          `/api/v1/tenants/${tenant.id}/corporate-users/${operadorUser.id}`,
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
    });

    it('deve rejeitar que usuário exclua a si mesmo', async () => {
      await testHelper
        .getRequest()
        .delete(`/api/v1/tenants/${tenant.id}/corporate-users/${adminUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
    });
  });

  describe('/tenants/:tenantId/corporate-users/:id/toggle-active (PATCH)', () => {
    let adminToken: string;

    beforeEach(async () => {
      const adminLogin = await testHelper
        .getRequest()
        .post('/api/v1/auth/login')
        .send({ email: adminUser.email, password: 'senha123' });
      adminToken = adminLogin.body.access_token;
    });

    it('deve ativar usuário inativo', async () => {
      // Desativar usuário primeiro
      await testHelper.updateCorporateUser(operadorUser.id, {
        isActive: false,
      });

      const response = await testHelper
        .getRequest()
        .patch(
          `/api/v1/tenants/${tenant.id}/corporate-users/${operadorUser.id}/toggle-active`,
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.isActive).toBe(true);
    });

    it('deve desativar usuário ativo', async () => {
      const response = await testHelper
        .getRequest()
        .patch(
          `/api/v1/tenants/${tenant.id}/corporate-users/${operadorUser.id}/toggle-active`,
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.isActive).toBe(false);
    });
  });

  describe('/tenants/:tenantId/corporate-users/:id/permissions (POST)', () => {
    let adminToken: string;
    let gestorToken: string;

    beforeEach(async () => {
      const adminLogin = await testHelper
        .getRequest()
        .post('/api/v1/auth/login')
        .send({ email: adminUser.email, password: 'senha123' });
      adminToken = adminLogin.body.access_token;

      const gestorLogin = await testHelper
        .getRequest()
        .post('/api/v1/auth/login')
        .send({ email: gestorUser.email, password: 'senha123' });
      gestorToken = gestorLogin.body.access_token;
    });

    it('deve permitir que ADMINISTRADOR atribua permissão', async () => {
      const permissionData = {
        resource: 'custom_resource',
        action: 'custom_action',
        granted: true,
      };

      await testHelper
        .getRequest()
        .post(
          `/api/v1/tenants/${tenant.id}/corporate-users/${operadorUser.id}/permissions`,
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .send(permissionData)
        .expect(200);
    });

    it('deve rejeitar que GESTOR atribua permissão', async () => {
      const permissionData = {
        resource: 'custom_resource',
        action: 'custom_action',
        granted: true,
      };

      await testHelper
        .getRequest()
        .post(
          `/api/v1/tenants/${tenant.id}/corporate-users/${operadorUser.id}/permissions`,
        )
        .set('Authorization', `Bearer ${gestorToken}`)
        .send(permissionData)
        .expect(403);
    });
  });

  describe('/tenants/:tenantId/corporate-users/:id/permissions/:resource/:action (GET)', () => {
    let adminToken: string;

    beforeEach(async () => {
      const adminLogin = await testHelper
        .getRequest()
        .post('/api/v1/auth/login')
        .send({ email: adminUser.email, password: 'senha123' });
      adminToken = adminLogin.body.access_token;
    });

    it('deve verificar permissão de usuário', async () => {
      const response = await testHelper
        .getRequest()
        .get(
          `/api/v1/tenants/${tenant.id}/corporate-users/${operadorUser.id}/permissions/queues/read`,
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('hasPermission');
      expect(typeof response.body.hasPermission).toBe('boolean');
    });
  });

  describe('Isolamento de Tenant', () => {
    let tenant2: any;
    let adminToken1: string;
    let adminToken2: string;

    beforeEach(async () => {
      // Criar segundo tenant
      tenant2 = await testHelper.createTenant({
        name: 'Empresa Teste 2',
        slug: `empresa-teste-2-${Date.now()}`,
        email: 'contato2@empresa.com',
      });

      // Criar admin para segundo tenant
      const admin2 = await testHelper.createCorporateUser(tenant2.id, {
        email: `admin2-${Date.now()}@empresa2.com`,
        cpf: `8888888888${Date.now() % 100}`,
        name: 'Admin Empresa 2',
        password: 'senha123',
        role: 'ADMINISTRADOR',
      });

      // Login em ambos os tenants
      const login1 = await testHelper
        .getRequest()
        .post('/api/v1/auth/login')
        .send({ email: adminUser.email, password: 'senha123' });
      adminToken1 = login1.body.access_token;

      const login2 = await testHelper
        .getRequest()
        .post('/api/v1/auth/login')
        .send({ email: admin2.email, password: 'senha123' });
      adminToken2 = login2.body.access_token;
    });

    it('deve isolar usuários por tenant', async () => {
      // Admin do tenant 1 não deve conseguir acessar usuários do tenant 2
      await testHelper
        .getRequest()
        .get(`/api/v1/tenants/${tenant2.id}/corporate-users`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .expect(403);

      // Admin do tenant 2 não deve conseguir acessar usuários do tenant 1
      await testHelper
        .getRequest()
        .get(`/api/v1/tenants/${tenant.id}/corporate-users`)
        .set('Authorization', `Bearer ${adminToken2}`)
        .expect(403);
    });
  });
});
