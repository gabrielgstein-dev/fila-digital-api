import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { cleanDatabase, teardownTestDatabase } from './setup-database';
import * as bcrypt from 'bcrypt';

describe('All Tickets Endpoint (e2e)', () => {
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
        name: 'Centro Clínico All Tickets Test',
        slug: `centro-all-tickets-${Date.now()}`,
        email: `all-tickets-${Date.now()}@test.com`,
      },
    });

    // Criar agente admin
    agent = await prisma.agent.create({
      data: {
        email: `admin-all-tickets-${Date.now()}@test.com`,
        name: 'Admin All Tickets',
        password: await bcrypt.hash('senha123', 10),
        role: 'ADMIN',
        tenantId: tenant.id,
      },
    });

    // Fazer login
    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: agent.email,
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
      {
        name: 'Raio-X',
        description: 'Exames de radiografia',
        queueType: 'GENERAL',
        capacity: 10,
        avgServiceTime: 300,
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

  describe('GET /tenants/:tenantId/queues/all-tickets', () => {
    it('deve retornar visão consolidada sem tickets', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/tenants/${tenant.id}/queues/all-tickets`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('summary');
      expect(response.body).toHaveProperty('queues');

      // Verificar resumo
      expect(response.body.summary.totalQueues).toBe(3);
      expect(response.body.summary.totalWaiting).toBe(0);
      expect(response.body.summary.totalCalled).toBe(0);
      expect(response.body.summary.totalCompleted).toBe(0);
      expect(response.body.summary.avgWaitTime).toBe(0);

      // Verificar filas
      expect(response.body.queues).toHaveLength(3);
      expect(response.body.queues[0]).toHaveProperty('name');
      expect(response.body.queues[0]).toHaveProperty('tickets');
      expect(response.body.queues[0].tickets).toHaveLength(0);
    });

    it('deve retornar visão consolidada com tickets em múltiplas filas', async () => {
      // Criar tickets em diferentes filas
      const ticketsData = [
        {
          queueId: queues[0].id, // Endocrinologia
          clients: [
            { name: 'Maria Silva', phone: '(11) 99999-1111', priority: 1 },
            { name: 'João Santos', phone: '(11) 99999-2222', priority: 2 },
          ],
        },
        {
          queueId: queues[1].id, // Pediatria
          clients: [
            { name: 'Ana Costa', phone: '(11) 99999-3333', priority: 3 },
          ],
        },
        {
          queueId: queues[2].id, // Raio-X
          clients: [
            { name: 'Pedro Oliveira', phone: '(11) 99999-4444', priority: 1 },
            { name: 'Carla Lima', phone: '(11) 99999-5555', priority: 1 },
          ],
        },
      ];

      // Criar tickets
      for (const queueTickets of ticketsData) {
        for (const client of queueTickets.clients) {
          await request(app.getHttpServer())
            .post(`/api/v1/queues/${queueTickets.queueId}/tickets`)
            .send({
              clientName: client.name,
              clientPhone: client.phone,
              priority: client.priority,
            });
        }
      }

      // Chamar próximo em uma fila (Endocrinologia)
      await request(app.getHttpServer())
        .post(`/api/v1/tenants/${tenant.id}/queues/${queues[0].id}/call-next`)
        .set('Authorization', `Bearer ${authToken}`);

      // Buscar visão consolidada
      const response = await request(app.getHttpServer())
        .get(`/api/v1/tenants/${tenant.id}/queues/all-tickets`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verificar resumo
      expect(response.body.summary.totalQueues).toBe(3);
      expect(response.body.summary.totalWaiting).toBe(4); // 1 + 1 + 2
      expect(response.body.summary.totalCalled).toBe(1);
      expect(response.body.summary.avgWaitTime).toBeGreaterThan(0);

      // Verificar filas
      expect(response.body.queues).toHaveLength(3);

      // Verificar fila Endocrinologia
      const endoQueue = response.body.queues.find(
        (q) => q.name === 'Endocrinologia',
      );
      expect(endoQueue.totalWaiting).toBe(1);
      expect(endoQueue.totalCalled).toBe(1);
      expect(endoQueue.currentNumber).toBeGreaterThan(0);
      expect(endoQueue.tickets).toHaveLength(2);

      // Verificar fila Pediatria
      const pedQueue = response.body.queues.find((q) => q.name === 'Pediatria');
      expect(pedQueue.totalWaiting).toBe(1);
      expect(pedQueue.totalCalled).toBe(0);
      expect(pedQueue.tickets).toHaveLength(1);
      expect(pedQueue.tickets[0].priority).toBe(3); // VIP

      // Verificar fila Raio-X
      const raioQueue = response.body.queues.find((q) => q.name === 'Raio-X');
      expect(raioQueue.totalWaiting).toBe(2);
      expect(raioQueue.totalCalled).toBe(0);
      expect(raioQueue.tickets).toHaveLength(2);
    });

    it('deve calcular posições corretamente baseado na prioridade', async () => {
      // Criar tickets com diferentes prioridades
      const clients = [
        { name: 'Cliente Normal 1', priority: 1 },
        { name: 'Cliente VIP', priority: 3 },
        { name: 'Cliente Normal 2', priority: 1 },
        { name: 'Cliente Prioritário', priority: 2 },
      ];

      for (const client of clients) {
        await request(app.getHttpServer())
          .post(`/api/v1/queues/${queues[0].id}/tickets`)
          .send({
            clientName: client.name,
            clientPhone: '(11) 99999-0000',
            priority: client.priority,
          });
      }

      const response = await request(app.getHttpServer())
        .get(`/api/v1/tenants/${tenant.id}/queues/all-tickets`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const endoQueue = response.body.queues.find(
        (q) => q.name === 'Endocrinologia',
      );
      const tickets = endoQueue.tickets.filter((t) => t.status === 'WAITING');

      // Verificar ordem: VIP (3) -> Prioritário (2) -> Normal 1 -> Normal 2
      expect(tickets[0].clientName).toBe('Cliente VIP');
      expect(tickets[0].position).toBe(1);
      expect(tickets[1].clientName).toBe('Cliente Prioritário');
      expect(tickets[1].position).toBe(2);
      expect(tickets[2].clientName).toBe('Cliente Normal 1');
      expect(tickets[2].position).toBe(3);
      expect(tickets[3].clientName).toBe('Cliente Normal 2');
      expect(tickets[3].position).toBe(4);
    });

    it('deve incluir informações detalhadas dos tickets', async () => {
      // Criar um ticket
      await request(app.getHttpServer())
        .post(`/api/v1/queues/${queues[0].id}/tickets`)
        .send({
          clientName: 'Teste Detalhado',
          clientPhone: '(11) 99999-7777',
          clientEmail: 'teste@detalhado.com',
          priority: 2,
        });

      const response = await request(app.getHttpServer())
        .get(`/api/v1/tenants/${tenant.id}/queues/all-tickets`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const endoQueue = response.body.queues.find(
        (q) => q.name === 'Endocrinologia',
      );
      const ticket = endoQueue.tickets[0];

      // Verificar propriedades do ticket
      expect(ticket).toHaveProperty('id');
      expect(ticket).toHaveProperty('number');
      expect(ticket.clientName).toBe('Teste Detalhado');
      expect(ticket.clientPhone).toBe('(11) 99999-7777');
      expect(ticket.clientEmail).toBe('teste@detalhado.com');
      expect(ticket.status).toBe('WAITING');
      expect(ticket.priority).toBe(2);
      expect(ticket.position).toBe(1);
      expect(ticket).toHaveProperty('estimatedTime');
      expect(ticket).toHaveProperty('createdAt');
    });

    it('deve exigir autenticação', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/tenants/${tenant.id}/queues/all-tickets`)
        .expect(401);
    });

    it('deve validar acesso por tenant', async () => {
      // Criar outro tenant
      const otherTenant = await prisma.tenant.create({
        data: {
          name: 'Outro Tenant',
          slug: `outro-tenant-${Date.now()}`,
          email: `outro-${Date.now()}@test.com`,
        },
      });

      await request(app.getHttpServer())
        .get(`/api/v1/tenants/${otherTenant.id}/queues/all-tickets`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);
    });

    it('deve atualizar lastUpdated', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/tenants/${tenant.id}/queues/all-tickets`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.summary).toHaveProperty('lastUpdated');
      expect(new Date(response.body.summary.lastUpdated)).toBeInstanceOf(Date);
    });
  });
});
