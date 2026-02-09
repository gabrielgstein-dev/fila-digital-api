import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthController } from '../../../src/auth/auth.controller';
import { AuthService } from '../../../src/auth/auth.service';
import { AuthThrottleGuard } from '../../../src/auth/guards/auth-throttle.guard';

const mockAuthThrottleGuard = {
  canActivate: jest.fn().mockReturnValue(true),
};

describe('AuthController - SuperAdmin', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  beforeEach(async () => {
    const mockAuthService = {
      corporateUserLogin: jest.fn(),
      login: jest.fn(),
      clientLogin: jest.fn(),
      googleLogin: jest.fn(),
      validateGoogleTokenAndLogin: jest.fn(),
      superAdminLogin: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([
          { name: 'short', ttl: 1000, limit: 100 },
          { name: 'medium', ttl: 10000, limit: 1000 },
          { name: 'long', ttl: 60000, limit: 10000 },
        ]),
      ],
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    })
      .overrideGuard(AuthThrottleGuard)
      .useValue(mockAuthThrottleGuard)
      .compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  it('deve estar definido', () => {
    expect(controller).toBeDefined();
  });

  describe('superAdminLogin', () => {
    it('deve chamar superAdminLogin com credenciais corretas', async () => {
      const body = {
        email: 'admin@agilizafilas.com',
        password: 'SuperSenha@123',
      };

      const expectedResult = {
        access_token: 'jwt-superadmin-token',
        user: {
          id: 'sa-123',
          email: 'admin@agilizafilas.com',
          name: 'Super Admin',
          isActive: true,
        },
        userType: 'superadmin',
      };

      authService.superAdminLogin.mockResolvedValue(expectedResult);

      const result = await controller.superAdminLogin(body);

      expect(authService.superAdminLogin).toHaveBeenCalledWith(
        body.email,
        body.password,
      );
      expect(result).toEqual(expectedResult);
    });

    it('deve retornar userType superadmin no resultado', async () => {
      const body = {
        email: 'admin@agilizafilas.com',
        password: 'SuperSenha@123',
      };

      authService.superAdminLogin.mockResolvedValue({
        access_token: 'token',
        user: { id: 'sa-123', email: body.email, name: 'Admin' },
        userType: 'superadmin',
      });

      const result = await controller.superAdminLogin(body);

      expect(result.userType).toBe('superadmin');
    });

    it('deve propagar UnauthorizedException com credenciais inválidas', async () => {
      const body = {
        email: 'invalido@email.com',
        password: 'senhaerrada',
      };

      authService.superAdminLogin.mockRejectedValue(
        new UnauthorizedException('Credenciais inválidas'),
      );

      await expect(controller.superAdminLogin(body)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('deve propagar UnauthorizedException quando superadmin está inativo', async () => {
      const body = {
        email: 'admin@agilizafilas.com',
        password: 'SuperSenha@123',
      };

      authService.superAdminLogin.mockRejectedValue(
        new UnauthorizedException('Credenciais inválidas'),
      );

      await expect(controller.superAdminLogin(body)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
