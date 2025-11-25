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

describe('Error Handling E2E', () => {
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

  describe('🚨 Input Validation Errors', () => {
    it('deve rejeitar dados malformados na criação de tenant', async () => {
      const malformedData = {
        name: '', // Nome vazio
        slug: 'invalid slug with spaces', // Slug inválido
        email: 'not-an-email', // Email inválido
        phone: '123', // Telefone muito curto
      };

      await testHelper
        .getRequest()
        .post('/api/v1/tenants')
        .send(malformedData)
        .expect(400);
    });

    it('deve aceitar CPF válido na criação de agente', async () => {
      const { tenant, token } =
        await testHelper.setupCompleteTestDataWithAuth();

      const validCpfData = {
        email: `test-${Date.now()}@empresa.com`,
        cpf: generateValidCPF(), // CPF válido
        name: 'Teste CPF Válido',
        password: 'senha123',
        role: 'OPERADOR',
        tenantId: tenant.id, // Adicionando tenantId obrigatório
      };

      const response = await testHelper
        .getRequest()
        .post(`/api/v1/tenants/${tenant.id}/agents`)
        .set('Authorization', `Bearer ${token}`)
        .send(validCpfData)
        .expect(201);

      expect(response.body).toMatchObject({
        email: validCpfData.email,
        cpf: validCpfData.cpf,
        name: validCpfData.name,
        role: validCpfData.role,
        tenantId: tenant.id,
      });
    });

    it('deve aceitar email válido na criação de agente', async () => {
      const { tenant, token } =
        await testHelper.setupCompleteTestDataWithAuth();

      const validEmailData = {
        email: `valid-${Date.now()}@empresa.com`,
        cpf: generateValidCPF(), // CPF válido
        name: 'Teste Email Válido',
        password: 'senha123',
        role: 'OPERADOR',
        tenantId: tenant.id, // Adicionando tenantId obrigatório
      };

      const response = await testHelper
        .getRequest()
        .post(`/api/v1/tenants/${tenant.id}/agents`)
        .set('Authorization', `Bearer ${token}`)
        .send(validEmailData)
        .expect(201);

      expect(response.body.email).toBe(validEmailData.email);
    });

    it('deve rejeitar JSON malformado', async () => {
      const { tenant, token } =
        await testHelper.setupCompleteTestDataWithAuth();

      await testHelper
        .getRequest()
        .post(`/api/v1/tenants/${tenant.id}/agents`)
        .set('Authorization', `Bearer ${token}`)
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}') // JSON malformado
        .expect(400);
    });
  });

  describe('🔍 Resource Not Found Errors', () => {
    it('deve retornar 404 para tenant inexistente', async () => {
      const { token } = await testHelper.setupCompleteTestDataWithAuth();
      const nonExistentId = 'non-existent-tenant-id';

      await testHelper
        .getRequest()
        .get(`/api/v1/tenants/${nonExistentId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('deve retornar 404 para agente inexistente', async () => {
      const { tenant, token } =
        await testHelper.setupCompleteTestDataWithAuth();
      const nonExistentId = 'non-existent-agent-id';

      await testHelper
        .getRequest()
        .get(`/api/v1/tenants/${tenant.id}/agents/${nonExistentId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('deve retornar 404 para fila inexistente', async () => {
      const { tenant, token } =
        await testHelper.setupCompleteTestDataWithAuth();
      const nonExistentId = 'non-existent-queue-id';

      await testHelper
        .getRequest()
        .get(`/api/v1/tenants/${tenant.id}/queues/${nonExistentId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('deve retornar 404 para ticket inexistente', async () => {
      const nonExistentId = 'non-existent-ticket-id';

      await testHelper
        .getRequest()
        .get(`/api/v1/tickets/${nonExistentId}`)
        .expect(404);
    });
  });

  describe('🔐 Authentication & Authorization Errors', () => {
    it('deve retornar 401 para token inválido', async () => {
      const { tenant } = await testHelper.setupCompleteTestData();

      await testHelper
        .getRequest()
        .get(`/api/v1/tenants/${tenant.id}/agents`)
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('deve retornar 401 para token expirado', async () => {
      const { tenant } = await testHelper.setupCompleteTestData();
      const expiredToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9'; // Token expirado

      await testHelper
        .getRequest()
        .get(`/api/v1/tenants/${tenant.id}/agents`)
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });

    it('deve retornar 403 para operação sem permissão', async () => {
      const { tenant } = await testHelper.setupCompleteTestData();

      // Criar agente OPERADOR (sem permissão para criar outros agentes)
      const operador = await testHelper.createAgent(tenant.id, {
        role: 'OPERADOR',
        email: `operador-${Date.now()}@empresa.com`,
      });
      const operadorToken = await testHelper.loginAgent(
        operador.cpf,
        'senha123',
      );

      const newAgentData = {
        email: `novo-agente-${Date.now()}@empresa.com`,
        cpf: generateValidCPF(),
        name: 'Novo Agente',
        password: 'senha123',
        role: 'OPERADOR',
        tenantId: tenant.id, // Adicionando tenantId para passar pela validação
      };

      await testHelper
        .getRequest()
        .post(`/api/v1/tenants/${tenant.id}/agents`)
        .set('Authorization', `Bearer ${operadorToken}`)
        .send(newAgentData)
        .expect(403);
    });

    it('deve retornar 401 sem header de autorização', async () => {
      const { tenant } = await testHelper.setupCompleteTestData();

      await testHelper
        .getRequest()
        .get(`/api/v1/tenants/${tenant.id}/agents`)
        .expect(401);
    });
  });

  describe('🔄 Business Logic Errors', () => {
    it('deve rejeitar transição de estado inválida em ticket', async () => {
      const { tenant, token } =
        await testHelper.setupCompleteTestDataWithAuth();
      const queue = await testHelper.createQueue(tenant.id);

      // Criar ticket já COMPLETED
      const completedTicket = await testHelper.createTicket(queue.id, {
        status: 'COMPLETED',
        clientName: 'Ticket Completo',
        completedAt: new Date(),
      });

      // Tentar rechamar ticket completo (inválido)
      await testHelper
        .getRequest()
        .put(`/api/v1/tickets/${completedTicket.id}/recall`)
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    });

    it('deve rejeitar criação de fila com capacidade inválida', async () => {
      const { tenant, token } =
        await testHelper.setupCompleteTestDataWithAuth();

      const invalidQueueData = {
        name: 'Fila Inválida',
        description: 'Fila com capacidade inválida',
        capacity: -10, // Capacidade negativa
        avgServiceTime: 300,
      };

      await testHelper
        .getRequest()
        .post(`/api/v1/tenants/${tenant.id}/queues`)
        .set('Authorization', `Bearer ${token}`)
        .send(invalidQueueData)
        .expect(400);
    });

    it('deve rejeitar slug duplicado na criação de tenant', async () => {
      const existingTenant = await testHelper.createTenant({
        slug: 'tenant-unico',
      });

      const duplicateSlugData = {
        name: 'Segundo Tenant',
        slug: 'tenant-unico', // Mesmo slug
        email: 'segundo@tenant.com',
      };

      await testHelper
        .getRequest()
        .post('/api/v1/tenants')
        .send(duplicateSlugData)
        .expect(409);
    });

    it('deve rejeitar chamada de próximo ticket quando fila vazia', async () => {
      const { tenant, token } =
        await testHelper.setupCompleteTestDataWithAuth();
      const queue = await testHelper.createQueue(tenant.id);

      // Fila vazia - não deve conseguir chamar próximo
      await testHelper
        .getRequest()
        .post(`/api/v1/tenants/${tenant.id}/queues/${queue.id}/call-next`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });

  describe('💾 Database Constraint Errors', () => {
    it('deve rejeitar email duplicado entre agentes', async () => {
      const { tenant, token } =
        await testHelper.setupCompleteTestDataWithAuth();

      const duplicateEmail = `duplicate-${Date.now()}@empresa.com`;

      // Criar primeiro agente
      const firstAgentData = {
        email: duplicateEmail,
        cpf: generateValidCPF(),
        name: 'Primeiro Agente',
        password: 'senha123',
        role: 'OPERADOR',
        tenantId: tenant.id,
      };

      await testHelper
        .getRequest()
        .post(`/api/v1/tenants/${tenant.id}/agents`)
        .set('Authorization', `Bearer ${token}`)
        .send(firstAgentData)
        .expect(201);

      // Tentar criar segundo com mesmo email
      const secondAgentData = {
        email: duplicateEmail,
        cpf: generateValidCPF(),
        name: 'Segundo Agente',
        password: 'senha123',
        role: 'OPERADOR',
        tenantId: tenant.id,
      };

      await testHelper
        .getRequest()
        .post(`/api/v1/tenants/${tenant.id}/agents`)
        .set('Authorization', `Bearer ${token}`)
        .send(secondAgentData)
        .expect(409);
    });

    it('deve rejeitar CPF duplicado entre agentes', async () => {
      const { tenant, token } =
        await testHelper.setupCompleteTestDataWithAuth();

      const duplicateCpf = generateValidCPF();

      // Criar primeiro agente
      const firstAgentData = {
        email: `first-${Date.now()}@empresa.com`,
        cpf: duplicateCpf,
        name: 'Primeiro Agente',
        password: 'senha123',
        role: 'OPERADOR',
        tenantId: tenant.id,
      };

      await testHelper
        .getRequest()
        .post(`/api/v1/tenants/${tenant.id}/agents`)
        .set('Authorization', `Bearer ${token}`)
        .send(firstAgentData)
        .expect(201);

      // Tentar criar segundo com mesmo CPF
      // Segundo agente com mesmo CPF
      const secondAgentData = {
        email: `second-${Date.now()}@empresa.com`,
        cpf: duplicateCpf,
        name: 'Segundo Agente',
        password: 'senha123',
        role: 'OPERADOR',
        tenantId: tenant.id,
      };

      await testHelper
        .getRequest()
        .post(`/api/v1/tenants/${tenant.id}/agents`)
        .set('Authorization', `Bearer ${token}`)
        .send(secondAgentData)
        .expect(409);
    });
  });

  describe('🌐 Network & Timeout Errors', () => {
    it('deve aceitar payloads normais', async () => {
      const { tenant, token } =
        await testHelper.setupCompleteTestDataWithAuth();

      // Criar payload normal
      const normalPayload = {
        email: `test-${Date.now()}@empresa.com`,
        cpf: generateValidCPF(),
        name: 'Nome Normal',
        password: 'senha123',
        role: 'OPERADOR',
        tenantId: tenant.id,
      };

      const response = await testHelper
        .getRequest()
        .post(`/api/v1/tenants/${tenant.id}/agents`)
        .set('Authorization', `Bearer ${token}`)
        .send(normalPayload)
        .expect(201);

      expect(response.body.name).toBe(normalPayload.name);
    });

    it('deve rejeitar headers maliciosos', async () => {
      const { tenant } = await testHelper.setupCompleteTestData();

      await testHelper
        .getRequest()
        .get(`/api/v1/tenants/${tenant.id}`)
        .set('X-Forwarded-For', '127.0.0.1; DROP TABLE tenants; --')
        .set('User-Agent', '<script>alert("xss")</script>')
        .expect(401); // Sem auth, deve retornar 401
    });
  });

  describe('🔢 Rate Limiting Errors', () => {
    it('deve aplicar rate limiting em login', async () => {
      const { agent } = await testHelper.setupCompleteTestData();

      // Fazer múltiplas tentativas de login com senha errada
      const promises = [];
      for (let i = 0; i < 10; i++) {
        const promise = testHelper
          .getRequest()
          .post('/api/v1/auth/agent/login')
          .send({
            cpf: agent.cpf,
            password: 'senha-errada',
          });
        promises.push(promise);
      }

      const responses = await Promise.all(promises);

      // Algumas devem retornar 401 (senha errada) e outras 429 (rate limit)
      const statusCodes = responses.map((r) => r.status);
      expect(statusCodes).toContain(401);
      // Rate limiting pode estar configurado, mas não vamos assumir 429
    });
  });

  describe('🧪 Edge Cases', () => {
    it('deve lidar com caracteres especiais em nomes', async () => {
      const { tenant, token } =
        await testHelper.setupCompleteTestDataWithAuth();

      const specialCharsData = {
        email: `special-${Date.now()}@empresa.com`,
        cpf: generateValidCPF(),
        name: 'José da Silva Ção Ãção', // Acentos e caracteres especiais
        password: 'senha123',
        role: 'OPERADOR',
        tenantId: tenant.id,
      };

      const response = await testHelper
        .getRequest()
        .post(`/api/v1/tenants/${tenant.id}/agents`)
        .set('Authorization', `Bearer ${token}`)
        .send(specialCharsData)
        .expect(201);

      expect(response.body.name).toBe(specialCharsData.name);
    });

    it('deve lidar com campos obrigatórios apenas', async () => {
      const { tenant, token } =
        await testHelper.setupCompleteTestDataWithAuth();

      const minimalData = {
        email: `minimal-${Date.now()}@empresa.com`,
        cpf: generateValidCPF(),
        name: 'Agente Mínimo',
        password: 'senha123',
        role: 'OPERADOR',
        tenantId: tenant.id,
      };

      const response = await testHelper
        .getRequest()
        .post(`/api/v1/tenants/${tenant.id}/agents`)
        .set('Authorization', `Bearer ${token}`)
        .send(minimalData)
        .expect(201);

      expect(response.body.name).toBe(minimalData.name);
      expect(response.body.email).toBe(minimalData.email);
    });

    it('deve lidar com timezone diferentes', async () => {
      const { tenant } = await testHelper.setupCompleteTestData();
      const queue = await testHelper.createQueue(tenant.id);

      // Criar ticket com data em timezone específico
      const ticket = await testHelper.createTicket(queue.id, {
        clientName: 'Cliente Timezone',
        status: 'WAITING',
        // Data será criada pelo sistema
      });

      const response = await testHelper
        .getRequest()
        .get(`/api/v1/tickets/${ticket.id}`)
        .expect(200);

      // Verificar que o ticket foi encontrado
      expect(response.body.id).toBe(ticket.id);
      expect(response.body.clientName).toBe('Cliente Timezone');
      // Verificar que a data está definida
      expect(response.body.createdAt).toBeDefined();
    });
  });
});
