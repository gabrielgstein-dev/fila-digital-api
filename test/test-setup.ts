import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import * as request from 'supertest';
import { cleanDatabase, teardownTestDatabase } from './setup-database';

export class TestHelper {
  public app: INestApplication;
  public prisma: PrismaService;
  public moduleFixture: TestingModule;

  async beforeAll(): Promise<void> {
    this.moduleFixture = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          envFilePath: '.env.test',
          isGlobal: true,
        }),
        AppModule,
      ],
    }).compile();

    this.app = this.moduleFixture.createNestApplication();
    this.prisma = this.app.get<PrismaService>(PrismaService);

    this.app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    this.app.setGlobalPrefix('api/v1');

    await this.app.init();
  }

  async afterAll(): Promise<void> {
    await teardownTestDatabase(this.prisma);
    await this.app.close();
  }

  async beforeEach(): Promise<void> {
    await cleanDatabase(this.prisma);
  }

  async createTenant(data?: Partial<any>) {
    return this.prisma.tenant.create({
      data: {
        name: 'Empresa Teste',
        slug: 'empresa-teste',
        email: 'contato@empresa.com',
        phone: '(11) 99999-9999',
        ...data,
      },
    });
  }

  async createAgent(tenantId: string, data?: Partial<any>) {
    const bcrypt = await import('bcrypt');
    return this.prisma.agent.create({
      data: {
        email: 'atendente@empresa.com',
        name: 'Atendente Teste',
        password: await bcrypt.hash('senha123', 10),
        role: 'ATTENDANT',
        tenantId,
        ...data,
      },
    });
  }

  async createQueue(tenantId: string, data?: Partial<any>) {
    return this.prisma.queue.create({
      data: {
        name: 'Fila Geral',
        description: 'Fila para atendimento geral',
        queueType: 'GENERAL',
        capacity: 50,
        avgServiceTime: 300,
        tenantId,
        ...data,
      },
    });
  }

  async createTicket(queueId: string, data?: Partial<any>) {
    const lastTicket = await this.prisma.ticket.findFirst({
      where: { queueId },
      orderBy: { number: 'desc' },
    });

    const nextNumber = (lastTicket?.number || 0) + 1;

    return this.prisma.ticket.create({
      data: {
        number: nextNumber,
        priority: 1,
        status: 'WAITING',
        queueId,
        estimatedTime: 300,
        ...data,
      },
    });
  }

  async createCounter(tenantId: string, data?: Partial<any>) {
    return this.prisma.counter.create({
      data: {
        name: 'Guichê 1',
        number: 1,
        tenantId,
        ...data,
      },
    });
  }

  async loginAgent(email: string, password: string) {
    const response = await request(this.app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);

    return response.body.access_token;
  }

  getRequest() {
    return request(this.app.getHttpServer());
  }

  withAuth(token: string) {
    return this.getRequest().set('Authorization', `Bearer ${token}`);
  }
}
