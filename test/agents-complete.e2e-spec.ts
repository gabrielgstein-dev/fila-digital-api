import { TestHelper } from './test-setup';

// Função para gerar CPF válido
function generateValidCPF(): string {
  const generateDigit = (cpf: string[]): number => {
    const weights = cpf.length + 1;
    let sum = 0;
    for (let i = 0; i < cpf.length; i++) {
      sum += parseInt(cpf[i]) * (weights - i);
    }
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  // Gera 9 dígitos aleatórios
  const baseDigits = Array.from({ length: 9 }, () =>
    Math.floor(Math.random() * 10),
  );

  // Calcula os dois dígitos verificadores
  const firstDigit = generateDigit(baseDigits);
  const secondDigit = generateDigit([...baseDigits, firstDigit]);

  return [...baseDigits, firstDigit, secondDigit].join('');
}

describe('Agents Complete E2E', () => {
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

  describe('🧑‍💼 Agents CRUD Operations', () => {
    it('deve criar um novo agente', async () => {
      const { tenant, token } =
        await testHelper.setupCompleteTestDataWithAuth();

      // Gera um CPF válido e único
      const cpf = generateValidCPF();
      const email = `novo-agente-${Date.now()}@empresa.com`;

      const createAgentData = {
        email: email,
        cpf: cpf, // CPF válido
        name: 'Novo Agente Teste',
        password: 'Senha123!', // Senha mais forte
        role: 'OPERADOR',
        tenantId: tenant.id, // Adicionando tenantId obrigatório
      };

      const response = await testHelper
        .getRequest()
        .post(`/api/v1/tenants/${tenant.id}/agents`)
        .set('Authorization', `Bearer ${token}`)
        .send(createAgentData);

      if (response.status !== 201) {
        console.log(
          'Erro na criação do agente:',
          response.status,
          response.body,
        );
        console.log('Dados enviados:', createAgentData);
      }

      expect(response.status).toBe(201);

      expect(response.body).toMatchObject({
        email: createAgentData.email,
        cpf: createAgentData.cpf,
        name: createAgentData.name,
        role: createAgentData.role,
        tenantId: tenant.id,
      });
      expect(response.body.id).toBeDefined();
      // A senha é retornada como hash, mas não deve ser a senha original
      expect(response.body.password).not.toBe(createAgentData.password);
    });

    it('deve listar todos os agentes do tenant', async () => {
      const { tenant, agent, token } =
        await testHelper.setupCompleteTestDataWithAuth();

      // Criar mais um agente para ter mais de um na lista
      await testHelper.createAgent(tenant.id, {
        role: 'OPERADOR',
        email: `agente2-${Date.now()}@empresa.com`,
      });

      const response = await testHelper
        .getRequest()
        .get(`/api/v1/tenants/${tenant.id}/agents`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2);

      // Verificar se o agente criado no setup está na lista
      const foundAgent = response.body.find((a: any) => a.id === agent.id);
      expect(foundAgent).toBeDefined();
      expect(foundAgent.tenantId).toBe(tenant.id);
    });

    it('deve buscar um agente específico por ID', async () => {
      const { tenant, agent, token } =
        await testHelper.setupCompleteTestDataWithAuth();

      const response = await testHelper
        .getRequest()
        .get(`/api/v1/tenants/${tenant.id}/agents/${agent.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: agent.id,
        email: agent.email,
        cpf: agent.cpf,
        name: agent.name,
        role: agent.role,
        tenantId: tenant.id,
      });
      // A senha é retornada como hash (comportamento atual da API)
      expect(response.body.password).toBeDefined();
      expect(response.body.password).not.toBe('senha123'); // Não deve ser a senha original
    });

    it('deve deletar um agente', async () => {
      const { tenant, token } =
        await testHelper.setupCompleteTestDataWithAuth();

      // Criar um agente específico para deletar
      const agentToDelete = await testHelper.createAgent(tenant.id, {
        role: 'OPERADOR',
        email: `para-deletar-${Date.now()}@empresa.com`,
      });

      await testHelper
        .getRequest()
        .delete(`/api/v1/tenants/${tenant.id}/agents/${agentToDelete.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(204);

      // Verificar que o agente foi deletado
      await testHelper
        .getRequest()
        .get(`/api/v1/tenants/${tenant.id}/agents/${agentToDelete.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });

  describe('🔒 Agents Security & Authorization', () => {
    it('deve impedir acesso sem autenticação', async () => {
      const { tenant } = await testHelper.setupCompleteTestData();

      await testHelper
        .getRequest()
        .get(`/api/v1/tenants/${tenant.id}/agents`)
        .expect(401);
    });

    it('deve impedir acesso a agentes de outro tenant', async () => {
      const { tenant: tenant1, token: token1 } =
        await testHelper.setupCompleteTestDataWithAuth();

      // Criar segundo tenant
      const tenant2 = await testHelper.createTenant();
      const agent2 = await testHelper.createAgent(tenant2.id);

      // Tentar acessar agente do tenant2 com token do tenant1
      await testHelper
        .getRequest()
        .get(`/api/v1/tenants/${tenant2.id}/agents/${agent2.id}`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(403);
    });

    it('deve validar campos obrigatórios na criação', async () => {
      const { tenant, token } =
        await testHelper.setupCompleteTestDataWithAuth();

      const invalidData = {
        name: 'Teste',
        // Faltando campos obrigatórios: email, cpf, password, role
      };

      await testHelper
        .getRequest()
        .post(`/api/v1/tenants/${tenant.id}/agents`)
        .set('Authorization', `Bearer ${token}`)
        .send(invalidData)
        .expect(400); // ValidationPipe retorna 400 quando campos obrigatórios estão faltando
    });
  });

  describe('📊 Agents Business Logic', () => {
    it('deve manter isolamento entre tenants', async () => {
      // Criar dois tenants com agentes
      const tenant1 = await testHelper.createTenant();
      const agent1 = await testHelper.createAgent(tenant1.id, {
        role: 'ADMINISTRADOR',
      });
      const token1 = await testHelper.loginAgent(agent1.cpf, 'senha123');

      const tenant2 = await testHelper.createTenant();
      const agent2 = await testHelper.createAgent(tenant2.id, {
        role: 'ADMINISTRADOR',
      });
      const token2 = await testHelper.loginAgent(agent2.cpf, 'senha123');

      // Listar agentes do tenant1
      const response1 = await testHelper
        .getRequest()
        .get(`/api/v1/tenants/${tenant1.id}/agents`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      // Listar agentes do tenant2
      const response2 = await testHelper
        .getRequest()
        .get(`/api/v1/tenants/${tenant2.id}/agents`)
        .set('Authorization', `Bearer ${token2}`)
        .expect(200);

      // Verificar isolamento
      const tenant1AgentIds = response1.body.map((a: any) => a.id);
      const tenant2AgentIds = response2.body.map((a: any) => a.id);

      expect(tenant1AgentIds).toContain(agent1.id);
      expect(tenant1AgentIds).not.toContain(agent2.id);

      expect(tenant2AgentIds).toContain(agent2.id);
      expect(tenant2AgentIds).not.toContain(agent1.id);
    });

    it('deve permitir múltiplos agentes por tenant', async () => {
      const { tenant, token } =
        await testHelper.setupCompleteTestDataWithAuth();

      // Criar 3 agentes adicionais
      const agentPromises = Array.from({ length: 3 }, (_, i) =>
        testHelper.createAgent(tenant.id, {
          role: 'OPERADOR',
          email: `agente${i}-${Date.now()}@empresa.com`,
        }),
      );

      await Promise.all(agentPromises);

      const response = await testHelper
        .getRequest()
        .get(`/api/v1/tenants/${tenant.id}/agents`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.length).toBeGreaterThanOrEqual(4); // 1 do setup + 3 criados

      // Todos devem pertencer ao mesmo tenant
      response.body.forEach((agent: any) => {
        expect(agent.tenantId).toBe(tenant.id);
      });
    });
  });
});
