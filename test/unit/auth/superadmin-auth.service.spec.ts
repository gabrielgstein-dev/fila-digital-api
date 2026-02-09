import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../../../src/auth/auth.service';
import { PrismaService } from '../../../src/prisma/prisma.service';

interface MockPrismaService {
  agent: { findUnique: jest.Mock };
  corporateUser: { findUnique: jest.Mock };
  client: { findUnique: jest.Mock };
  user: { findUnique: jest.Mock };
  superAdmin: { findUnique: jest.Mock };
}

const createMockPrismaService = (): MockPrismaService => ({
  agent: { findUnique: jest.fn() },
  corporateUser: { findUnique: jest.fn() },
  client: { findUnique: jest.fn() },
  user: { findUnique: jest.fn() },
  superAdmin: { findUnique: jest.fn() },
});

describe('AuthService - SuperAdmin', () => {
  let service: AuthService;
  let prisma: MockPrismaService;
  let jwtService: jest.Mocked<JwtService>;

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
          useFactory: () => ({ sign: jest.fn() }),
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get(PrismaService) as unknown as MockPrismaService;
    jwtService = module.get(JwtService) as jest.Mocked<JwtService>;
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('validateSuperAdmin', () => {
    it('deve retornar o superadmin quando credenciais estiverem corretas', async () => {
      const hashedPassword = await bcrypt.hash('SuperSenha@123', 10);
      const mockSuperAdmin = {
        id: 'sa-123',
        email: 'admin@agilizafilas.com',
        name: 'Super Admin',
        password: hashedPassword,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.superAdmin.findUnique.mockResolvedValue(mockSuperAdmin);

      const result = await service.validateSuperAdmin(
        'admin@agilizafilas.com',
        'SuperSenha@123',
      );

      expect(prisma.superAdmin.findUnique).toHaveBeenCalledWith({
        where: { email: 'admin@agilizafilas.com' },
      });
      expect(result).toEqual(mockSuperAdmin);
    });

    it('deve lançar UnauthorizedException quando superadmin não for encontrado', async () => {
      prisma.superAdmin.findUnique.mockResolvedValue(null);

      await expect(
        service.validateSuperAdmin('inexistente@email.com', 'senha123'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('deve lançar UnauthorizedException quando superadmin estiver inativo', async () => {
      const hashedPassword = await bcrypt.hash('senha123', 10);
      const mockSuperAdmin = {
        id: 'sa-123',
        email: 'admin@agilizafilas.com',
        name: 'Super Admin',
        password: hashedPassword,
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.superAdmin.findUnique.mockResolvedValue(mockSuperAdmin);

      await expect(
        service.validateSuperAdmin('admin@agilizafilas.com', 'senha123'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('deve lançar UnauthorizedException quando a senha estiver incorreta', async () => {
      const hashedPassword = await bcrypt.hash('senhaCorreta', 10);
      const mockSuperAdmin = {
        id: 'sa-123',
        email: 'admin@agilizafilas.com',
        name: 'Super Admin',
        password: hashedPassword,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.superAdmin.findUnique.mockResolvedValue(mockSuperAdmin);

      await expect(
        service.validateSuperAdmin('admin@agilizafilas.com', 'senhaErrada'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('superAdminLogin', () => {
    it('deve retornar token JWT e dados do superadmin', async () => {
      const hashedPassword = await bcrypt.hash('SuperSenha@123', 10);
      const mockSuperAdmin = {
        id: 'sa-123',
        email: 'admin@agilizafilas.com',
        name: 'Super Admin',
        password: hashedPassword,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.superAdmin.findUnique.mockResolvedValue(mockSuperAdmin);
      jwtService.sign.mockReturnValue('jwt-superadmin-token');

      const result = await service.superAdminLogin(
        'admin@agilizafilas.com',
        'SuperSenha@123',
      );

      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: 'sa-123',
        email: 'admin@agilizafilas.com',
        userType: 'superadmin',
      });

      expect(result).toHaveProperty('access_token', 'jwt-superadmin-token');
      expect(result).toHaveProperty('userType', 'superadmin');
      expect(result).toHaveProperty('user');
      expect(result.user).not.toHaveProperty('password');
      expect(result.user).toHaveProperty('id', 'sa-123');
      expect(result.user).toHaveProperty('email', 'admin@agilizafilas.com');
      expect(result.user).toHaveProperty('name', 'Super Admin');
    });

    it('não deve retornar a senha no objeto user', async () => {
      const hashedPassword = await bcrypt.hash('SuperSenha@123', 10);
      const mockSuperAdmin = {
        id: 'sa-123',
        email: 'admin@agilizafilas.com',
        name: 'Super Admin',
        password: hashedPassword,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.superAdmin.findUnique.mockResolvedValue(mockSuperAdmin);
      jwtService.sign.mockReturnValue('jwt-token');

      const result = await service.superAdminLogin(
        'admin@agilizafilas.com',
        'SuperSenha@123',
      );

      expect(result.user).not.toHaveProperty('password');
    });

    it('deve propagar UnauthorizedException quando credenciais inválidas', async () => {
      prisma.superAdmin.findUnique.mockResolvedValue(null);

      await expect(
        service.superAdminLogin('invalido@email.com', 'senhaerrada'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
