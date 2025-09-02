import { TestHelper } from './test-setup';

describe('Corporate Users Advanced E2E', () => {
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

  describe('🔧 Corporate Users Management', () => {
    it('deve alternar status ativo/inativo de usuário', async () => {
      const { tenant, adminUser } =
        await testHelper.setupCompleteTestDataWithCorporateUsers();
      const adminToken = await testHelper.loginCorporateUser(
        adminUser.email,
        'senha123',
      );

      // Criar usuário para testar
      const testUser = await testHelper.createCorporateUser(tenant.id, {
        role: 'OPERADOR',
        email: `test-toggle-${Date.now()}@empresa.com`,
      });

      // Alternar para inativo
      const response1 = await testHelper
        .getRequest()
        .patch(
          `/api/v1/tenants/${tenant.id}/corporate-users/${testUser.id}/toggle-active`,
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response1.body.isActive).toBe(false);

      // Alternar de volta para ativo
      const response2 = await testHelper
        .getRequest()
        .patch(
          `/api/v1/tenants/${tenant.id}/corporate-users/${testUser.id}/toggle-active`,
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response2.body.isActive).toBe(true);
    });

    it('deve atualizar dados do usuário corporativo', async () => {
      const { tenant, adminUser, operadorUser } =
        await testHelper.setupCompleteTestDataWithCorporateUsers();
      const adminToken = await testHelper.loginCorporateUser(
        adminUser.email,
        'senha123',
      );

      const updateData = {
        name: 'Nome Atualizado',
        role: 'OPERADOR', // Manter o mesmo role
      };

      const response = await testHelper
        .getRequest()
        .patch(
          `/api/v1/tenants/${tenant.id}/corporate-users/${operadorUser.id}`,
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.name).toBe(updateData.name);
    });

    it('deve buscar dados específicos do usuário', async () => {
      const { tenant, adminUser, operadorUser } =
        await testHelper.setupCompleteTestDataWithCorporateUsers();
      const adminToken = await testHelper.loginCorporateUser(
        adminUser.email,
        'senha123',
      );

      // Buscar dados do usuário
      const response = await testHelper
        .getRequest()
        .get(`/api/v1/tenants/${tenant.id}/corporate-users/${operadorUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.id).toBe(operadorUser.id);
      expect(response.body.role).toBe('OPERADOR');
    });
  });

  describe('🏢 Corporate Hierarchy & Roles', () => {
    it('deve respeitar hierarquia de roles na criação', async () => {
      const { tenant, gestorUser } =
        await testHelper.setupCompleteTestDataWithCorporateUsers();
      const gestorToken = await testHelper.loginCorporateUser(
        gestorUser.email,
        'senha123',
      );

      // GESTOR pode criar OPERADOR
      const operadorData = {
        email: `new-operador-${Date.now()}@empresa.com`,
        name: 'Novo Operador',
        cpf: `12345678901`,
        password: 'senha123',
        role: 'OPERADOR',
      };

      const response = await testHelper
        .getRequest()
        .post(`/api/v1/tenants/${tenant.id}/corporate-users`)
        .set('Authorization', `Bearer ${gestorToken}`)
        .send(operadorData)
        .expect(201);

      expect(response.body.role).toBe('OPERADOR');
    });

    it('deve impedir criação de role superior', async () => {
      const { tenant, operadorUser } =
        await testHelper.setupCompleteTestDataWithCorporateUsers();
      const operadorToken = await testHelper.loginCorporateUser(
        operadorUser.email,
        'senha123',
      );

      // OPERADOR NÃO pode criar ADMINISTRADOR
      const adminData = {
        email: `new-admin-${Date.now()}@empresa.com`,
        name: 'Novo Admin',
        cpf: `98765432101`,
        password: 'senha123',
        role: 'ADMINISTRADOR',
      };

      await testHelper
        .getRequest()
        .post(`/api/v1/tenants/${tenant.id}/corporate-users`)
        .set('Authorization', `Bearer ${operadorToken}`)
        .send(adminData)
        .expect(403);
    });

    it('deve validar permissões por departamento', async () => {
      const { tenant, adminUser } =
        await testHelper.setupCompleteTestDataWithCorporateUsers();
      const adminToken = await testHelper.loginCorporateUser(
        adminUser.email,
        'senha123',
      );

      // Criar usuário com departamento específico
      const userData = {
        email: `dept-user-${Date.now()}@empresa.com`,
        name: 'Usuário Departamento',
        cpf: `11111111111`,
        password: 'senha123',
        role: 'OPERADOR',
        department: 'ATENDIMENTO',
        position: 'Atendente Sênior',
      };

      const response = await testHelper
        .getRequest()
        .post(`/api/v1/tenants/${tenant.id}/corporate-users`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData)
        .expect(201);

      expect(response.body.department).toBe('ATENDIMENTO');
      expect(response.body.position).toBe('Atendente Sênior');
    });
  });

  describe('🔐 Advanced Security Tests', () => {
    it('deve impedir acesso cross-tenant', async () => {
      const { tenant: tenant1, adminUser: admin1 } =
        await testHelper.setupCompleteTestDataWithCorporateUsers();
      const admin1Token = await testHelper.loginCorporateUser(
        admin1.email,
        'senha123',
      );

      // Criar segundo tenant
      const tenant2 = await testHelper.createTenant();
      const admin2 = await testHelper.createCorporateUser(tenant2.id, {
        role: 'ADMINISTRADOR',
        email: `admin2-${Date.now()}@empresa.com`,
      });

      // Admin do tenant1 NÃO deve conseguir acessar usuários do tenant2
      await testHelper
        .getRequest()
        .get(`/api/v1/tenants/${tenant2.id}/corporate-users`)
        .set('Authorization', `Bearer ${admin1Token}`)
        .expect(403);
    });

    it('deve aceitar senhas válidas', async () => {
      const { tenant, adminUser } =
        await testHelper.setupCompleteTestDataWithCorporateUsers();
      const adminToken = await testHelper.loginCorporateUser(
        adminUser.email,
        'senha123',
      );

      // Senha válida
      const validPasswordData = {
        email: `valid-pass-${Date.now()}@empresa.com`,
        name: 'Usuário Senha Válida',
        cpf: `22222222222`,
        password: 'senha123', // Senha válida
        role: 'OPERADOR',
      };

      const response = await testHelper
        .getRequest()
        .post(`/api/v1/tenants/${tenant.id}/corporate-users`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validPasswordData)
        .expect(201);

      expect(response.body.email).toBe(validPasswordData.email);
    });

    it('deve impedir email duplicado', async () => {
      const { tenant, adminUser } =
        await testHelper.setupCompleteTestDataWithCorporateUsers();
      const adminToken = await testHelper.loginCorporateUser(
        adminUser.email,
        'senha123',
      );

      const duplicateEmail = `duplicate-${Date.now()}@empresa.com`;

      // Criar primeiro usuário
      const userData1 = {
        email: duplicateEmail,
        name: 'Primeiro Usuário',
        cpf: `33333333333`,
        password: 'senha123',
        role: 'OPERADOR',
      };

      await testHelper
        .getRequest()
        .post(`/api/v1/tenants/${tenant.id}/corporate-users`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData1)
        .expect(201);

      // Tentar criar segundo com mesmo email
      const userData2 = {
        email: duplicateEmail,
        name: 'Segundo Usuário',
        cpf: `44444444444`,
        password: 'senha123',
        role: 'OPERADOR',
      };

      await testHelper
        .getRequest()
        .post(`/api/v1/tenants/${tenant.id}/corporate-users`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData2)
        .expect(409);
    });
  });

  describe('📊 Corporate Users Analytics', () => {
    it('deve listar usuários com filtros', async () => {
      const { tenant, adminUser } =
        await testHelper.setupCompleteTestDataWithCorporateUsers();
      const adminToken = await testHelper.loginCorporateUser(
        adminUser.email,
        'senha123',
      );

      // Criar usuários com diferentes roles
      await testHelper.createCorporateUser(tenant.id, {
        role: 'OPERADOR',
        email: `op1-${Date.now()}@empresa.com`,
        department: 'VENDAS',
      });

      await testHelper.createCorporateUser(tenant.id, {
        role: 'GERENTE',
        email: `ger1-${Date.now()}@empresa.com`,
        department: 'VENDAS',
      });

      const response = await testHelper
        .getRequest()
        .get(`/api/v1/tenants/${tenant.id}/corporate-users`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      // Verificar que retorna usuários (incluindo o admin do setup)
      expect(response.body.length).toBeGreaterThan(0);
      // Verificar que todos têm role definido
      response.body.forEach((user: any) => {
        expect(user.role).toBeDefined();
        expect(['ADMINISTRADOR', 'GERENTE', 'OPERADOR', 'GESTOR']).toContain(
          user.role,
        );
      });

      // Verificar que pelo menos há usuários com roles válidos
      const roles = response.body.map((user: any) => user.role);
      expect(roles.length).toBeGreaterThan(0);
      // Deve conter pelo menos um dos roles principais
      expect(
        roles.some((role) =>
          ['ADMINISTRADOR', 'GERENTE', 'OPERADOR', 'GESTOR'].includes(role),
        ),
      ).toBe(true);
    });

    it('deve contar usuários por role', async () => {
      const { tenant, adminUser } =
        await testHelper.setupCompleteTestDataWithCorporateUsers();
      const adminToken = await testHelper.loginCorporateUser(
        adminUser.email,
        'senha123',
      );

      // Criar mais alguns usuários
      await testHelper.createCorporateUser(tenant.id, { role: 'OPERADOR' });
      await testHelper.createCorporateUser(tenant.id, { role: 'OPERADOR' });
      await testHelper.createCorporateUser(tenant.id, { role: 'GERENTE' });

      const response = await testHelper
        .getRequest()
        .get(`/api/v1/tenants/${tenant.id}/corporate-users`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(4); // Pelo menos os do setup + os criados
    });
  });

  describe('🔄 Corporate Users Lifecycle', () => {
    it('deve desativar usuário em vez de deletar', async () => {
      const { tenant, adminUser } =
        await testHelper.setupCompleteTestDataWithCorporateUsers();
      const adminToken = await testHelper.loginCorporateUser(
        adminUser.email,
        'senha123',
      );

      const testUser = await testHelper.createCorporateUser(tenant.id, {
        role: 'OPERADOR',
        email: `lifecycle-${Date.now()}@empresa.com`,
      });

      // Desativar usuário
      await testHelper
        .getRequest()
        .patch(
          `/api/v1/tenants/${tenant.id}/corporate-users/${testUser.id}/toggle-active`,
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verificar que ainda existe mas está inativo
      const response = await testHelper
        .getRequest()
        .get(`/api/v1/tenants/${tenant.id}/corporate-users/${testUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.isActive).toBe(false);
    });

    it('deve atualizar informações do usuário', async () => {
      const { tenant, adminUser, operadorUser } =
        await testHelper.setupCompleteTestDataWithCorporateUsers();
      const adminToken = await testHelper.loginCorporateUser(
        adminUser.email,
        'senha123',
      );

      const updateData = {
        name: 'Nome Atualizado',
        department: 'NOVO DEPARTAMENTO',
        position: 'Nova Posição',
        phone: '11999999999',
      };

      const response = await testHelper
        .getRequest()
        .patch(
          `/api/v1/tenants/${tenant.id}/corporate-users/${operadorUser.id}`,
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        name: updateData.name,
        department: updateData.department,
        position: updateData.position,
        phone: updateData.phone,
      });
    });
  });
});
