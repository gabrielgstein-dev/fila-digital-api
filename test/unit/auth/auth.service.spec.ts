import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import {
  Agent,
  AgentRole,
  CorporateUser,
  CorporateUserRole,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../../../src/auth/auth.service';
import { PrismaService } from '../../../src/prisma/prisma.service';

// Tipos para os mocks
interface MockPrismaService {
  agent: {
    findUnique: jest.Mock<Promise<Partial<Agent> | null>, [any]>;
  };
  corporateUser: {
    findUnique: jest.Mock<Promise<Partial<CorporateUser> | null>, [any]>;
  };
  client: {
    findUnique: jest.Mock<Promise<any>, [any]>;
  };
  user: {
    findUnique: jest.Mock<Promise<any>, [any]>;
  };
}

const createMockPrismaService = (): MockPrismaService => ({
  agent: {
    findUnique: jest.fn(),
  },
  corporateUser: {
    findUnique: jest.fn(),
  },
  client: {
    findUnique: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
});

describe('AuthService', () => {
  let service: AuthService;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let jwtService: jest.Mocked<JwtService>;

  const mockJwtService = () => ({
    sign: jest.fn(),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: createMockPrismaService(),
        },
        {
          provide: JwtService,
          useFactory: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get(PrismaService) as unknown as ReturnType<
      typeof createMockPrismaService
    >;
    jwtService = module.get(JwtService) as jest.Mocked<JwtService>;
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('validateAgent', () => {
    it('deve retornar o agente quando as credenciais estiverem corretas', async () => {
      const hashedPassword = await bcrypt.hash('senha123', 10);
      const mockAgent = {
        id: 'agent-123',
        cpf: '12345678900',
        password: hashedPassword,
        isActive: true,
        name: 'Atendente',
        role: 'ATENDENTE' as AgentRole,
        tenantId: 'tenant-123',
        tenant: {
          id: 'tenant-123',
          name: 'Tenant Teste',
        },
        // Adicionando campos obrigatórios do tipo Agent
        email: 'atendente@example.com',
        googleId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        isDefault: false,
        isProtected: false,
      };

      // Configura o mock para retornar o agente simulado
      prisma.agent.findUnique.mockResolvedValue(mockAgent);

      const result = await service.validateAgent('12345678900', 'senha123');

      expect(prisma.agent.findUnique).toHaveBeenCalledWith({
        where: { cpf: '12345678900' },
        include: { tenant: true },
      });
      expect(result).toEqual({
        id: 'agent-123',
        cpf: '12345678900',
        isActive: true,
        name: 'Atendente',
        role: 'ATENDENTE',
        tenantId: 'tenant-123',
        tenant: {
          id: 'tenant-123',
          name: 'Tenant Teste',
        },
        email: 'atendente@example.com',
        googleId: null,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        isDefault: false,
        isProtected: false,
      });
    });

    it('deve lançar erro quando o agente não for encontrado', async () => {
      prisma.agent.findUnique.mockResolvedValue(null);

      await expect(
        service.validateAgent('inexistente', 'senha123'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('deve lançar erro quando a senha estiver incorreta', async () => {
      const hashedPassword = await bcrypt.hash('senha123', 10);
      const mockAgent = {
        id: 'agent-123',
        cpf: '12345678900',
        password: hashedPassword,
        isActive: true,
        // Adicionando campos obrigatórios do tipo Agent
        name: 'Atendente',
        email: 'atendente@example.com',
        role: 'ATENDENTE' as AgentRole,
        googleId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        tenantId: 'tenant-123',
        isDefault: false,
        isProtected: false,
      };

      (prisma.agent.findUnique as jest.Mock).mockResolvedValue(mockAgent);

      await expect(
        service.validateAgent('12345678900', 'senhaerrada'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('deve lançar erro quando o agente estiver inativo', async () => {
      const mockAgent = {
        id: 'agent-123',
        cpf: '12345678900',
        password: 'hash123',
        isActive: false,
        // Adicionando campos obrigatórios do tipo Agent
        name: 'Atendente Inativo',
        email: 'inativo@example.com',
        role: 'ATENDENTE' as AgentRole,
        googleId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        tenantId: 'tenant-123',
        isDefault: false,
        isProtected: false,
      };

      (prisma.agent.findUnique as jest.Mock).mockResolvedValue(mockAgent);

      await expect(
        service.validateAgent('12345678900', 'senha123'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('login', () => {
    it('deve retornar um token JWT para o agente', async () => {
      const mockAgent = {
        id: 'agent-123',
        cpf: '12345678900',
        name: 'Atendente',
        role: 'ATENDENTE' as AgentRole,
        tenantId: 'tenant-123',
        email: 'atendente@example.com',
        password: 'hashed-password',
        isActive: true,
        googleId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        isDefault: false,
        isProtected: false,
        tenant: {
          id: 'tenant-123',
          name: 'Tenant Teste',
          email: 'tenant@example.com',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          phone: '(11) 99999-9999',
          slug: 'tenant-teste',
        },
      };

      // Mock do validateAgent
      jest.spyOn(service, 'validateAgent').mockResolvedValue(mockAgent);

      const mockToken = 'jwt-token';
      jwtService.sign.mockReturnValue(mockToken);

      const result = await service.login('12345678900', 'senha123');

      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: 'agent-123',
        email: 'atendente@example.com',
        cpf: '12345678900',
        role: 'ATENDENTE',
        tenantId: 'tenant-123',
        userType: 'agent',
      });

      expect(result).toHaveProperty('access_token', mockToken);
      expect(result).toHaveProperty('user');
      expect(result.user).not.toHaveProperty('password');
    });
  });

  describe('corporateUserLogin', () => {
    it('deve retornar um token JWT para usuário corporativo', async () => {
      const hashedPassword = await bcrypt.hash('senha123', 10);
      const mockUser = {
        id: 'user-123',
        email: 'admin@example.com',
        password: hashedPassword,
        name: 'Admin',
        role: 'ADMINISTRADOR' as CorporateUserRole,
        tenantId: 'tenant-123',
        isActive: true,
        // Adicionando campos obrigatórios do tipo CorporateUser
        googleId: null,
        cpf: '12345678901',
        phone: '(11) 99999-9999',
        position: 'Gerente',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.corporateUser.findUnique.mockResolvedValue(mockUser);
      jwtService.sign.mockReturnValue('jwt-token');

      const result = await service.corporateUserLogin(
        'admin@example.com',
        'senha123',
      );

      expect(prisma.corporateUser.findUnique).toHaveBeenCalledWith({
        where: { email: 'admin@example.com' },
        include: { tenant: true },
      });
      expect(result).toHaveProperty('access_token', 'jwt-token');
      expect(result).toHaveProperty('userType', 'corporate_user');
    });
  });

  describe('clientLogin', () => {
    it('deve retornar um token JWT para cliente', async () => {
      const hashedPassword = await bcrypt.hash('senha123', 10);
      const mockClient = {
        id: 'client-123',
        cpf: '98765432100',
        name: 'Cliente',
        phone: '(11) 99999-9999',
        email: 'cliente@example.com',
        password: hashedPassword,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Configurando o mock para o modelo 'user' no Prisma
      prisma.user = {
        findUnique: jest.fn().mockResolvedValue({
          ...mockClient,
          password: hashedPassword, // Garantir que a senha está hasheada
        }),
      } as any;

      jwtService.sign.mockReturnValue('jwt-token');

      const result = await service.clientLogin('98765432100', 'senha123');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { cpf: '98765432100' },
      });
      expect(result).toHaveProperty('access_token', 'jwt-token');
      expect(result).toHaveProperty('userType', 'client');
    });
  });
});
