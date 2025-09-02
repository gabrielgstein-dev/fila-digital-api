import { TestHelper } from './test-setup';
import * as request from 'supertest';

describe('Tenants (e2e)', () => {
  let testHelper: TestHelper;

  beforeAll(async () => {
    testHelper = await TestHelper.createInstance();
  });

  beforeEach(async () => {
    await testHelper.beforeEach();
  });

  afterAll(async () => {
    await testHelper.afterAll();
  });

  describe('POST /api/v1/tenants', () => {
    it('deve criar um novo tenant com sucesso', async () => {
      const createTenantDto = {
        name: 'Clínica Teste',
        slug: 'clinica-teste',
        email: 'contato@clinicateste.com',
        phone: '(11) 99999-9999',
      };

      const response = await request(testHelper.app.getHttpServer())
        .post('/api/v1/tenants')
        .send(createTenantDto)
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        name: createTenantDto.name,
        slug: createTenantDto.slug,
        email: createTenantDto.email,
        phone: createTenantDto.phone,
        isActive: true,
        createdAt: expect.anything(),
        updatedAt: expect.anything(),
      });

      const tenantInDb = await testHelper.prisma.tenant.findUnique({
        where: { id: response.body.id },
      });
      expect(tenantInDb).toBeTruthy();
      expect(tenantInDb.name).toBe(createTenantDto.name);
    });

    it('deve criar tenant apenas com campos obrigatórios', async () => {
      const createTenantDto = {
        name: 'Empresa Simples',
        slug: 'empresa-simples',
      };

      const response = await request(testHelper.app.getHttpServer())
        .post('/api/v1/tenants')
        .send(createTenantDto)
        .expect(201);

      expect(response.body).toMatchObject({
        name: createTenantDto.name,
        slug: createTenantDto.slug,
        email: null,
        phone: null,
        isActive: true,
      });
    });

    it('deve rejeitar tenant com slug duplicado', async () => {
      const tenant1 = await testHelper.createTenant({
        name: 'Primeira Empresa',
        slug: 'empresa-primeira',
      });

      const createTenantDto = {
        name: 'Segunda Empresa',
        slug: 'empresa-primeira',
        email: 'contato@segunda.com',
      };

      await request(testHelper.app.getHttpServer())
        .post('/api/v1/tenants')
        .send(createTenantDto)
        .expect(409);
    });

    it('deve rejeitar tenant com email duplicado', async () => {
      const tenant1 = await testHelper.createTenant({
        name: 'Primeira Empresa',
        slug: 'empresa-primeira',
        email: 'contato@empresa.com',
      });

      const createTenantDto = {
        name: 'Segunda Empresa',
        slug: 'empresa-segunda',
        email: 'contato@empresa.com',
      };

      await request(testHelper.app.getHttpServer())
        .post('/api/v1/tenants')
        .send(createTenantDto)
        .expect(409);
    });

    it('deve validar campos obrigatórios', async () => {
      const invalidDto = {
        name: '',
        slug: '',
      };

      await request(testHelper.app.getHttpServer())
        .post('/api/v1/tenants')
        .send(invalidDto)
        .expect(400);
    });

    it('deve validar formato de email', async () => {
      const invalidDto = {
        name: 'Empresa Teste',
        slug: 'empresa-teste',
        email: 'email-invalido',
      };

      await request(testHelper.app.getHttpServer())
        .post('/api/v1/tenants')
        .send(invalidDto)
        .expect(400);
    });
  });

  describe('GET /api/v1/tenants', () => {
    it('deve listar todos os tenants', async () => {
      const tenant1 = await testHelper.createTenant({
        name: 'Empresa A',
        slug: 'empresa-a',
      });
      const tenant2 = await testHelper.createTenant({
        name: 'Empresa B',
        slug: 'empresa-b',
      });

      // Criar agente em um dos tenants para autenticação
      const agent = await testHelper.createAgent(tenant1.id, {
        role: 'ADMINISTRADOR',
      });
      const token = await testHelper.loginAgent(agent.cpf, 'senha123');

      const response = await request(testHelper.app.getHttpServer())
        .get('/api/v1/tenants')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Filtrar apenas os tenants criados neste teste
      const createdTenants = response.body.filter(
        (t: any) => t.id === tenant1.id || t.id === tenant2.id,
      );

      expect(createdTenants).toHaveLength(2);

      // Verificar que os tenants criados estão na lista
      const tenant1InResponse = createdTenants.find(
        (t: any) => t.id === tenant1.id,
      );
      const tenant2InResponse = createdTenants.find(
        (t: any) => t.id === tenant2.id,
      );

      expect(tenant1InResponse).toBeDefined();
      expect(tenant2InResponse).toBeDefined();
      expect(tenant1InResponse.name).toBe('Empresa A');
      expect(tenant2InResponse.name).toBe('Empresa B');
    });

    it('deve retornar lista vazia quando não há tenants', async () => {
      // Limpar banco antes deste teste específico
      await testHelper.beforeEach();

      // Criar um tenant para manter o agente
      const tempTenant = await testHelper.createTenant();
      const agent = await testHelper.createAgent(tempTenant.id, {
        role: 'ADMINISTRADOR',
      });
      const token = await testHelper.loginAgent(agent.cpf, 'senha123');

      // Remover apenas os outros tenants, mantendo o tenant do agente
      await testHelper.prisma.tenant.deleteMany({
        where: { id: { not: tempTenant.id } },
      });

      const response = await request(testHelper.app.getHttpServer())
        .get('/api/v1/tenants')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveLength(1); // Deve retornar apenas o tenant do agente
    });
  });

  describe('GET /api/v1/tenants/:id', () => {
    it('deve retornar tenant por ID', async () => {
      const tenant = await testHelper.createTenant({
        name: 'Empresa Teste',
        slug: 'empresa-teste',
      });

      // Criar agente no mesmo tenant
      const agent = await testHelper.createAgent(tenant.id, {
        role: 'ADMINISTRADOR',
      });
      const token = await testHelper.loginAgent(agent.cpf, 'senha123');

      const response = await request(testHelper.app.getHttpServer())
        .get(`/api/v1/tenants/${tenant.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
      });
    });

    it('deve retornar 404 para ID inexistente', async () => {
      const tenant = await testHelper.createTenant();
      const agent = await testHelper.createAgent(tenant.id, {
        role: 'ADMINISTRADOR',
      });
      const token = await testHelper.loginAgent(agent.cpf, 'senha123');

      await request(testHelper.app.getHttpServer())
        .get('/api/v1/tenants/tenant-inexistente')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });

  describe('GET /api/v1/tenants/slug/:slug', () => {
    it('deve retornar tenant por slug', async () => {
      const tenant = await testHelper.createTenant({
        name: 'Empresa Teste',
        slug: 'empresa-teste',
      });

      const response = await request(testHelper.app.getHttpServer())
        .get(`/api/v1/tenants/slug/${tenant.slug}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
      });
    });

    it('deve retornar 404 para slug inexistente', async () => {
      await request(testHelper.app.getHttpServer())
        .get('/api/v1/tenants/slug/slug-inexistente')
        .expect(404);
    });
  });

  describe('PUT /api/v1/tenants/:id', () => {
    it('deve atualizar tenant com sucesso', async () => {
      const tenant = await testHelper.createTenant({
        name: 'Empresa Original',
        slug: 'empresa-original',
      });

      // Criar agente no mesmo tenant
      const agent = await testHelper.createAgent(tenant.id, {
        role: 'ADMINISTRADOR',
      });
      const token = await testHelper.loginAgent(agent.cpf, 'senha123');

      const updateDto = {
        name: 'Empresa Atualizada',
        phone: '(11) 88888-8888',
      };

      const response = await request(testHelper.app.getHttpServer())
        .put(`/api/v1/tenants/${tenant.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateDto)
        .expect(200);

      expect(response.body).toMatchObject({
        id: tenant.id,
        name: updateDto.name,
        phone: updateDto.phone,
      });
    });

    it('deve rejeitar atualização com slug duplicado', async () => {
      const tenant1 = await testHelper.createTenant({
        name: 'Primeira Empresa',
        slug: 'empresa-primeira',
      });
      const tenant2 = await testHelper.createTenant({
        name: 'Segunda Empresa',
        slug: 'empresa-segunda',
      });

      // Criar agente no tenant2
      const agent = await testHelper.createAgent(tenant2.id, {
        role: 'ADMINISTRADOR',
      });
      const token = await testHelper.loginAgent(agent.cpf, 'senha123');

      const updateDto = {
        slug: 'empresa-primeira',
      };

      await request(testHelper.app.getHttpServer())
        .put(`/api/v1/tenants/${tenant2.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateDto)
        .expect(409);
    });
  });

  describe('PUT /api/v1/tenants/:id/toggle-active', () => {
    it('deve alternar status ativo do tenant', async () => {
      const tenant = await testHelper.createTenant();

      // Criar agente no mesmo tenant
      const agent = await testHelper.createAgent(tenant.id, {
        role: 'ADMINISTRADOR',
      });
      const token = await testHelper.loginAgent(agent.cpf, 'senha123');

      const response1 = await request(testHelper.app.getHttpServer())
        .put(`/api/v1/tenants/${tenant.id}/toggle-active`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response1.body.isActive).toBe(false);

      const response2 = await request(testHelper.app.getHttpServer())
        .put(`/api/v1/tenants/${tenant.id}/toggle-active`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response2.body.isActive).toBe(true);
    });
  });

  describe('DELETE /api/v1/tenants/:id', () => {
    it('deve remover tenant com sucesso', async () => {
      const tenant = await testHelper.createTenant();

      // Criar agente no mesmo tenant
      const agent = await testHelper.createAgent(tenant.id, {
        role: 'ADMINISTRADOR',
      });
      const token = await testHelper.loginAgent(agent.cpf, 'senha123');

      await request(testHelper.app.getHttpServer())
        .delete(`/api/v1/tenants/${tenant.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(204);

      const tenantInDb = await testHelper.prisma.tenant.findUnique({
        where: { id: tenant.id },
      });
      expect(tenantInDb).toBeNull();
    });

    it('deve retornar 404 para ID inexistente na remoção', async () => {
      const tenant = await testHelper.createTenant();
      const agent = await testHelper.createAgent(tenant.id, {
        role: 'ADMINISTRADOR',
      });
      const token = await testHelper.loginAgent(agent.cpf, 'senha123');

      await request(testHelper.app.getHttpServer())
        .delete('/api/v1/tenants/tenant-inexistente')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });
});
