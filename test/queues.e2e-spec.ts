import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

describe('QueuesController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let tenant: any;
  let agent: any;
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
    prisma = new PrismaClient();

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
    await cleanDatabase();

    tenant = await prisma.tenant.create({
      data: {
        name: 'Empresa Teste',
        slug: 'empresa-teste',
        email: 'contato@empresa.com',
      },
    });

    agent = await prisma.agent.create({
      data: {
        email: 'admin@empresa.com',
        name: 'Admin Teste',
        password: await bcrypt.hash('senha123', 10),
        role: 'ADMIN',
        tenantId: tenant.id,
      },
    });

    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@empresa.com',
        password: 'senha123',
      });

    authToken = loginResponse.body.access_token;
  });

  afterAll(async () => {
    await cleanDatabase();
    await prisma.$disconnect();
    await app.close();
  });

  async function cleanDatabase() {
    try {
      await prisma.callLog.deleteMany();
      await prisma.ticket.deleteMany();
      await prisma.queue.deleteMany();
      await prisma.counter.deleteMany();
      await prisma.agent.deleteMany();
      await prisma.tenant.deleteMany();
    } catch (error) {
      console.log('Erro ao limpar banco:', error);
    }
  }

  describe('/tenants/:tenantId/queues (GET)', () => {
    it('deve listar filas do tenant', async () => {
      const queue = await prisma.queue.create({
        data: {
          name: 'Fila Teste',
          description: 'Descrição da fila teste',
          queueType: 'GENERAL',
          tenantId: tenant.id,
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/api/v1/tenants/${tenant.id}/queues`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].name).toBe('Fila Teste');
      expect(response.body[0].id).toBe(queue.id);
    });

    it('deve retornar lista vazia para tenant sem filas', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/tenants/${tenant.id}/queues`)
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
      const queue = await prisma.queue.create({
        data: {
          name: 'Fila Específica',
          queueType: 'VIP',
          tenantId: tenant.id,
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/api/v1/tenants/${tenant.id}/queues/${queue.id}`)
        .expect(200);

      expect(response.body.id).toBe(queue.id);
      expect(response.body.name).toBe('Fila Específica');
      expect(response.body.queueType).toBe('VIP');
    });

    it('deve retornar 404 para fila inexistente', async () => {
      const fakeId = '507f1f77bcf86cd799439011';

      await request(app.getHttpServer())
        .get(`/api/v1/tenants/${tenant.id}/queues/${fakeId}`)
        .expect(404);
    });
  });

  describe('/tenants/:tenantId/queues/:id/call-next (POST)', () => {
    it('deve chamar próximo da fila', async () => {
      const queue = await prisma.queue.create({
        data: {
          name: 'Fila para Chamar',
          tenantId: tenant.id,
        },
      });

      const ticket = await prisma.ticket.create({
        data: {
          number: 1,
          priority: 1,
          status: 'WAITING',
          queueId: queue.id,
        },
      });

      const response = await request(app.getHttpServer())
        .post(`/api/v1/tenants/${tenant.id}/queues/${queue.id}/call-next`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe(ticket.id);
      expect(response.body.status).toBe('CALLED');
      expect(response.body.calledAt).toBeDefined();
    });

    it('deve retornar erro quando não há tickets na fila', async () => {
      const queue = await prisma.queue.create({
        data: {
          name: 'Fila Vazia',
          tenantId: tenant.id,
        },
      });

      await request(app.getHttpServer())
        .post(`/api/v1/tenants/${tenant.id}/queues/${queue.id}/call-next`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });
});
