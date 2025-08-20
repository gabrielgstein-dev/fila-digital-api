import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { cleanDatabase, teardownTestDatabase } from './setup-database';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenant: any;
  let agent: any;

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

    agent = await prisma.agent.create({
      data: {
        email: `admin-${Date.now()}@empresa.com`,
        name: 'Admin Teste',
        password: await bcrypt.hash('senha123', 10),
        role: 'ADMIN',
        tenantId: tenant.id,
      },
    });
  });

  afterAll(async () => {
    await teardownTestDatabase(prisma);
    await app.close();
  });

  describe('/auth/login (POST)', () => {
    it('deve fazer login com credenciais válidas', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: agent.email,
          password: 'senha123',
        })
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(agent.email);
      expect(response.body.user.role).toBe('ADMIN');
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('deve rejeitar login com email inválido', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'usuario@inexistente.com',
          password: 'senha123',
        })
        .expect(401);
    });

    it('deve rejeitar login com senha incorreta', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: agent.email,
          password: 'senhaerrada',
        })
        .expect(401);
    });

    it('deve rejeitar login com dados inválidos', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'email-invalido',
          password: '123',
        })
        .expect(400);
    });

    it('deve rejeitar login de agente inativo', async () => {
      await prisma.agent.update({
        where: { id: agent.id },
        data: { isActive: false },
      });

      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: agent.email,
          password: 'senha123',
        })
        .expect(401);
    });
  });
});
