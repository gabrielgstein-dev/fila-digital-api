import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { cleanDatabase, teardownTestDatabase } from './setup-database';
import * as bcrypt from 'bcrypt';

describe('CurrentCallingToken (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let testTicketId: string;
  let testTenantId: string;
  let testQueueId: string;

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
  }, 30000);

  beforeEach(async () => {
    await cleanDatabase(prisma);

    const testTenant = await prisma.tenant.create({
      data: {
        name: 'Test Tenant',
        slug: 'test-tenant-current-token',
        email: 'test-current-token@tenant.com',
      },
    });
    testTenantId = testTenant.id;

    const testQueue = await prisma.queue.create({
      data: {
        name: 'Test Queue Current Token',
        description: 'Test Description',
        queueType: 'GENERAL',
        tenantId: testTenantId,
      },
    });
    testQueueId = testQueue.id;

    // Hash da senha 'hashedpassword'
    const hashedPassword = await bcrypt.hash('hashedpassword', 10);

    await prisma.agent.create({
      data: {
        email: 'test-current-token@agent.com',
        name: 'Test Agent Current Token',
        cpf: '12345678902',
        password: hashedPassword,
        tenantId: testTenantId,
      },
    });

    const testTicket = await prisma.ticket.create({
      data: {
        myCallingToken: 'B100',
        queueId: testQueueId,
        clientName: 'Test Client',
        clientPhone: '1234567890',
      },
    });
    testTicketId = testTicket.id;

    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/agent/login')
      .send({
        cpf: '12345678902',
        password: 'hashedpassword',
      });

    authToken = loginResponse.body.access_token;
  }, 30000);

  afterAll(async () => {
    await teardownTestDatabase(prisma);
    await app.close();
  });

  describe('PUT /tickets/:id/current-calling-token', () => {
    it('deve atualizar o currentCallingToken com sucesso', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/v1/tickets/${testTicketId}/current-calling-token`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentCallingToken: 'B101',
        })
        .expect(200);

      expect(response.body.myCallingToken).toBe('B101');
    }, 30000);

    it('deve retornar erro 401 sem autenticação', async () => {
      await request(app.getHttpServer())
        .put(`/api/v1/tickets/${testTicketId}/current-calling-token`)
        .send({
          currentCallingToken: 'B102',
        })
        .expect(401);
    });

    it('deve retornar erro 404 para ticket inexistente', async () => {
      await request(app.getHttpServer())
        .put('/api/v1/tickets/nonexistent-id/current-calling-token')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentCallingToken: 'B103',
        })
        .expect(404);
    });

    it('deve validar o body da requisição', async () => {
      await request(app.getHttpServer())
        .put(`/api/v1/tickets/${testTicketId}/current-calling-token`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);
    });

    it('deve retornar erro 403 quando usuário de outro tenant tentar acessar', async () => {
      // Criar outro tenant e agente
      const otherTenant = await prisma.tenant.create({
        data: {
          name: 'Other Tenant',
          slug: 'other-tenant',
          email: 'other@tenant.com',
        },
      });

      const otherAgent = await prisma.agent.create({
        data: {
          email: 'other@agent.com',
          name: 'Other Agent',
          cpf: '98765432109',
          password: await bcrypt.hash('hashedpassword', 10),
          tenantId: otherTenant.id,
        },
      });

      // Fazer login com o outro agente
      const otherLoginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/agent/login')
        .send({
          cpf: '98765432109',
          password: 'hashedpassword',
        });

      const otherAuthToken = otherLoginResponse.body.access_token;

      // Tentar acessar o ticket do primeiro tenant
      await request(app.getHttpServer())
        .put(`/api/v1/tickets/${testTicketId}/current-calling-token`)
        .set('Authorization', `Bearer ${otherAuthToken}`)
        .send({
          currentCallingToken: 'B104',
        })
        .expect(403);

      // Limpar dados de teste
      await prisma.agent.delete({ where: { id: otherAgent.id } });
      await prisma.tenant.delete({ where: { id: otherTenant.id } });
    }, 30000);
  });
});
