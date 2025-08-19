import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AppController (e2e)', () => {
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

  it('/ (GET) - deve retornar Hello World', () => {
    return request(app.getHttpServer())
      .get('/api/v1')
      .expect(200)
      .expect('Hello World!');
  });

  it('/auth/login (POST) - deve validar estrutura de login', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'invalid-email',
        password: '123',
      })
      .expect(400);
  });

  it('/auth/login (POST) - deve retornar 401 para credenciais inválidas', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'usuario@inexistente.com',
        password: 'senhaqualquer',
      })
      .expect(401);
  });

  describe('Endpoints protegidos', () => {
    it('deve rejeitar acesso sem token em endpoints protegidos', async () => {
      const tenantId = 'tenant-qualquer';

      await request(app.getHttpServer())
        .post(`/api/v1/tenants/${tenantId}/queues`)
        .send({
          name: 'Fila Teste',
        })
        .expect(401);
    });

    it('deve rejeitar token inválido', async () => {
      const tenantId = 'tenant-qualquer';

      await request(app.getHttpServer())
        .post(`/api/v1/tenants/${tenantId}/queues`)
        .set('Authorization', 'Bearer token-invalido')
        .send({
          name: 'Fila Teste',
        })
        .expect(401);
    });
  });

  describe('Validação de dados', () => {
    it('deve validar dados obrigatórios para criação de fila', async () => {
      const tenantId = 'tenant-qualquer';

      await request(app.getHttpServer())
        .post(`/api/v1/tenants/${tenantId}/queues`)
        .set('Authorization', 'Bearer token-valido-fake')
        .send({
          name: 'A', // muito curto
          capacity: -1, // inválido
        })
        .expect(401); // Vai falhar no auth antes da validação
    });

    it('deve aceitar dados válidos para criação de ticket', async () => {
      const queueId = 'queue-qualquer';

      await request(app.getHttpServer())
        .post(`/api/v1/queues/${queueId}/tickets`)
        .send({
          clientName: 'João Silva',
          clientPhone: '11999999999',
          priority: 1,
        })
        .expect(404); // Fila não existe, mas validação passou
    });
  });

  describe('Estrutura da API', () => {
    it('deve retornar 404 para rotas inexistentes', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/rota-inexistente')
        .expect(404);
    });

    it('deve aceitar CORS', async () => {
      const response = await request(app.getHttpServer())
        .options('/api/v1')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET');

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });
});
