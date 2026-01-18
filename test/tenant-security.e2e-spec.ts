const request = require('supertest');
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

describe('Tenant Security System (e2e)', () => {
  let testHelper: TestHelper;
  let tenant1: any;
  let tenant2: any;
  let admin1Token: string;
  let agent1Token: string;

  // CPFs válidos para uso consistente nos testes
  const admin1Cpf = generateValidCPF();
  const agent1Cpf = generateValidCPF();
  const admin2Cpf = generateValidCPF();

  beforeAll(async () => {
    testHelper = await TestHelper.createInstance();

    // Criar tenants de teste
    tenant1 = await testHelper.createTenant({
      name: 'Empresa Teste 1',
      slug: 'empresa-teste-1',
      email: 'teste1@empresa.com',
    });

    tenant2 = await testHelper.createTenant({
      name: 'Empresa Teste 2',
      slug: 'empresa-teste-2',
      email: 'teste2@empresa.com',
    });

    // Criar agentes de teste
    const bcrypt = await import('bcrypt');

    await testHelper.createAgent(tenant1.id, {
      email: 'admin1@empresa1.com',
      name: 'Admin Empresa 1',
      password: await bcrypt.hash('senha123', 10),
      role: 'ADMINISTRADOR',
      cpf: admin1Cpf,
    });

    await testHelper.createAgent(tenant1.id, {
      email: 'agent1@empresa1.com',
      name: 'Agente Empresa 1',
      password: await bcrypt.hash('senha123', 10),
      role: 'OPERADOR',
      cpf: agent1Cpf,
    });

    await testHelper.createAgent(tenant2.id, {
      email: 'admin2@empresa2.com',
      name: 'Admin Empresa 2',
      password: await bcrypt.hash('senha123', 10),
      role: 'ADMINISTRADOR',
      cpf: admin2Cpf,
    });
  });

  afterAll(async () => {
    await testHelper.afterAll();
  });

  beforeEach(async () => {
    await testHelper.beforeEach();

    // Recriar os tenants após a limpeza do banco
    tenant1 = await testHelper.createTenant({
      name: 'Empresa Teste 1',
      slug: 'empresa-teste-1',
      email: 'teste1@empresa.com',
    });

    tenant2 = await testHelper.createTenant({
      name: 'Empresa Teste 2',
      slug: 'empresa-teste-2',
      email: 'teste2@empresa.com',
    });

    // Recriar os agentes após a limpeza do banco
    const bcrypt = await import('bcrypt');

    await testHelper.createAgent(tenant1.id, {
      email: 'admin1@empresa1.com',
      name: 'Admin Empresa 1',
      password: await bcrypt.hash('senha123', 10),
      role: 'ADMINISTRADOR',
      cpf: admin1Cpf,
    });

    await testHelper.createAgent(tenant1.id, {
      email: 'agent1@empresa1.com',
      name: 'Agente Empresa 1',
      password: await bcrypt.hash('senha123', 10),
      role: 'OPERADOR',
      cpf: agent1Cpf,
    });

    // Gerar tokens após recriar os agentes
    const admin1Response = await request(testHelper.app.getHttpServer())
      .post('/api/v1/auth/agent/login')
      .send({
        cpf: admin1Cpf,
        password: 'senha123',
      });

    admin1Token = admin1Response.body.access_token;

    const agent1Response = await request(testHelper.app.getHttpServer())
      .post('/api/v1/auth/agent/login')
      .send({
        cpf: agent1Cpf,
        password: 'senha123',
      });

    agent1Token = agent1Response.body.access_token;
  });

  describe('Autenticação e Controle de Acesso', () => {
    describe('Acesso a Tenants', () => {
      it('deve permitir que admin veja seu próprio tenant', async () => {
        const response = await request(testHelper.app.getHttpServer())
          .get(`/api/v1/tenants/${tenant1.id}`)
          .set('Authorization', `Bearer ${admin1Token}`)
          .expect(200);

        expect(response.body.id).toBe(tenant1.id);
      });

      it('deve permitir que agente veja seu próprio tenant', async () => {
        const response = await request(testHelper.app.getHttpServer())
          .get(`/api/v1/tenants/${tenant1.id}`)
          .set('Authorization', `Bearer ${agent1Token}`)
          .expect(200);

        expect(response.body.id).toBe(tenant1.id);
      });

      it('deve negar acesso a tenant de outra empresa', async () => {
        await request(testHelper.app.getHttpServer())
          .get(`/api/v1/tenants/${tenant2.id}`)
          .set('Authorization', `Bearer ${admin1Token}`)
          .expect(403);
      });

      it('deve negar acesso a tenant de outra empresa para agente', async () => {
        await request(testHelper.app.getHttpServer())
          .get(`/api/v1/tenants/${tenant2.id}`)
          .set('Authorization', `Bearer ${agent1Token}`)
          .expect(403);
      });
    });

    describe('Gerenciamento de Agentes', () => {
      it('deve permitir que admin crie agente em seu tenant', async () => {
        const newAgent = {
          email: `novo-agente-${Date.now()}@empresa.com`,
          name: 'Novo Agente',
          password: 'senha123',
          role: 'OPERADOR',
          cpf: generateValidCPF(),
          tenantId: tenant1.id,
        };

        const response = await request(testHelper.app.getHttpServer())
          .post(`/api/v1/tenants/${tenant1.id}/agents`)
          .set('Authorization', `Bearer ${admin1Token}`)
          .send(newAgent)
          .expect(201);

        expect(response.body.email).toBe(newAgent.email);
        expect(response.body.tenantId).toBe(tenant1.id);
      });

      it('deve negar que agente crie outro agente', async () => {
        const newAgent = {
          email: `agente-falso-${Date.now()}@empresa.com`,
          name: 'Agente Falso',
          password: 'senha123',
          role: 'OPERADOR',
          cpf: generateValidCPF(),
          tenantId: tenant1.id,
        };

        await request(testHelper.app.getHttpServer())
          .post(`/api/v1/tenants/${tenant1.id}/agents`)
          .set('Authorization', `Bearer ${agent1Token}`)
          .send(newAgent)
          .expect(403);
      });

      it('deve negar que admin crie agente em outro tenant', async () => {
        const newAgent = {
          email: 'invasor@empresa2.com',
          name: 'Agente Invasor',
          password: 'senha123',
          role: 'OPERADOR',
          cpf: generateValidCPF(),
          tenantId: tenant2.id,
        };

        await request(testHelper.app.getHttpServer())
          .post(`/api/v1/tenants/${tenant2.id}/agents`)
          .set('Authorization', `Bearer ${admin1Token}`)
          .send(newAgent)
          .expect(403);
      });

      it('deve permitir que admin liste agentes de seu tenant', async () => {
        const response = await request(testHelper.app.getHttpServer())
          .get(`/api/v1/tenants/${tenant1.id}/agents`)
          .set('Authorization', `Bearer ${admin1Token}`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(0);
      });

      it('deve negar que admin liste agentes de outro tenant', async () => {
        await request(testHelper.app.getHttpServer())
          .get(`/api/v1/tenants/${tenant2.id}/agents`)
          .set('Authorization', `Bearer ${admin1Token}`)
          .expect(403);
      });
    });

    describe('Gerenciamento de Filas', () => {
      it('deve permitir que agente veja filas de seu tenant', async () => {
        const response = await request(testHelper.app.getHttpServer())
          .get(`/api/v1/tenants/${tenant1.id}/queues`)
          .set('Authorization', `Bearer ${agent1Token}`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        response.body.forEach((queue: any) => {
          expect(queue.tenantId).toBe(tenant1.id);
        });
      });

      it('deve negar que agente veja filas de outro tenant', async () => {
        await request(testHelper.app.getHttpServer())
          .get(`/api/v1/tenants/${tenant2.id}/queues`)
          .set('Authorization', `Bearer ${agent1Token}`)
          .expect(403);
      });

      it('deve permitir que agente crie fila em seu tenant', async () => {
        const newQueue = {
          name: 'Nova Fila',
          description: 'Fila criada pelo agente',
        };

        const response = await request(testHelper.app.getHttpServer())
          .post(`/api/v1/tenants/${tenant1.id}/queues`)
          .set('Authorization', `Bearer ${agent1Token}`)
          .send(newQueue)
          .expect(201);

        expect(response.body.name).toBe(newQueue.name);
        expect(response.body.tenantId).toBe(tenant1.id);
      });
    });

    describe('Operações de Tickets', () => {
      it('deve permitir que agente complete ticket de sua fila', async () => {
        // Criar fila no tenant1
        const queue = await testHelper.prisma.queue.create({
          data: {
            name: 'Fila Teste',
            description: 'Fila para teste de tickets',
            isActive: true,
            tenantId: tenant1.id,
          },
        });

        // Criar ticket na fila
        const ticket1 = await testHelper.prisma.ticket.create({
          data: {
            myCallingToken: 'T001',
            priority: 1,
            status: 'CALLED',
            queueId: queue.id,
          },
        });

        await request(testHelper.app.getHttpServer())
          .put(`/api/v1/tickets/${ticket1.id}/complete`)
          .set('Authorization', `Bearer ${agent1Token}`)
          .expect(200);
      });

      it('deve negar que agente complete ticket de outra empresa', async () => {
        // Recriar tenant2 se foi removido pela limpeza
        if (!tenant2 || !tenant2.id) {
          tenant2 = await testHelper.createTenant({
            name: 'Empresa Teste 2',
            slug: 'empresa-teste-2',
            email: 'teste2@empresa.com',
          });
        }

        // Criar ticket em tenant2
        const queue2 = await testHelper.prisma.queue.create({
          data: {
            name: 'Fila Empresa 2',
            description: 'Fila da empresa 2',
            isActive: true,
            tenantId: tenant2.id,
          },
        });

        const ticket2 = await testHelper.prisma.ticket.create({
          data: {
            myCallingToken: 'T002',
            priority: 1, // NORMAL = 1
            status: 'CALLED', // CALLED para permitir completar
            queueId: queue2.id,
          },
        });

        await request(testHelper.app.getHttpServer())
          .put(`/api/v1/tickets/${ticket2.id}/complete`)
          .set('Authorization', `Bearer ${agent1Token}`)
          .expect(403);
      });
    });
  });

  describe('Validações de Segurança', () => {
    it('deve negar acesso sem token', async () => {
      await request(testHelper.app.getHttpServer())
        .get(`/api/v1/tenants/${tenant1.id}`)
        .expect(401);
    });

    it('deve negar acesso com token inválido', async () => {
      await request(testHelper.app.getHttpServer())
        .get(`/api/v1/tenants/${tenant1.id}`)
        .set('Authorization', 'Bearer token-invalido')
        .expect(401);
    });

    it('deve negar acesso de cliente a recursos de agente', async () => {
      // Simular token de cliente (sem role de agente)
      const clientToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbGllbnQtaWQiLCJyb2xlIjoiQ0xJRU5UIiwidGVuYW50SWQiOiJ0ZW5hbnQtaWQiLCJ1c2VyVHlwZSI6ImNsaWVudCJ9.invalid-signature';

      await request(testHelper.app.getHttpServer())
        .get(`/api/v1/tenants/${tenant1.id}/agents`)
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(401);
    });
  });
});
