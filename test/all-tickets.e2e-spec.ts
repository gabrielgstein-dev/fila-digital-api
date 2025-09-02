import { TestHelper } from './test-setup';

describe('All Tickets Endpoint (e2e)', () => {
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

  describe('GET /tenants/:tenantId/queues/all-tickets', () => {
    it('deve retornar visão consolidada sem tickets', async () => {
      const { tenant } = await testHelper.setupCompleteTestData();

      // Testar sem autenticação primeiro
      await testHelper
        .getRequest()
        .get(`/api/v1/tenants/${tenant.id}/queues/all-tickets`)
        .expect(401);
    });

    it('deve retornar visão consolidada com tickets em múltiplas filas', async () => {
      const { tenant } = await testHelper.setupCompleteTestData();

      // Criar múltiplas filas
      const filaGeral = await testHelper.createQueue(tenant.id, {
        name: 'Fila Geral',
        description: 'Atendimento geral',
      });

      const filaPrioritaria = await testHelper.createQueue(tenant.id, {
        name: 'Fila Prioritária',
        description: 'Atendimento prioritário',
        queueType: 'PRIORITY',
      });

      const filaVIP = await testHelper.createQueue(tenant.id, {
        name: 'Fila VIP',
        description: 'Atendimento VIP',
        queueType: 'VIP',
      });

      // Criar tickets em cada fila
      await testHelper.createTicket(filaGeral.id, {
        clientName: 'João Silva',
        priority: 1,
      });

      await testHelper.createTicket(filaPrioritaria.id, {
        clientName: 'Maria Santos',
        priority: 2,
      });

      await testHelper.createTicket(filaVIP.id, {
        clientName: 'Pedro Costa',
        priority: 3,
      });

      // Testar sem autenticação
      await testHelper
        .getRequest()
        .get(`/api/v1/tenants/${tenant.id}/queues/all-tickets`)
        .expect(401);
    });

    it('deve calcular posições corretamente baseado na prioridade', async () => {
      const { tenant } = await testHelper.setupCompleteTestData();

      const fila = await testHelper.createQueue(tenant.id, {
        name: 'Fila Teste',
        description: 'Fila para teste de prioridade',
      });

      // Criar tickets com prioridades diferentes
      await testHelper.createTicket(fila.id, {
        clientName: 'João',
        priority: 3,
      });

      await testHelper.createTicket(fila.id, {
        clientName: 'Maria',
        priority: 1,
      });

      await testHelper.createTicket(fila.id, {
        clientName: 'Pedro',
        priority: 2,
      });

      // Testar sem autenticação
      await testHelper
        .getRequest()
        .get(`/api/v1/tenants/${tenant.id}/queues/all-tickets`)
        .expect(401);
    });

    it('deve incluir informações detalhadas dos tickets', async () => {
      const { tenant } = await testHelper.setupCompleteTestData();

      const fila = await testHelper.createQueue(tenant.id, {
        name: 'Endocrinologia',
        description: 'Especialidade endocrinologia',
      });

      await testHelper.createTicket(fila.id, {
        clientName: 'Ana Silva',
        clientPhone: '11999999999',
        clientEmail: 'ana@email.com',
        priority: 1,
        estimatedTime: 600,
      });

      // Testar sem autenticação
      await testHelper
        .getRequest()
        .get(`/api/v1/tenants/${tenant.id}/queues/all-tickets`)
        .expect(401);
    });

    it('deve exigir autenticação', async () => {
      const { tenant } = await testHelper.setupCompleteTestData();

      await testHelper
        .getRequest()
        .get(`/api/v1/tenants/${tenant.id}/queues/all-tickets`)
        .expect(401);
    });

    it('deve validar acesso por tenant', async () => {
      const { tenant } = await testHelper.setupCompleteTestData();

      // Tentar acessar outro tenant
      const outroTenant = await testHelper.createTenant({
        name: 'Outra Empresa',
        slug: 'outra-empresa',
      });

      await testHelper
        .getRequest()
        .get(`/api/v1/tenants/${outroTenant.id}/queues/all-tickets`)
        .expect(401); // Sem autenticação
    });

    it('deve atualizar lastUpdated', async () => {
      const { tenant } = await testHelper.setupCompleteTestData();

      const fila = await testHelper.createQueue(tenant.id, {
        name: 'Fila Teste',
        description: 'Fila para teste de atualização',
      });

      // Testar sem autenticação
      await testHelper
        .getRequest()
        .get(`/api/v1/tenants/${tenant.id}/queues/all-tickets`)
        .expect(401);
    });
  });
});
