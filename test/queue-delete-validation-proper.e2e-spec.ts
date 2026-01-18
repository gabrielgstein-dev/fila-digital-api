import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
const request = require('supertest');
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { ERROR_CODES } from '../src/common/constants/error-codes';
import * as bcrypt from 'bcrypt';
import { cleanDatabase, teardownTestDatabase } from './setup-database';

describe('Queue Delete Validation (e2e)', () => {
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

    // Criar tenant para os testes
    tenant = await prisma.tenant.create({
      data: {
        name: 'Empresa Teste Delete Queue',
        slug: `empresa-teste-delete-${Date.now()}`,
        email: `delete-test-${Date.now()}@empresa.com`,
      },
    });

    // Criar agente para autenticação
    const agentCpf = `1234567890${Date.now()}`.slice(-11);

    await prisma.agent.create({
      data: {
        email: `admin-delete-${Date.now()}@empresa.com`,
        name: 'Admin Delete Test',
        password: await bcrypt.hash('senha123', 10),
        role: 'ADMINISTRADOR',
        tenantId: tenant.id,
        cpf: agentCpf,
      },
    });

    // Fazer login para obter token
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

  describe('DELETE /tenants/:tenantId/queues/:id', () => {
    it('deve permitir deletar fila sem tickets ativos', async () => {
      // Criar fila via API
      const queueData = {
        name: 'Fila Para Deletar',
        queueType: 'GENERAL',
      };

      const createResponse = await request(app.getHttpServer())
        .post(`/api/v1/tenants/${tenant.id}/queues`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(queueData)
        .expect(201);

      const queue = createResponse.body;

      // Deletar fila
      const deleteResponse = await request(app.getHttpServer())
        .delete(`/api/v1/tenants/${tenant.id}/queues/${queue.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(deleteResponse.body.isActive).toBe(false);
    });

    it('deve retornar QUEUE_HAS_ACTIVE_TICKETS ao tentar deletar fila com ticket WAITING', async () => {
      // Criar fila via API
      const queueData = {
        name: 'Fila Com Ticket Waiting',
        queueType: 'GENERAL',
      };

      const createQueueResponse = await request(app.getHttpServer())
        .post(`/api/v1/tenants/${tenant.id}/queues`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(queueData)
        .expect(201);

      const queue = createQueueResponse.body;

      // Criar ticket na fila via API
      const ticketData = {
        clientName: 'Cliente Teste',
        clientPhone: '(11) 99999-0000',
        priority: 1,
      };

      await request(app.getHttpServer())
        .post(`/api/v1/queues/${queue.id}/tickets`)
        .send(ticketData)
        .expect(201);

      // Tentar deletar fila com ticket ativo
      const deleteResponse = await request(app.getHttpServer())
        .delete(`/api/v1/tenants/${tenant.id}/queues/${queue.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(deleteResponse.body.message).toBe(
        ERROR_CODES.QUEUE_HAS_ACTIVE_TICKETS,
      );
    });

    it('deve retornar QUEUE_HAS_ACTIVE_TICKETS ao tentar deletar fila com ticket CALLED', async () => {
      // Criar fila via API
      const queueData = {
        name: 'Fila Com Ticket Called',
        queueType: 'GENERAL',
      };

      const createQueueResponse = await request(app.getHttpServer())
        .post(`/api/v1/tenants/${tenant.id}/queues`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(queueData)
        .expect(201);

      const queue = createQueueResponse.body;

      // Criar ticket na fila via API
      const ticketData = {
        clientName: 'Cliente Teste',
        clientPhone: '(11) 99999-0000',
        priority: 1,
      };

      await request(app.getHttpServer())
        .post(`/api/v1/queues/${queue.id}/tickets`)
        .send(ticketData)
        .expect(201);

      // Chamar o ticket para mudar status para CALLED
      await request(app.getHttpServer())
        .post(`/api/v1/tenants/${tenant.id}/queues/${queue.id}/call-next`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      // Tentar deletar fila com ticket chamado
      const deleteResponse = await request(app.getHttpServer())
        .delete(`/api/v1/tenants/${tenant.id}/queues/${queue.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(deleteResponse.body.message).toBe(
        ERROR_CODES.QUEUE_HAS_ACTIVE_TICKETS,
      );
    });

    it('deve permitir deletar fila com ticket COMPLETED', async () => {
      // Criar fila via API
      const queueData = {
        name: 'Fila Com Ticket Completed',
        queueType: 'GENERAL',
      };

      const createQueueResponse = await request(app.getHttpServer())
        .post(`/api/v1/tenants/${tenant.id}/queues`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(queueData)
        .expect(201);

      const queue = createQueueResponse.body;

      // Criar ticket na fila via API
      const ticketData = {
        clientName: 'Cliente Teste',
        clientPhone: '(11) 99999-0000',
        priority: 1,
      };

      const createTicketResponse = await request(app.getHttpServer())
        .post(`/api/v1/queues/${queue.id}/tickets`)
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

    it('deve permitir deletar fila com ticket NO_SHOW', async () => {
      // Criar fila via API
      const queueData = {
        name: 'Fila Com Ticket NoShow',
        queueType: 'GENERAL',
      };

      const createQueueResponse = await request(app.getHttpServer())
        .post(`/api/v1/tenants/${tenant.id}/queues`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(queueData)
        .expect(201);

      const queue = createQueueResponse.body;

      // Criar ticket na fila via API
      const ticketData = {
        clientName: 'Cliente Teste',
        clientPhone: '(11) 99999-0000',
        priority: 1,
      };

      const createTicketResponse = await request(app.getHttpServer())
        .post(`/api/v1/queues/${queue.id}/tickets`)
        .send(ticketData)
        .expect(201);

      const ticket = createTicketResponse.body;

      // Marcar ticket como NO_SHOW diretamente no banco
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: {
          status: 'NO_SHOW',
        },
      });

      // Agora deve permitir deletar a fila
      const deleteResponse = await request(app.getHttpServer())
        .delete(`/api/v1/tenants/${tenant.id}/queues/${queue.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(deleteResponse.body.isActive).toBe(false);
    });

    it('deve retornar QUEUE_HAS_ACTIVE_TICKETS para fila com múltiplos tickets incluindo ativos', async () => {
      // Criar fila via API
      const queueData = {
        name: 'Fila Com Múltiplos Tickets',
        queueType: 'GENERAL',
      };

      const createQueueResponse = await request(app.getHttpServer())
        .post(`/api/v1/tenants/${tenant.id}/queues`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(queueData)
        .expect(201);

      const queue = createQueueResponse.body;

      // Criar múltiplos tickets diretamente no banco para ter controle total dos status
      await prisma.ticket.createMany({
        data: [
          {
            queueId: queue.id,
            myCallingToken: 'A001',
            status: 'COMPLETED',
            completedAt: new Date(),
          },
          { queueId: queue.id, myCallingToken: 'A002', status: 'NO_SHOW' },
          { queueId: queue.id, myCallingToken: 'A003', status: 'CANCELLED' },
          { queueId: queue.id, myCallingToken: 'A004', status: 'WAITING' }, // Este deve impedir a deleção
        ],
      });

      // Tentar deletar fila com tickets ativos
      const deleteResponse = await request(app.getHttpServer())
        .delete(`/api/v1/tenants/${tenant.id}/queues/${queue.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(deleteResponse.body.message).toBe(
        ERROR_CODES.QUEUE_HAS_ACTIVE_TICKETS,
      );
    });

    it('deve permitir deletar fila com apenas tickets inativos (COMPLETED, NO_SHOW, CANCELLED)', async () => {
      // Criar fila via API
      const queueData = {
        name: 'Fila Com Tickets Inativos',
        queueType: 'GENERAL',
      };

      const createQueueResponse = await request(app.getHttpServer())
        .post(`/api/v1/tenants/${tenant.id}/queues`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(queueData)
        .expect(201);

      const queue = createQueueResponse.body;

      // Criar múltiplos tickets inativos diretamente no banco
      await prisma.ticket.createMany({
        data: [
          {
            queueId: queue.id,
            myCallingToken: 'B001',
            status: 'COMPLETED',
            completedAt: new Date(),
          },
          { queueId: queue.id, myCallingToken: 'B002', status: 'NO_SHOW' },
          { queueId: queue.id, myCallingToken: 'B003', status: 'CANCELLED' },
        ],
      });

      // Deve permitir deletar a fila
      const deleteResponse = await request(app.getHttpServer())
        .delete(`/api/v1/tenants/${tenant.id}/queues/${queue.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(deleteResponse.body.isActive).toBe(false);
    });
  });
});



