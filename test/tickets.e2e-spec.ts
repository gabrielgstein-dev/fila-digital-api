import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('TicketsController (e2e)', () => {
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

  describe('/queues/:queueId/tickets (POST)', () => {
    it('deve validar dados para criação de ticket', async () => {
      const queueId = 'queue-test-id';

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

    it('deve rejeitar dados inválidos para ticket', async () => {
      const queueId = 'queue-test-id';

      const invalidTicketData = {
        clientName: '', // Nome vazio
        clientEmail: 'email-invalido', // Email inválido
        priority: 15, // Prioridade muito alta
      };

      await request(app.getHttpServer())
        .post(`/api/v1/queues/${queueId}/tickets`)
        .send(invalidTicketData)
        .expect(400);
    });

    it('deve aceitar ticket com dados mínimos', async () => {
      const queueId = 'queue-test-id';

      const minimalTicketData = {
        priority: 1,
      };

      await request(app.getHttpServer())
        .post(`/api/v1/queues/${queueId}/tickets`)
        .send(minimalTicketData)
        .expect(404); // Fila não existe, mas dados são válidos
    });
  });

  describe('/tickets/:id (GET)', () => {
    it('deve retornar 404 para ticket inexistente', async () => {
      const fakeTicketId = 'ticket-inexistente';

      await request(app.getHttpServer())
        .get(`/api/v1/tickets/${fakeTicketId}`)
        .expect(404);
    });
  });

  describe('Operações de ticket com autenticação', () => {
    it('deve rejeitar recall sem autenticação', async () => {
      const ticketId = 'ticket-test-id';

      await request(app.getHttpServer())
        .put(`/api/v1/tickets/${ticketId}/recall`)
        .expect(401);
    });

    it('deve rejeitar skip sem autenticação', async () => {
      const ticketId = 'ticket-test-id';

      await request(app.getHttpServer())
        .put(`/api/v1/tickets/${ticketId}/skip`)
        .expect(401);
    });

    it('deve rejeitar complete sem autenticação', async () => {
      const ticketId = 'ticket-test-id';

      await request(app.getHttpServer())
        .put(`/api/v1/tickets/${ticketId}/complete`)
        .expect(401);
    });

    it('deve rejeitar operações com token inválido', async () => {
      const ticketId = 'ticket-test-id';
      const invalidToken = 'Bearer token-invalido';

      await request(app.getHttpServer())
        .put(`/api/v1/tickets/${ticketId}/recall`)
        .set('Authorization', invalidToken)
        .expect(401);

      await request(app.getHttpServer())
        .put(`/api/v1/tickets/${ticketId}/skip`)
        .set('Authorization', invalidToken)
        .expect(401);

      await request(app.getHttpServer())
        .put(`/api/v1/tickets/${ticketId}/complete`)
        .set('Authorization', invalidToken)
        .expect(401);
    });
  });

  describe('Estrutura das rotas de tickets', () => {
    it('deve ter todas as rotas configuradas corretamente', async () => {
      const queueId = 'test-queue';
      const ticketId = 'test-ticket';

      // Teste se as rotas estão configuradas (vão falhar por falta de dados, mas não por rota inexistente)
      await request(app.getHttpServer())
        .post(`/api/v1/queues/${queueId}/tickets`)
        .send({})
        .expect(400); // Validação falha, mas rota existe

      await request(app.getHttpServer())
        .get(`/api/v1/tickets/${ticketId}`)
        .expect(404); // Ticket não existe, mas rota existe

      await request(app.getHttpServer())
        .put(`/api/v1/tickets/${ticketId}/recall`)
        .expect(401); // Não autenticado, mas rota existe

      await request(app.getHttpServer())
        .put(`/api/v1/tickets/${ticketId}/skip`)
        .expect(401); // Não autenticado, mas rota existe

      await request(app.getHttpServer())
        .put(`/api/v1/tickets/${ticketId}/complete`)
        .expect(401); // Não autenticado, mas rota existe
    });
  });

  describe('Validações específicas de prioridade', () => {
    it('deve aceitar prioridades válidas', async () => {
      const queueId = 'queue-test-id';

      const priorities = [1, 2, 3, 5, 10];

      for (const priority of priorities) {
        await request(app.getHttpServer())
          .post(`/api/v1/queues/${queueId}/tickets`)
          .send({ priority })
          .expect(404); // Fila não existe, mas prioridade é válida
      }
    });

    it('deve rejeitar prioridades inválidas', async () => {
      const queueId = 'queue-test-id';

      const invalidPriorities = [0, -1, 11, 100];

      for (const priority of invalidPriorities) {
        await request(app.getHttpServer())
          .post(`/api/v1/queues/${queueId}/tickets`)
          .send({ priority })
          .expect(400);
      }
    });
  });
});
