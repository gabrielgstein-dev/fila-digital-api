import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { cleanDatabase, teardownTestDatabase } from './setup-database';

describe('QueuesController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenant: any;
  let authToken: string;

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

    tenant = await prisma.tenant.create({
      data: {
        name: 'Empresa Teste',
        slug: `empresa-teste-${Date.now()}`,
        email: 'contato@empresa.com',
      },
    });

    const agentCpf = `1234567890${Date.now()}`.slice(-11); // Garantir exatamente 11 dígitos

    await prisma.agent.create({
      data: {
        email: `admin-${Date.now()}@empresa.com`,
        name: 'Admin Teste',
        password: await bcrypt.hash('senha123', 10),
        role: 'ADMINISTRADOR',
        tenantId: tenant.id,
        cpf: agentCpf,
      },
    });

    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/agent/login')
      .send({
        cpf: agentCpf,
        password: 'senha123',
      });

    authToken = loginResponse.body.access_token;
  });

  afterAll(async () => {
    await teardownTestDatabase(prisma);
    await app.close();
  });

  describe('/tenants/:tenantId/queues (GET)', () => {
    it('deve listar filas do tenant', async () => {
      // Criar fila via API
      const queueData = {
        name: 'Fila Teste',
        description: 'Descrição da fila teste',
        queueType: 'GENERAL',
      };

      const createResponse = await request(app.getHttpServer())
        .post(`/api/v1/tenants/${tenant.id}/queues`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(queueData)
        .expect(201);

      const queue = createResponse.body;

      // Listar filas
      const response = await request(app.getHttpServer())
        .get(`/api/v1/tenants/${tenant.id}/queues`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].name).toBe('Fila Teste');
      expect(response.body[0].id).toBe(queue.id);
    });

    it('deve retornar lista vazia para tenant sem filas', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/tenants/${tenant.id}/queues`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveLength(0);
    });
  });

  describe('/tenants/:tenantId/queues (POST)', () => {
    it('deve criar nova fila com autenticação', async () => {
      const queueData = {
        name: 'Nova Fila',
        description: 'Descrição da nova fila',
        queueType: 'PRIORITY',
        capacity: 30,
        avgServiceTime: 600,
      };

      const response = await request(app.getHttpServer())
        .post(`/api/v1/tenants/${tenant.id}/queues`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(queueData)
        .expect(201);

      expect(response.body.name).toBe(queueData.name);
      expect(response.body.queueType).toBe(queueData.queueType);
      expect(response.body.capacity).toBe(queueData.capacity);
      expect(response.body.tenantId).toBe(tenant.id);
    });

    it('deve rejeitar criação sem autenticação', async () => {
      const queueData = {
        name: 'Nova Fila',
        description: 'Descrição da nova fila',
      };

      await request(app.getHttpServer())
        .post(`/api/v1/tenants/${tenant.id}/queues`)
        .send(queueData)
        .expect(401);
    });

    it('deve validar dados da fila', async () => {
      const queueData = {
        name: 'A',
        capacity: -1,
      };

      await request(app.getHttpServer())
        .post(`/api/v1/tenants/${tenant.id}/queues`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(queueData)
        .expect(400);
    });
  });

  describe('/tenants/:tenantId/queues/:id (GET)', () => {
    it('deve buscar fila específica', async () => {
      // Criar fila via API
      const queueData = {
        name: 'Fila Específica',
        queueType: 'VIP',
      };

      const createResponse = await request(app.getHttpServer())
        .post(`/api/v1/tenants/${tenant.id}/queues`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(queueData)
        .expect(201);

      const queue = createResponse.body;

      const response = await request(app.getHttpServer())
        .get(`/api/v1/tenants/${tenant.id}/queues/${queue.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe(queue.id);
      expect(response.body.name).toBe('Fila Específica');
      expect(response.body.queueType).toBe('VIP');
    });

    it('deve retornar 404 para fila inexistente', async () => {
      const fakeId = '507f1f77bcf86cd799439011';

      await request(app.getHttpServer())
        .get(`/api/v1/tenants/${tenant.id}/queues/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('/tenants/:tenantId/queues/:id (DELETE)', () => {
    it('deve deletar fila sem tickets ativos', async () => {
      // Criar fila via API
      const queueData = {
        name: 'Fila para Deletar',
        queueType: 'GENERAL',
      };

      const createResponse = await request(app.getHttpServer())
        .post(`/api/v1/tenants/${tenant.id}/queues`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(queueData)
        .expect(201);

      const queue = createResponse.body;

      const deleteResponse = await request(app.getHttpServer())
        .delete(`/api/v1/tenants/${tenant.id}/queues/${queue.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(deleteResponse.body.isActive).toBe(false);
    });

    it('deve retornar erro ao tentar deletar fila com tickets aguardando', async () => {
      // Criar fila via API
      const queueData = {
        name: 'Fila com Tickets',
        queueType: 'GENERAL',
      };

      const createQueueResponse = await request(app.getHttpServer())
        .post(`/api/v1/tenants/${tenant.id}/queues`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(queueData)
        .expect(201);

      const queue = createQueueResponse.body;

      // Criar ticket na fila
      const ticketData = {
        clientName: 'Cliente Teste',
        clientPhone: '(11) 99999-0000',
        priority: 1,
      };

      await request(app.getHttpServer())
        .post(`/api/v1/queues/${queue.id}/tickets`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(ticketData)
        .expect(201);

      // Tentar deletar fila com ticket ativo
      const deleteResponse = await request(app.getHttpServer())
        .delete(`/api/v1/tenants/${tenant.id}/queues/${queue.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(deleteResponse.body.message).toBe('QUEUE_HAS_ACTIVE_TICKETS');
    });

    it('deve retornar erro ao tentar deletar fila com tickets chamados', async () => {
      // Criar fila via API
      const queueData = {
        name: 'Fila com Tickets Chamados',
        queueType: 'GENERAL',
      };

      const createQueueResponse = await request(app.getHttpServer())
        .post(`/api/v1/tenants/${tenant.id}/queues`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(queueData)
        .expect(201);

      const queue = createQueueResponse.body;

      // Criar ticket na fila
      const ticketData = {
        clientName: 'Cliente Teste',
        clientPhone: '(11) 99999-0000',
        priority: 1,
      };

      await request(app.getHttpServer())
        .post(`/api/v1/queues/${queue.id}/tickets`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(ticketData)
        .expect(201);

      // Chamar o ticket
      await request(app.getHttpServer())
        .post(`/api/v1/tenants/${tenant.id}/queues/${queue.id}/call-next`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      // Tentar deletar fila com ticket chamado
      const deleteResponse = await request(app.getHttpServer())
        .delete(`/api/v1/tenants/${tenant.id}/queues/${queue.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(deleteResponse.body.message).toBe('QUEUE_HAS_ACTIVE_TICKETS');
    });

    it('deve permitir deletar fila com tickets concluídos', async () => {
      // Criar fila via API
      const queueData = {
        name: 'Fila com Tickets Concluídos',
        queueType: 'GENERAL',
      };

      const createQueueResponse = await request(app.getHttpServer())
        .post(`/api/v1/tenants/${tenant.id}/queues`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(queueData)
        .expect(201);

      const queue = createQueueResponse.body;

      // Criar ticket na fila
      const ticketData = {
        clientName: 'Cliente Teste',
        clientPhone: '(11) 99999-0000',
        priority: 1,
      };

      const createTicketResponse = await request(app.getHttpServer())
        .post(`/api/v1/queues/${queue.id}/tickets`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(ticketData)
        .expect(201);

      const ticket = createTicketResponse.body;

      // Marcar ticket como concluído diretamente no banco
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });

      // Agora deve permitir deletar a fila
      const deleteResponse = await request(app.getHttpServer())
        .delete(`/api/v1/tenants/${tenant.id}/queues/${queue.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(deleteResponse.body.isActive).toBe(false);
    });
  });

  describe('/tenants/:tenantId/queues/:id/call-next (POST)', () => {
    it('deve chamar próximo da fila', async () => {
      // Criar fila via API
      const queueData = {
        name: 'Fila para Chamar',
      };

      const createQueueResponse = await request(app.getHttpServer())
        .post(`/api/v1/tenants/${tenant.id}/queues`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(queueData)
        .expect(201);

      const queue = createQueueResponse.body;

      // Criar ticket via API
      const ticketData = {
        clientName: 'Cliente Teste',
        clientPhone: '(11) 99999-0000',
        priority: 1,
      };

      const createTicketResponse = await request(app.getHttpServer())
        .post(`/api/v1/queues/${queue.id}/tickets`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(ticketData)
        .expect(201);

      const ticket = createTicketResponse.body;

      const response = await request(app.getHttpServer())
        .post(`/api/v1/tenants/${tenant.id}/queues/${queue.id}/call-next`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      expect(response.body.id).toBe(ticket.id);
      expect(response.body.status).toBe('CALLED');
      expect(response.body.calledAt).toBeDefined();
    });

    it('deve retornar erro quando não há tickets na fila', async () => {
      // Criar fila via API
      const queueData = {
        name: 'Fila Vazia',
      };

      const createQueueResponse = await request(app.getHttpServer())
        .post(`/api/v1/tenants/${tenant.id}/queues`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(queueData)
        .expect(201);

      const queue = createQueueResponse.body;

      await request(app.getHttpServer())
        .post(`/api/v1/tenants/${tenant.id}/queues/${queue.id}/call-next`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });
});
