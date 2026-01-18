import { TestHelper } from './test-setup';
const request = require('supertest');

describe('Tenants Simple (e2e)', () => {
  let testHelper: TestHelper;

  beforeAll(async () => {
    testHelper = await TestHelper.createInstance();
  });

  afterAll(async () => {
    // Não fechar o servidor global aqui
  });

  beforeEach(async () => {
    await testHelper.beforeEach();
  });

  it('deve criar um tenant simples', async () => {
    const timestamp = Date.now();
    const createTenantDto = {
      name: 'Teste Simples',
      slug: `teste-simples-${timestamp}`,
    };

    const response = await request(testHelper.app.getHttpServer())
      .post('/api/v1/tenants')
      .send(createTenantDto)
      .expect(201);

    expect(response.body).toMatchObject({
      id: expect.any(String),
      name: createTenantDto.name,
      slug: createTenantDto.slug,
      isActive: true,
    });
  });
});
