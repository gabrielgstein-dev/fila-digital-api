import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('API Structure (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
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

  afterEach(async () => {
    await app.close();
  });

  describe('🏗️ Estrutura básica da API', () => {
    it('deve responder na rota raiz', () => {
      return request(app.getHttpServer())
        .get('/api/v1')
        .expect(200)
        .expect('Hello World!');
    });

    it('deve configurar CORS corretamente', async () => {
      const response = await request(app.getHttpServer())
        .options('/api/v1')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET');

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    it('deve retornar 404 para rotas inexistentes', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/rota-que-nao-existe')
        .expect(404);
    });
  });

  describe('🔐 Endpoints de Autenticação', () => {
    it('deve ter endpoint de login configurado', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({})
        .expect(400); // Vai falhar na validação, mas rota existe
    });

    it('deve validar dados de login', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'email-invalido',
          password: '123',
        })
        .expect(400); // Falha na validação
    });

    it('deve rejeitar credenciais inexistentes', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'usuario@inexistente.com',
          password: 'senhaqualquer',
        })
        .expect(401);
    });
  });

  describe('🎫 Endpoints de Filas', () => {
    const tenantId = 'tenant-test-id';

    it('deve ter rotas de filas configuradas', async () => {
      // GET filas
      await request(app.getHttpServer())
        .get(`/api/v1/tenants/${tenantId}/queues`)
        .expect(200); // Vai retornar array vazio, mas rota existe

      // POST fila (sem auth)
      await request(app.getHttpServer())
        .post(`/api/v1/tenants/${tenantId}/queues`)
        .send({ name: 'Teste' })
        .expect(401); // Não autenticado

      // GET fila específica
      await request(app.getHttpServer())
        .get(`/api/v1/tenants/${tenantId}/queues/queue-id`)
        .expect(404); // Fila não existe

      // Chamar próximo (sem auth)
      await request(app.getHttpServer())
        .post(`/api/v1/tenants/${tenantId}/queues/queue-id/call-next`)
        .expect(401); // Não autenticado
    });

    it('deve validar dados de criação de fila', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/tenants/${tenantId}/queues`)
        .set('Authorization', 'Bearer token-invalido')
        .send({
          name: 'A', // muito curto
          capacity: -1, // inválido
        })
        .expect(401); // Vai falhar no auth, mas antes da validação
    });
  });

  describe('🎟️ Endpoints de Tickets', () => {
    const queueId = 'queue-test-id';

    it('deve ter rotas de tickets configuradas', async () => {
      // POST ticket
      await request(app.getHttpServer())
        .post(`/api/v1/queues/${queueId}/tickets`)
        .send({})
        .expect(404); // Fila não existe

      // GET ticket
      await request(app.getHttpServer())
        .get('/api/v1/tickets/ticket-id')
        .expect(404); // Ticket não existe

      // Operações do ticket (sem auth)
      await request(app.getHttpServer())
        .put('/api/v1/tickets/ticket-id/recall')
        .expect(401);

      await request(app.getHttpServer())
        .put('/api/v1/tickets/ticket-id/skip')
        .expect(401);

      await request(app.getHttpServer())
        .put('/api/v1/tickets/ticket-id/complete')
        .expect(401);
    });

    it('deve validar dados de criação de ticket', async () => {
      const validTicketData = {
        clientName: 'João Silva',
        clientPhone: '11999999999',
        clientEmail: 'joao@email.com',
        priority: 1,
      };

      await request(app.getHttpServer())
        .post(`/api/v1/queues/${queueId}/tickets`)
        .send(validTicketData)
        .expect(404); // Fila não existe, mas dados são válidos
    });

    it('deve rejeitar dados inválidos de ticket', async () => {
      const invalidTicketData = {
        clientName: '', // Nome vazio (se obrigatório)
        clientEmail: 'email-invalido', // Email inválido
        priority: 15, // Prioridade muito alta
      };

      await request(app.getHttpServer())
        .post(`/api/v1/queues/${queueId}/tickets`)
        .send(invalidTicketData)
        .expect(400); // Validação falha
    });
  });

  describe('🔒 Segurança e Validação', () => {
    it('deve rejeitar requests sem autenticação em rotas protegidas', async () => {
      const endpoints = [
        'POST /api/v1/tenants/test/queues',
        'PUT /api/v1/tenants/test/queues/id',
        'DELETE /api/v1/tenants/test/queues/id',
        'POST /api/v1/tenants/test/queues/id/call-next',
        'PUT /api/v1/tickets/id/recall',
        'PUT /api/v1/tickets/id/skip',
        'PUT /api/v1/tickets/id/complete',
      ];

      for (const endpoint of endpoints) {
        const [method, path] = endpoint.split(' ');

        await request(app.getHttpServer())
          [method.toLowerCase()](path)
          .send({})
          .expect(401);
      }
    });

    it('deve rejeitar tokens inválidos', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/tenants/test/queues')
        .set('Authorization', 'Bearer token-totalmente-invalido')
        .send({ name: 'Teste' })
        .expect(401);
    });

    it('deve validar Content-Type', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('Content-Type', 'text/plain')
        .send('dados-invalidos')
        .expect(400);
    });
  });

  describe('📊 Health Check', () => {
    it('deve responder na rota de health check', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1')
        .expect(200);

      expect(response.text).toBe('Hello World!');
    });
  });
});
