import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { cleanDatabase } from './setup-database';
const request = require('supertest');

const MIN_NODE_VERSION = 24;
const currentVersion = process.versions.node;
const majorVersion = parseInt(currentVersion.split('.')[0], 10);

if (majorVersion < MIN_NODE_VERSION) {
  console.error('❌ ═══════════════════════════════════════════════════════════════');
  console.error(`❌ ERRO FATAL: Versão do Node.js incompatível!`);
  console.error(`❌ Versão atual: ${currentVersion}`);
  console.error(`❌ Versão mínima requerida: ${MIN_NODE_VERSION}.0.0`);
  console.error('❌ ═══════════════════════════════════════════════════════════════');
  process.exit(1);
}

if (!process.env.DOCKER_ENV) {
  console.error(
    '❌ ERRO CRÍTICO: Testes e2e só podem ser executados no ambiente Docker!',
  );
  console.error('   Use: npm run test:e2e:docker');
  console.error(
    '   Isso protege o banco de dados de QA contra execuções acidentais.',
  );
  process.exit(1);
}

// Função para gerar CPF válido
function generateValidCPF(): string {
  const generateDigit = (cpf: string[]): number => {
    const weights = cpf.length + 1;
    let sum = 0;
    for (let i = 0; i < cpf.length; i++) {
      sum += parseInt(cpf[i]) * (weights - i);
    }
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  // Gera 9 dígitos aleatórios
  const baseDigits = Array.from({ length: 9 }, () =>
    Math.floor(Math.random() * 10),
  );

  // Calcula os dois dígitos verificadores
  const firstDigit = generateDigit(baseDigits);
  const secondDigit = generateDigit([...baseDigits, firstDigit]);

  return [...baseDigits, firstDigit, secondDigit].join('');
}

export class TestHelper {
  public app: INestApplication;
  public prisma: PrismaService;
  public moduleFixture: TestingModule;

  // Rastreamento de dados criados para limpeza seletiva
  private createdData: {
    tenants: string[];
    agents: string[];
    queues: string[];
    tickets: string[];
    corporateUsers: string[];
  } = {
    tenants: [],
    agents: [],
    queues: [],
    tickets: [],
    corporateUsers: [],
  };

  static async createInstance(): Promise<TestHelper> {
    const instance = new TestHelper();
    await instance.beforeAll();
    return instance;
  }

  async beforeAll(): Promise<void> {
    // Criar servidor isolado para cada instância
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
        disableErrorMessages: false,
        validateCustomDecorators: true,
      }),
    );

    this.app.setGlobalPrefix('api/v1');

    await this.app.init();
  }

  async afterAll(): Promise<void> {
    if (this.app) {
      await this.app.close();
    }
  }

  async beforeEach(): Promise<void> {
    // Limpar todo o banco para garantir isolamento entre testes
    await cleanDatabase(this.prisma);

    // Resetar o rastreamento de dados
    this.createdData = {
      tenants: [],
      agents: [],
      queues: [],
      tickets: [],
      corporateUsers: [],
    };
  }

  async createTenant(data?: Partial<any>) {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    const baseSlug = data?.slug || `empresa-teste-${timestamp}`;
    const uniqueSlug = `${baseSlug}-${random}`;

    const tenant = await this.prisma.tenant.create({
      data: {
        name: 'Empresa Teste',
        email: `contato-${timestamp}@empresa.com`,
        phone: '(11) 99999-9999',
        slug: uniqueSlug, // Garantir que o slug único seja usado
        ...data,
      },
    });
    this.trackTenant(tenant.id);
    return tenant;
  }

  async createAgent(tenantId: string, data?: Partial<any>) {
    if (!tenantId) {
      throw new Error('tenantId é obrigatório para criar um agente');
    }

    const bcrypt = await import('bcrypt');
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    const cpf = generateValidCPF();

    const agent = await this.prisma.agent.create({
      data: {
        email: `atendente-${timestamp}@empresa.com`,
        cpf,
        name: 'Atendente Teste',
        password: await bcrypt.hash('senha123', 10),
        role: 'OPERADOR',
        tenantId,
        ...data,
      },
    });
    this.trackAgent(agent.id);
    return agent;
  }

  async createQueue(tenantId: string, data?: Partial<any>) {
    if (!tenantId) {
      throw new Error('tenantId é obrigatório para criar uma fila');
    }

    const queue = await this.prisma.queue.create({
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
    this.trackQueue(queue.id);
    return queue;
  }

  async createTicket(queueId: string, data?: Partial<any>) {
    if (!queueId) {
      throw new Error('queueId é obrigatório para criar um ticket');
    }

    const ticket = await this.prisma.ticket.create({
      data: {
        priority: 1,
        status: 'WAITING',
        queueId,
        estimatedTime: 300,
        myCallingToken: `token-${Date.now()}`,
        ...data,
      },
    });
    this.trackTicket(ticket.id);
    return ticket;
  }

  async createCounter(tenantId: string, data?: Partial<any>) {
    if (!tenantId) {
      throw new Error('tenantId é obrigatório para criar um contador');
    }

    const counter = await this.prisma.counter.create({
      data: {
        name: 'Guichê 1',
        number: 1,
        tenantId,
        ...data,
      },
    });
    return counter;
  }

  async createCorporateUser(tenantId: string, data?: Partial<any>) {
    if (!tenantId) {
      throw new Error(
        'tenantId é obrigatório para criar um usuário corporativo',
      );
    }

    // Verificar se o tenant existe
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new Error(`Tenant com ID ${tenantId} não encontrado`);
    }

    const bcrypt = await import('bcrypt');
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10);
    const cpf = generateValidCPF();

    const user = await this.prisma.corporateUser.create({
      data: {
        email: `usuario-${timestamp}@empresa.com`,
        cpf,
        name: 'Usuário Corporativo',
        password: await bcrypt.hash('senha123', 10),
        role: 'OPERADOR',
        tenantId,
        ...data,
      },
    });
    this.trackCorporateUser(user.id);
    return user;
  }

  async updateCorporateUser(id: string, data: Partial<any>) {
    return await this.prisma.corporateUser.update({
      where: { id },
      data,
    });
  }

  async getCorporateUser(id: string) {
    return await this.prisma.corporateUser.findUnique({
      where: { id },
    });
  }

  async loginAgent(cpf: string, password: string) {
    const response = await this.getRequest()
      .post('/api/v1/auth/agent/login')
      .send({ cpf, password })
      .expect(200);

    return response.body.access_token;
  }

  async loginCorporateUser(email: string, password: string) {
    const response = await this.getRequest()
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);

    return response.body.access_token;
  }

  async createAuthToken(): Promise<string> {
    const tenant = await this.createTenant();
    const agent = await this.createAgent(tenant.id, { role: 'ADMINISTRADOR' });
    return this.loginAgent(agent.cpf, 'senha123');
  }

  async createCorporateAuthToken(): Promise<string> {
    const tenant = await this.createTenant();
    const user = await this.createCorporateUser(tenant.id, {
      role: 'ADMINISTRADOR',
    });
    return this.loginCorporateUser(user.email, 'senha123');
  }

  getRequest() {
    return request(this.app.getHttpServer());
  }

  withAuth(token: string) {
    return this.getRequest().set('Authorization', `Bearer ${token}`);
  }

  async setupCompleteTestData() {
    // Garantir que temos dados válidos criando tudo do zero
    const tenant = await this.createTenant();
    const agent = await this.createAgent(tenant.id, { role: 'ADMINISTRADOR' });
    const queue = await this.createQueue(tenant.id);
    const counter = await this.createCounter(tenant.id);

    return {
      tenant,
      agent,
      queue,
      counter,
    };
  }

  async setupCompleteTestDataWithCorporateUsers() {
    // Garantir que temos dados válidos criando tudo do zero
    const tenant = await this.createTenant();

    const adminUser = await this.createCorporateUser(tenant.id, {
      email: `admin-${Date.now()}@empresa.com`,
      cpf: `1111111111${Date.now() % 100}`,
      name: 'Administrador Teste',
      role: 'ADMINISTRADOR',
    });

    const gestorUser = await this.createCorporateUser(tenant.id, {
      email: `gestor-${Date.now()}@empresa.com`,
      cpf: `2222222222${Date.now() % 100}`,
      name: 'Gestor Teste',
      role: 'GESTOR',
    });

    const gerenteUser = await this.createCorporateUser(tenant.id, {
      email: `gerente-${Date.now()}@empresa.com`,
      cpf: `3333333333${Date.now() % 100}`,
      name: 'Gerente Teste',
      role: 'GERENTE',
    });

    const operadorUser = await this.createCorporateUser(tenant.id, {
      email: `operador-${Date.now()}@empresa.com`,
      cpf: `4444444444${Date.now() % 100}`,
      name: 'Operador Teste',
      role: 'OPERADOR',
    });

    return {
      tenant,
      adminUser,
      gestorUser,
      gerenteUser,
      operadorUser,
    };
  }

  async setupCompleteTestDataWithAuth() {
    const data = await this.setupCompleteTestData();
    const token = await this.loginAgent(data.agent.cpf, 'senha123');

    return {
      ...data,
      token,
    };
  }

  // Método para limpeza global (chamado apenas uma vez no final)
  static async cleanupGlobal(): Promise<void> {
    // Não há mais um servidor global compartilhado, então não faz nada aqui
  }

  // Limpeza seletiva apenas dos dados criados pelo teste
  private async cleanCreatedData(): Promise<void> {
    console.log('🧹 Limpando dados criados pelo teste...');

    try {
      // Limpar na ordem correta (respeitando foreign keys)

      // 1. Tickets (dependem de queues)
      if (this.createdData.tickets.length > 0) {
        await this.prisma.ticket.deleteMany({
          where: { id: { in: this.createdData.tickets } },
        });
        console.log(`✅ ${this.createdData.tickets.length} tickets removidos`);
      }

      // 2. Queues (dependem de tenants)
      if (this.createdData.queues.length > 0) {
        await this.prisma.queue.deleteMany({
          where: { id: { in: this.createdData.queues } },
        });
        console.log(`✅ ${this.createdData.queues.length} queues removidas`);
      }

      // 3. Agents (dependem de tenants)
      if (this.createdData.agents.length > 0) {
        await this.prisma.agent.deleteMany({
          where: { id: { in: this.createdData.agents } },
        });
        console.log(`✅ ${this.createdData.agents.length} agents removidos`);
      }

      // 4. Corporate Users (dependem de tenants)
      if (this.createdData.corporateUsers.length > 0) {
        await this.prisma.corporateUser.deleteMany({
          where: { id: { in: this.createdData.corporateUsers } },
        });
        console.log(
          `✅ ${this.createdData.corporateUsers.length} corporate users removidos`,
        );
      }

      // 5. Tenants (últimos, pois outros dependem deles)
      if (this.createdData.tenants.length > 0) {
        await this.prisma.tenant.deleteMany({
          where: { id: { in: this.createdData.tenants } },
        });
        console.log(`✅ ${this.createdData.tenants.length} tenants removidos`);
      }

      // Resetar o rastreamento
      this.createdData = {
        tenants: [],
        agents: [],
        queues: [],
        tickets: [],
        corporateUsers: [],
      };

      console.log('✅ Limpeza seletiva concluída com sucesso!');
    } catch (error) {
      console.error('❌ Erro na limpeza seletiva:', error);
      // Em caso de erro, fazer limpeza completa como fallback
      console.log('🔄 Fallback: executando limpeza completa...');
      await cleanDatabase(this.prisma);
    }
  }

  // Métodos para rastrear dados criados
  private trackTenant(id: string): void {
    this.createdData.tenants.push(id);
  }

  private trackAgent(id: string): void {
    this.createdData.agents.push(id);
  }

  private trackQueue(id: string): void {
    this.createdData.queues.push(id);
  }

  private trackTicket(id: string): void {
    this.createdData.tickets.push(id);
  }

  private trackCorporateUser(id: string): void {
    this.createdData.corporateUsers.push(id);
  }

  // Método para obter ou criar tenant padrão (cacheado)
  async getOrCreateDefaultTenant(): Promise<any> {
    // Não há mais cache, então sempre cria um novo
    const tenant = await this.createTenant({
      name: 'Tenant Padrão Cacheado',
      slug: `tenant-padrao-${Date.now()}`,
    });
    return tenant;
  }

  // Método para obter ou criar fila padrão (cacheada)
  async getOrCreateDefaultQueue(tenantId?: string): Promise<any> {
    // Não há mais cache, então sempre cria um novo
    const tenant = tenantId
      ? { id: tenantId }
      : await this.getOrCreateDefaultTenant();
    const queue = await this.createQueue(tenant.id, {
      name: 'Fila Padrão Cacheada',
      description: 'Fila padrão para testes',
    });
    return queue;
  }

  // Método para obter ou criar agente padrão (cacheado)
  async getOrCreateDefaultAgent(tenantId?: string): Promise<any> {
    // Não há mais cache, então sempre cria um novo
    const tenant = tenantId
      ? { id: tenantId }
      : await this.getOrCreateDefaultTenant();
    const agent = await this.createAgent(tenant.id, {
      role: 'ADMINISTRADOR',
    });
    return agent;
  }

  // Limpar cache quando necessário
  static clearCache(): void {
    // Não há mais cache global, então não faz nada
  }
}
