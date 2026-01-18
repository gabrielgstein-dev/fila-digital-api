import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
const request = require('supertest');
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { cleanDatabase, teardownTestDatabase } from './setup-database';
import * as bcrypt from 'bcrypt';

describe('Clients Endpoints (e2e)', () => {
  jest.setTimeout(30000);
  let app: INestApplication;
  let prisma: PrismaService;
  let tenant: any;
  let agent: any;
  let authToken: string;
  let queues: any[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          envFilePath: '.env.test',
          isGlobal: true,
        }),
        AppModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get<PrismaService>(PrismaService);

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    app.setGlobalPrefix('api/v1');

    await app.init();
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);

    // Criar tenant
    tenant = await prisma.tenant.create({
      data: {
        name: 'Centro Clínico Client Test',
        slug: `centro-client-test-${Date.now()}`,
        email: `client-test-${Date.now()}@test.com`,
      },
    });

    // Criar agente admin
    agent = await prisma.agent.create({
      data: {
        email: `admin-client-test-${Date.now()}@test.com`,
        name: 'Admin Client Test',
        password: await bcrypt.hash('senha123', 10),
        role: 'ADMINISTRADOR',
        tenantId: tenant.id,
        cpf: `1234567890${Date.now()}`,
      },
    });

    // Fazer login
    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/agent/login')
      .send({
        cpf: agent.cpf,
        password: 'senha123',
      });

    authToken = loginResponse.body.access_token;

    // Criar múltiplas filas
    const queueData = [
      {
        name: 'Endocrinologia',
        description: 'Consultas endócrinas',
        queueType: 'GENERAL',
        capacity: 20,
        avgServiceTime: 900,
      },
      {
        name: 'Pediatria',
        description: 'Consultas pediátricas',
        queueType: 'PRIORITY',
        capacity: 15,
        avgServiceTime: 1200,
      },
    ];

    queues = [];
    for (const data of queueData) {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/tenants/${tenant.id}/queues`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(data);

      queues.push(response.body);
    }
  });

  afterAll(async () => {
    await teardownTestDatabase(prisma);
    await app.close();
  });

  describe('GET /clients/my-tickets', () => {
    it('deve buscar senhas do cliente por telefone', async () => {
      const clientPhone = '(11) 99999-1111';

      // Cliente tira senhas em 2 filas diferentes
      const ticket1 = await request(app.getHttpServer())
        .post(`/api/v1/queues/${queues[0].id}/tickets`)
        .send({
          clientName: 'Maria Silva',
          clientPhone: clientPhone,
          priority: 1,
        });

      const ticket2 = await request(app.getHttpServer())
        .post(`/api/v1/queues/${queues[1].id}/tickets`)
        .send({
          clientName: 'Maria Silva',
          clientPhone: clientPhone,
          priority: 2,
        });

      // Buscar todas as senhas do cliente
      const response = await request(app.getHttpServer())
        .get('/api/v1/clients/my-tickets')
        .query({ phone: clientPhone })
        .expect(200);

      expect(response.body.client.identifier).toBe(clientPhone);
      expect(response.body.client.totalActiveTickets).toBe(2);
      expect(response.body.tickets).toHaveLength(2);

      // Verificar se contém informações das filas
      const endoTicket = response.body.tickets.find(
        (t) => t.queue.name === 'Endocrinologia',
      );
      const pedTicket = response.body.tickets.find(
        (t) => t.queue.name === 'Pediatria',
      );

      expect(endoTicket).toBeDefined();
      expect(pedTicket).toBeDefined();
      expect(endoTicket.position).toBe(1);
      expect(pedTicket.position).toBe(1);
    });

    it('deve buscar senhas do cliente por email', async () => {
      const clientEmail = 'cliente@test.com';

      // Cliente tira senha
      await request(app.getHttpServer())
        .post(`/api/v1/queues/${queues[0].id}/tickets`)
        .send({
          clientName: 'João Santos',
          clientEmail: clientEmail,
          priority: 1,
        });

      const response = await request(app.getHttpServer())
        .get('/api/v1/clients/my-tickets')
        .query({ email: clientEmail })
        .expect(200);

      expect(response.body.client.identifier).toBe(clientEmail);
      expect(response.body.client.totalActiveTickets).toBe(1);
      expect(response.body.tickets[0].queue.name).toBe('Endocrinologia');
    });

    it('deve retornar erro se não informar telefone ou email', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/clients/my-tickets')
        .expect(400);
    });

    it('deve retornar 404 se cliente não tiver senhas ativas', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/clients/my-tickets')
        .query({ phone: '(11) 99999-9999' })
        .expect(404);
    });

    it('deve calcular posições corretamente com múltiplos clientes', async () => {
      const clientPhone = '(11) 99999-1111';

      // Primeiro cliente tira senha
      await request(app.getHttpServer())
        .post(`/api/v1/queues/${queues[0].id}/tickets`)
        .send({
          clientName: 'Primeiro Cliente',
          clientPhone: '(11) 99999-0000',
          priority: 1,
        });

      // Nosso cliente tira senha (deve ser 2º)
      await request(app.getHttpServer())
        .post(`/api/v1/queues/${queues[0].id}/tickets`)
        .send({
          clientName: 'Nosso Cliente',
          clientPhone: clientPhone,
          priority: 1,
        });

      // Terceiro cliente tira senha
      await request(app.getHttpServer())
        .post(`/api/v1/queues/${queues[0].id}/tickets`)
        .send({
          clientName: 'Terceiro Cliente',
          clientPhone: '(11) 99999-2222',
          priority: 1,
        });

      const response = await request(app.getHttpServer())
        .get('/api/v1/clients/my-tickets')
        .query({ phone: clientPhone })
        .expect(200);

      expect(response.body.tickets[0].position).toBe(2);
    });
  });

  describe('GET /clients/dashboard', () => {
    it('deve retornar dashboard consolidado do cliente', async () => {
      const clientPhone = '(11) 99999-1111';

      // Cliente tira senhas em 2 filas
      await request(app.getHttpServer())
        .post(`/api/v1/queues/${queues[0].id}/tickets`)
        .send({
          clientName: 'Maria Silva',
          clientPhone: clientPhone,
          priority: 1,
        });

      await request(app.getHttpServer())
        .post(`/api/v1/queues/${queues[1].id}/tickets`)
        .send({
          clientName: 'Maria Silva',
          clientPhone: clientPhone,
          priority: 3, // VIP
        });

      const response = await request(app.getHttpServer())
        .get('/api/v1/clients/dashboard')
        .query({ phone: clientPhone })
        .expect(200);

      expect(response.body.client.identifier).toBe(clientPhone);
      expect(response.body.summary.totalWaiting).toBe(2);
      expect(response.body.summary.totalCalled).toBe(0);
      expect(response.body.summary.establishmentsCount).toBe(1);
      expect(response.body.tickets).toHaveLength(1); // 1 establishment
      expect(response.body.realTimeMetrics).toBeDefined();
    });

    it('deve calcular próxima chamada estimada', async () => {
      const clientPhone = '(11) 99999-1111';

      // Cliente tira senhas em filas com tempos diferentes
      await request(app.getHttpServer())
        .post(`/api/v1/queues/${queues[0].id}/tickets`)
        .send({
          clientName: 'Maria Silva',
          clientPhone: clientPhone,
          priority: 1,
        });

      await request(app.getHttpServer())
        .post(`/api/v1/queues/${queues[1].id}/tickets`)
        .send({
          clientName: 'Maria Silva',
          clientPhone: clientPhone,
          priority: 1,
        });

      const response = await request(app.getHttpServer())
        .get('/api/v1/clients/dashboard')
        .query({ phone: clientPhone })
        .expect(200);

      // Próxima chamada deve ser a menor entre as duas filas
      expect(response.body.summary.nextCallEstimate).toBeDefined();
      expect(response.body.summary.nextCallEstimate).toBeGreaterThan(0);
    });
  });

  describe('GET /clients/queue-metrics', () => {
    it('deve retornar métricas em tempo real da fila', async () => {
      // Criar alguns tickets e simular chamadas
      const ticket1 = await request(app.getHttpServer())
        .post(`/api/v1/queues/${queues[0].id}/tickets`)
        .send({
          clientName: 'Cliente 1',
          clientPhone: '(11) 99999-0001',
          priority: 1,
        });

      const ticket2 = await request(app.getHttpServer())
        .post(`/api/v1/queues/${queues[0].id}/tickets`)
        .send({
          clientName: 'Cliente 2',
          clientPhone: '(11) 99999-0002',
          priority: 1,
        });

      // Chamar primeiro ticket
      await request(app.getHttpServer())
        .post(`/api/v1/tenants/${tenant.id}/queues/${queues[0].id}/call-next`)
        .set('Authorization', `Bearer ${authToken}`);

      const response = await request(app.getHttpServer())
        .get('/api/v1/clients/queue-metrics')
        .query({ queueId: queues[0].id })
        .expect(200);

      expect(response.body.queue.id).toBe(queues[0].id);
      expect(response.body.queue.name).toBe('Endocrinologia');
      expect(response.body.currentMetrics).toBeDefined();
      expect(response.body.currentMetrics.serviceSpeed).toBeDefined();
      expect(response.body.currentMetrics.trendDirection).toMatch(
        /accelerating|stable|slowing/,
      );
      expect(response.body.predictions).toBeDefined();
      expect(response.body.predictions.nextCallIn).toBeDefined();
      expect(response.body.predictions.queueClearTime).toBeDefined();
    });

    it('deve retornar erro para fila inexistente', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/clients/queue-metrics')
        .query({ queueId: 'invalid-id' })
        .expect(404);
    });
  });

  describe('Cenário completo do APP cliente', () => {
    it('deve simular fluxo completo do APP', async () => {
      const clientPhone = '(11) 99999-1111';

      // 1. Cliente tira senhas em múltiplas filas
      const ticket1Response = await request(app.getHttpServer())
        .post(`/api/v1/queues/${queues[0].id}/tickets`)
        .send({
          clientName: 'Maria Silva',
          clientPhone: clientPhone,
          clientEmail: 'maria@test.com',
          priority: 1,
        });

      const ticket2Response = await request(app.getHttpServer())
        .post(`/api/v1/queues/${queues[1].id}/tickets`)
        .send({
          clientName: 'Maria Silva',
          clientPhone: clientPhone,
          clientEmail: 'maria@test.com',
          priority: 2,
        });

      // 2. Cliente consulta dashboard
      const dashboardResponse = await request(app.getHttpServer())
        .get('/api/v1/clients/dashboard')
        .query({ phone: clientPhone })
        .expect(200);

      expect(dashboardResponse.body.summary.totalWaiting).toBe(2);

      // 3. Cliente consulta métricas específicas de uma fila
      const metricsResponse = await request(app.getHttpServer())
        .get('/api/v1/clients/queue-metrics')
        .query({ queueId: queues[0].id })
        .expect(200);

      expect(metricsResponse.body.currentMetrics).toBeDefined();

      // 4. Simular chamada de um ticket
      await request(app.getHttpServer())
        .post(`/api/v1/tenants/${tenant.id}/queues/${queues[1].id}/call-next`)
        .set('Authorization', `Bearer ${authToken}`);

      // 5. Cliente consulta novamente suas senhas
      const updatedTicketsResponse = await request(app.getHttpServer())
        .get('/api/v1/clients/my-tickets')
        .query({ phone: clientPhone })
        .expect(200);

      // Uma senha deve estar chamada, outra aguardando
      const calledTicket = updatedTicketsResponse.body.tickets.find(
        (t) => t.status === 'CALLED',
      );
      const waitingTicket = updatedTicketsResponse.body.tickets.find(
        (t) => t.status === 'WAITING',
      );

      expect(calledTicket).toBeDefined();
      expect(waitingTicket).toBeDefined();
      expect(calledTicket.position).toBe(0);
      expect(waitingTicket.position).toBe(1);
    });
  });
});
