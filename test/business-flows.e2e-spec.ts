import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { cleanDatabase, teardownTestDatabase } from './setup-database';
import * as bcrypt from 'bcrypt';

describe('Business Flows (e2e)', () => {
  jest.setTimeout(30000); // 30 segundos para testes complexos
  let app: INestApplication;
  let prisma: PrismaService;

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
  });

  afterAll(async () => {
    await teardownTestDatabase(prisma);
    await app.close();
  });

  describe('🏥 Cenário Sabin - Fila Única', () => {
    let sabinTenant: any;
    let sabinAgent: any;
    let sabinAuthToken: string;
    let filaUnica: any;

    beforeEach(async () => {
      // Setup Sabin (empresa com fila única)
      sabinTenant = await prisma.tenant.create({
        data: {
          name: 'Laboratório Sabin',
          slug: `sabin-${Date.now()}`,
          email: 'contato@sabin.com.br',
          phone: '(61) 3321-3000',
        },
      });

      sabinAgent = await prisma.agent.create({
        data: {
          email: `atendente.sabin-${Date.now()}@sabin.com.br`,
          name: 'Atendente Sabin',
          password: await bcrypt.hash('sabin123', 10),
          role: 'ATTENDANT',
          tenantId: sabinTenant.id,
        },
      });

      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: sabinAgent.email,
          password: 'sabin123',
        });

      sabinAuthToken = loginResponse.body.access_token;
    });

    it('deve criar fila única para atendimento geral', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/tenants/${sabinTenant.id}/queues`)
        .set('Authorization', `Bearer ${sabinAuthToken}`)
        .send({
          name: 'Atendimento Geral',
          description: 'Fila única para todos os serviços do Sabin',
          queueType: 'GENERAL',
          capacity: 50,
          avgServiceTime: 300, // 5 minutos
        })
        .expect(201);

      filaUnica = response.body;

      expect(response.body.name).toBe('Atendimento Geral');
      expect(response.body.queueType).toBe('GENERAL');
      expect(response.body.tenantId).toBe(sabinTenant.id);
    });

    it('deve permitir múltiplos clientes na mesma fila', async () => {
      // Criar a fila primeiro
      filaUnica = await prisma.queue.create({
        data: {
          name: 'Atendimento Geral',
          queueType: 'GENERAL',
          tenantId: sabinTenant.id,
        },
      });

      // Cliente 1 - Exame de sangue
      const cliente1Response = await request(app.getHttpServer())
        .post(`/api/v1/queues/${filaUnica.id}/tickets`)
        .send({
          clientName: 'João Silva',
          clientPhone: '(61) 99999-1111',
          clientEmail: 'joao@email.com',
          priority: 1,
        })
        .expect(201);

      // Cliente 2 - Exame de urina
      const cliente2Response = await request(app.getHttpServer())
        .post(`/api/v1/queues/${filaUnica.id}/tickets`)
        .send({
          clientName: 'Maria Santos',
          clientPhone: '(61) 99999-2222',
          clientEmail: 'maria@email.com',
          priority: 1,
        })
        .expect(201);

      // Verificar que ambos estão na mesma fila
      expect(cliente1Response.body.queueId).toBe(filaUnica.id);
      expect(cliente2Response.body.queueId).toBe(filaUnica.id);
      expect(cliente1Response.body.number).toBe(1);
      expect(cliente2Response.body.number).toBe(2);
    });

    it('deve processar atendimento sequencial na fila única', async () => {
      // Setup da fila com tickets
      filaUnica = await prisma.queue.create({
        data: {
          name: 'Atendimento Geral',
          queueType: 'GENERAL',
          tenantId: sabinTenant.id,
        },
      });

      // Criar 3 tickets
      const ticket1 = await prisma.ticket.create({
        data: {
          number: 1,
          clientName: 'Cliente 1',
          status: 'WAITING',
          queueId: filaUnica.id,
        },
      });

      await prisma.ticket.create({
        data: {
          number: 2,
          clientName: 'Cliente 2',
          status: 'WAITING',
          queueId: filaUnica.id,
        },
      });

      // Chamar primeiro da fila
      const chamadaResponse = await request(app.getHttpServer())
        .post(
          `/api/v1/tenants/${sabinTenant.id}/queues/${filaUnica.id}/call-next`,
        )
        .set('Authorization', `Bearer ${sabinAuthToken}`)
        .expect(201);

      expect(chamadaResponse.body.id).toBe(ticket1.id);
      expect(chamadaResponse.body.status).toBe('CALLED');
      expect(chamadaResponse.body.calledAt).toBeDefined();

      // Completar atendimento
      await request(app.getHttpServer())
        .put(`/api/v1/tickets/${ticket1.id}/complete`)
        .set('Authorization', `Bearer ${sabinAuthToken}`)
        .expect(200);
    });
  });

  describe('🏥 Cenário Centro Clínico - Múltiplas Filas Especializadas', () => {
    let clinicaTenant: any;
    let clincaAgent: any;
    let clinicaAuthToken: string;
    let filaEndocrino: any;
    let filaRaioX: any;
    let filaPediatria: any;
    let filaOftalmologia: any;

    beforeEach(async () => {
      // Setup Centro Clínico (empresa com múltiplas filas)
      clinicaTenant = await prisma.tenant.create({
        data: {
          name: 'Centro Clínico São Paulo',
          slug: `centro-clinico-${Date.now()}`,
          email: 'contato@centroclinico.com.br',
          phone: '(11) 3333-4444',
        },
      });

      clincaAgent = await prisma.agent.create({
        data: {
          email: `atendente.clinica-${Date.now()}@centroclinico.com.br`,
          name: 'Atendente Clínica',
          password: await bcrypt.hash('clinica123', 10),
          role: 'ATTENDANT',
          tenantId: clinicaTenant.id,
        },
      });

      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: clincaAgent.email,
          password: 'clinica123',
        });

      clinicaAuthToken = loginResponse.body.access_token;
    });

    it('deve criar múltiplas filas especializadas', async () => {
      // Criar fila de Endocrinologia
      const endocrinoResponse = await request(app.getHttpServer())
        .post(`/api/v1/tenants/${clinicaTenant.id}/queues`)
        .set('Authorization', `Bearer ${clinicaAuthToken}`)
        .send({
          name: 'Endocrinologia',
          description: 'Consultas com endocrinologista',
          queueType: 'GENERAL',
          capacity: 20,
          avgServiceTime: 900, // 15 minutos
        })
        .expect(201);

      // Criar fila de Raio-X
      const raioXResponse = await request(app.getHttpServer())
        .post(`/api/v1/tenants/${clinicaTenant.id}/queues`)
        .set('Authorization', `Bearer ${clinicaAuthToken}`)
        .send({
          name: 'Raio-X',
          description: 'Exames de radiografia',
          queueType: 'GENERAL',
          capacity: 15,
          avgServiceTime: 300, // 5 minutos
        })
        .expect(201);

      // Criar fila de Pediatria
      const pediatriaResponse = await request(app.getHttpServer())
        .post(`/api/v1/tenants/${clinicaTenant.id}/queues`)
        .set('Authorization', `Bearer ${clinicaAuthToken}`)
        .send({
          name: 'Pediatria',
          description: 'Consultas pediátricas',
          queueType: 'PRIORITY', // Crianças têm prioridade
          capacity: 25,
          avgServiceTime: 1200, // 20 minutos
        })
        .expect(201);

      // Criar fila de Oftalmologia
      const oftalmologiaResponse = await request(app.getHttpServer())
        .post(`/api/v1/tenants/${clinicaTenant.id}/queues`)
        .set('Authorization', `Bearer ${clinicaAuthToken}`)
        .send({
          name: 'Oftalmologia',
          description: 'Consultas oftalmológicas',
          queueType: 'GENERAL',
          capacity: 12,
          avgServiceTime: 600, // 10 minutos
        })
        .expect(201);

      // Verificar que todas foram criadas para o mesmo tenant
      expect(endocrinoResponse.body.tenantId).toBe(clinicaTenant.id);
      expect(raioXResponse.body.tenantId).toBe(clinicaTenant.id);
      expect(pediatriaResponse.body.tenantId).toBe(clinicaTenant.id);
      expect(oftalmologiaResponse.body.tenantId).toBe(clinicaTenant.id);

      // Verificar que são filas diferentes
      const filaIds = [
        endocrinoResponse.body.id,
        raioXResponse.body.id,
        pediatriaResponse.body.id,
        oftalmologiaResponse.body.id,
      ];

      expect(new Set(filaIds).size).toBe(4); // Todos IDs únicos
    });

    it('deve listar todas as filas do centro clínico', async () => {
      // Criar filas de teste
      await Promise.all([
        prisma.queue.create({
          data: {
            name: 'Endocrinologia',
            queueType: 'GENERAL',
            tenantId: clinicaTenant.id,
          },
        }),
        prisma.queue.create({
          data: {
            name: 'Raio-X',
            queueType: 'GENERAL',
            tenantId: clinicaTenant.id,
          },
        }),
        prisma.queue.create({
          data: {
            name: 'Pediatria',
            queueType: 'PRIORITY',
            tenantId: clinicaTenant.id,
          },
        }),
      ]);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/tenants/${clinicaTenant.id}/queues`)
        .set('Authorization', `Bearer ${clinicaAuthToken}`)
        .expect(200);

      expect(response.body).toHaveLength(3);

      const nomes = response.body.map((fila: any) => fila.name);
      expect(nomes).toContain('Endocrinologia');
      expect(nomes).toContain('Raio-X');
      expect(nomes).toContain('Pediatria');
    });

    it('deve permitir clientes específicos em filas especializadas', async () => {
      // Criar as filas
      filaEndocrino = await prisma.queue.create({
        data: {
          name: 'Endocrinologia',
          queueType: 'GENERAL',
          tenantId: clinicaTenant.id,
        },
      });

      filaPediatria = await prisma.queue.create({
        data: {
          name: 'Pediatria',
          queueType: 'PRIORITY',
          tenantId: clinicaTenant.id,
        },
      });

      // Cliente para Endocrinologia
      const endocrinoTicket = await request(app.getHttpServer())
        .post(`/api/v1/queues/${filaEndocrino.id}/tickets`)
        .send({
          clientName: 'Ana Costa',
          clientPhone: '(11) 99999-1111',
          priority: 1,
        })
        .expect(201);

      // Cliente para Pediatria (criança)
      const pediatriaTicket = await request(app.getHttpServer())
        .post(`/api/v1/queues/${filaPediatria.id}/tickets`)
        .send({
          clientName: 'Pedro Silva (filho)',
          clientPhone: '(11) 99999-2222',
          priority: 2, // Prioridade mais alta para criança
        })
        .expect(201);

      // Verificar isolamento entre filas
      expect(endocrinoTicket.body.queueId).toBe(filaEndocrino.id);
      expect(pediatriaTicket.body.queueId).toBe(filaPediatria.id);
      expect(endocrinoTicket.body.queueId).not.toBe(
        pediatriaTicket.body.queueId,
      );
    });

    it('deve processar filas independentemente', async () => {
      // Setup das filas
      filaRaioX = await prisma.queue.create({
        data: {
          name: 'Raio-X',
          queueType: 'GENERAL',
          tenantId: clinicaTenant.id,
        },
      });

      filaOftalmologia = await prisma.queue.create({
        data: {
          name: 'Oftalmologia',
          queueType: 'GENERAL',
          tenantId: clinicaTenant.id,
        },
      });

      // Adicionar tickets em cada fila
      const ticketRaioX = await prisma.ticket.create({
        data: {
          number: 1,
          clientName: 'Paciente Raio-X',
          status: 'WAITING',
          queueId: filaRaioX.id,
        },
      });

      const ticketOftalmo = await prisma.ticket.create({
        data: {
          number: 1,
          clientName: 'Paciente Oftalmologia',
          status: 'WAITING',
          queueId: filaOftalmologia.id,
        },
      });

      // Chamar próximo do Raio-X
      const chamadaRaioX = await request(app.getHttpServer())
        .post(
          `/api/v1/tenants/${clinicaTenant.id}/queues/${filaRaioX.id}/call-next`,
        )
        .set('Authorization', `Bearer ${clinicaAuthToken}`)
        .expect(201);

      // Chamar próximo da Oftalmologia
      const chamadaOftalmo = await request(app.getHttpServer())
        .post(
          `/api/v1/tenants/${clinicaTenant.id}/queues/${filaOftalmologia.id}/call-next`,
        )
        .set('Authorization', `Bearer ${clinicaAuthToken}`)
        .expect(201);

      // Verificar que cada fila foi processada independentemente
      expect(chamadaRaioX.body.id).toBe(ticketRaioX.id);
      expect(chamadaOftalmo.body.id).toBe(ticketOftalmo.id);
      expect(chamadaRaioX.body.status).toBe('CALLED');
      expect(chamadaOftalmo.body.status).toBe('CALLED');
    });
  });

  describe('🔒 Isolamento entre Empresas', () => {
    let sabinTenant: any;
    let clinicaTenant: any;
    let sabinAgent: any;
    let sabinAuthToken: string;

    beforeEach(async () => {
      // Criar dois tenants diferentes
      sabinTenant = await prisma.tenant.create({
        data: {
          name: 'Sabin',
          slug: `sabin-isolamento-${Date.now()}`,
          email: 'sabin@test.com',
        },
      });

      clinicaTenant = await prisma.tenant.create({
        data: {
          name: 'Centro Clínico',
          slug: `clinica-isolamento-${Date.now()}`,
          email: 'clinica@test.com',
        },
      });

      sabinAgent = await prisma.agent.create({
        data: {
          email: `sabin-agent-${Date.now()}@test.com`,
          name: 'Agente Sabin',
          password: await bcrypt.hash('senha123', 10),
          role: 'ATTENDANT',
          tenantId: sabinTenant.id,
        },
      });

      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: sabinAgent.email,
          password: 'senha123',
        });

      sabinAuthToken = loginResponse.body.access_token;
    });

    it('deve impedir acesso às filas de outra empresa', async () => {
      // Criar fila do Centro Clínico
      const filaClinica = await prisma.queue.create({
        data: {
          name: 'Fila da Clínica',
          queueType: 'GENERAL',
          tenantId: clinicaTenant.id,
        },
      });

      // Tentar acessar fila da clínica com token do Sabin
      // Agora com TenantAuthGuard implementado, deve retornar 403
      await request(app.getHttpServer())
        .get(`/api/v1/tenants/${clinicaTenant.id}/queues`)
        .set('Authorization', `Bearer ${sabinAuthToken}`)
        .expect(403); // Forbidden - não pode acessar outro tenant
    });

    it('deve mostrar apenas filas do próprio tenant', async () => {
      // Criar filas para cada tenant
      await prisma.queue.create({
        data: {
          name: 'Fila Sabin',
          queueType: 'GENERAL',
          tenantId: sabinTenant.id,
        },
      });

      await prisma.queue.create({
        data: {
          name: 'Fila Clínica',
          queueType: 'GENERAL',
          tenantId: clinicaTenant.id,
        },
      });

      // Buscar filas do Sabin
      const response = await request(app.getHttpServer())
        .get(`/api/v1/tenants/${sabinTenant.id}/queues`)
        .set('Authorization', `Bearer ${sabinAuthToken}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].name).toBe('Fila Sabin');
      expect(response.body[0].tenantId).toBe(sabinTenant.id);
    });
  });
});
