import { TestHelper } from './test-setup';
import * as request from 'supertest';

describe('Tenants Debug (e2e)', () => {
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

  it('deve criar um tenant usando TestHelper simples', async () => {
    const timestamp = Date.now();
    const createTenantDto = {
      name: 'Teste Debug',
      slug: `teste-debug-${timestamp}`,
    };

    console.log('🔍 Testando endpoint:', '/api/v1/tenants');
    console.log('🔍 Dados:', createTenantDto);

    const response = await testHelper
      .getRequest()
      .post('/api/v1/tenants')
      .send(createTenantDto)
      .expect(201);

    console.log('✅ Resposta:', response.body);

    expect(response.body).toMatchObject({
      id: expect.any(String),
      name: createTenantDto.name,
      slug: createTenantDto.slug,
      isActive: true,
    });
  });

  it('deve listar tenants', async () => {
    console.log('🔍 Criando tenant...');
    const tenant = await testHelper.createTenant({
      name: 'Tenant Teste',
      slug: `tenant-teste-${Date.now()}`,
    });
    console.log('✅ Tenant criado:', tenant);

    console.log('🔍 Criando agente...');
    const agent = await testHelper.createAgent(tenant.id, {
      role: 'ADMINISTRADOR',
    });
    console.log('✅ Agente criado:', agent);

    console.log('🔍 Fazendo login...');
    const token = await testHelper.loginAgent(agent.cpf, 'senha123');
    console.log('✅ Token obtido:', token.substring(0, 20) + '...');

    console.log('🔍 Listando tenants...');
    const response = await request(testHelper.app.getHttpServer())
      .get('/api/v1/tenants')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    console.log('✅ Resposta da listagem:', response.body);

    // Filtrar apenas o tenant criado neste teste
    const createdTenant = response.body.find((t: any) => t.id === tenant.id);
    expect(createdTenant).toBeDefined();
    expect(createdTenant.id).toBe(tenant.id);
    expect(createdTenant.name).toBe(tenant.name);
  });
});
