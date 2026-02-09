import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtStrategy } from '../../../src/auth/strategies/jwt.strategy';
import { PrismaService } from '../../../src/prisma/prisma.service';

interface MockPrismaService {
  corporateUser: { findUnique: jest.Mock };
  agent: { findUnique: jest.Mock };
  user: { findUnique: jest.Mock };
  superAdmin: { findUnique: jest.Mock };
}

const createMockPrisma = (): MockPrismaService => ({
  corporateUser: { findUnique: jest.fn() },
  agent: { findUnique: jest.fn() },
  user: { findUnique: jest.fn() },
  superAdmin: { findUnique: jest.fn() },
});

describe('JwtStrategy - SuperAdmin', () => {
  let strategy: JwtStrategy;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    const mockPrisma = createMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-jwt-secret'),
          },
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    prisma = module.get(PrismaService) as unknown as MockPrismaService;
  });

  it('deve estar definido', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate - superadmin', () => {
    it('deve retornar dados do superadmin quando ativo', async () => {
      const mockSuperAdmin = {
        id: 'sa-123',
        email: 'admin@agilizafilas.com',
        name: 'Super Admin',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.superAdmin.findUnique.mockResolvedValue(mockSuperAdmin);

      const payload = {
        sub: 'sa-123',
        email: 'admin@agilizafilas.com',
        userType: 'superadmin',
      };

      const result = await strategy.validate(payload);

      expect(prisma.superAdmin.findUnique).toHaveBeenCalledWith({
        where: { id: 'sa-123' },
      });
      expect(result).toEqual({
        id: 'sa-123',
        email: 'admin@agilizafilas.com',
        name: 'Super Admin',
        userType: 'superadmin',
      });
    });

    it('deve lançar UnauthorizedException quando superadmin não encontrado', async () => {
      prisma.superAdmin.findUnique.mockResolvedValue(null);

      const payload = {
        sub: 'sa-inexistente',
        email: 'naoexiste@email.com',
        userType: 'superadmin',
      };

      await expect(strategy.validate(payload)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('deve lançar UnauthorizedException quando superadmin inativo', async () => {
      const mockSuperAdmin = {
        id: 'sa-123',
        email: 'admin@agilizafilas.com',
        name: 'Super Admin',
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.superAdmin.findUnique.mockResolvedValue(mockSuperAdmin);

      const payload = {
        sub: 'sa-123',
        email: 'admin@agilizafilas.com',
        userType: 'superadmin',
      };

      await expect(strategy.validate(payload)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('não deve retornar password nos dados do superadmin', async () => {
      const mockSuperAdmin = {
        id: 'sa-123',
        email: 'admin@agilizafilas.com',
        name: 'Super Admin',
        password: 'hashed-password',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.superAdmin.findUnique.mockResolvedValue(mockSuperAdmin);

      const payload = {
        sub: 'sa-123',
        email: 'admin@agilizafilas.com',
        userType: 'superadmin',
      };

      const result = await strategy.validate(payload);

      expect(result).not.toHaveProperty('password');
      expect(result.userType).toBe('superadmin');
    });
  });

  describe('validate - tipo inválido', () => {
    it('deve lançar UnauthorizedException para userType desconhecido', async () => {
      const payload = {
        sub: 'unknown-123',
        email: 'unknown@email.com',
        userType: 'unknown_type',
      };

      await expect(strategy.validate(payload)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
