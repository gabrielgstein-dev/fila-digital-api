import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { Response } from 'express';
import { AuthController } from '../../../src/auth/auth.controller';
import { AuthService } from '../../../src/auth/auth.service';
import { AuthThrottleGuard } from '../../../src/auth/guards/auth-throttle.guard';
import { CorporateUserLoginDto } from '../../../src/common/dto/corporate-user-login.dto';
import { LoginDto } from '../../../src/common/dto/login.dto';

// Mock do AuthThrottleGuard
const mockAuthThrottleGuard = {
  canActivate: jest.fn().mockReturnValue(true),
};

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  beforeEach(async () => {
    const mockAuthService = {
      corporateUserLogin: jest.fn(),
      login: jest.fn(),
      clientLogin: jest.fn(),
      googleLogin: jest.fn(),
      validateGoogleTokenAndLogin: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([
          {
            name: 'short',
            ttl: 1000,
            limit: 100,
          },
          {
            name: 'medium',
            ttl: 10000,
            limit: 1000,
          },
          {
            name: 'long',
            ttl: 60000,
            limit: 10000,
          },
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

  describe('login', () => {
    it('deve chamar corporateUserLogin com credenciais corretas', async () => {
      const loginDto: CorporateUserLoginDto = {
        email: 'admin@example.com',
        password: 'senha123',
      };

      const expectedResult = {
        access_token: 'token-jwt',
        user: {
          id: '123',
          email: 'admin@example.com',
          name: 'Admin',
          role: 'ADMINISTRADOR',
          tenantId: 'tenant-123',
        },
        userType: 'corporate_user',
      };

      authService.corporateUserLogin.mockResolvedValue(expectedResult);

      const result = await controller.login(loginDto);

      expect(authService.corporateUserLogin).toHaveBeenCalledWith(
        loginDto.email,
        loginDto.password,
      );
      expect(result).toEqual(expectedResult);
    });

    it('deve lidar com erro de autenticação', async () => {
      const loginDto: CorporateUserLoginDto = {
        email: 'invalido@example.com',
        password: 'senhaerrada',
      };

      authService.corporateUserLogin.mockRejectedValue(
        new UnauthorizedException('Credenciais inválidas'),
      );

      await expect(controller.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('agentLogin', () => {
    it('deve chamar login com credenciais corretas', async () => {
      const loginDto: LoginDto = {
        cpf: '12345678900',
        password: 'senha123',
      };

      const expectedResult = {
        access_token: 'token-jwt',
        user: {
          id: 'agent-123',
          cpf: '12345678900',
          name: 'Atendente',
          role: 'ATENDENTE',
          tenantId: 'tenant-123',
        },
        userType: 'agent',
      };

      authService.login.mockResolvedValue(expectedResult);

      const result = await controller.agentLogin(loginDto);

      expect(authService.login).toHaveBeenCalledWith(
        loginDto.cpf,
        loginDto.password,
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('clientLogin', () => {
    it('deve chamar clientLogin com credenciais corretas', async () => {
      const loginDto: LoginDto = {
        cpf: '98765432100',
        password: 'senha123',
      };

      const expectedResult = {
        access_token: 'token-jwt',
        user: {
          id: 'client-123',
          cpf: '98765432100',
          name: 'Cliente',
          phone: '(11) 99999-8888',
          email: 'cliente@example.com',
        },
        userType: 'client',
      };

      authService.clientLogin.mockResolvedValue(expectedResult);

      const result = await controller.clientLogin(loginDto);

      expect(authService.clientLogin).toHaveBeenCalledWith(
        loginDto.cpf,
        loginDto.password,
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('googleCallback', () => {
    it('deve redirecionar para a URL correta para usuário corporativo', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'corporate@example.com',
        name: 'Usuário Corporativo',
        role: 'ADMINISTRADOR',
        tenantId: 'tenant-123',
      };

      const mockResult = {
        access_token: 'token-jwt',
        user: mockUser,
        userType: 'corporate_user',
      };

      const mockReq = { user: mockUser };
      const mockRes: Partial<Response> = {
        redirect: jest.fn().mockReturnThis(),
      };

      authService.googleLogin.mockResolvedValue(mockResult);

      await controller.googleCallback(mockReq as any, mockRes as Response);

      expect(authService.googleLogin).toHaveBeenCalledWith(mockUser);
      expect(mockRes.redirect).toHaveBeenCalledWith(
        expect.stringContaining(
          '/corporate-dashboard?token=token-jwt&type=corporate_user',
        ),
      );
    });

    it('deve lidar com erro durante o login com Google', async () => {
      const mockReq = { user: { email: 'erro@example.com' } };
      const mockRes: Partial<Response> = {
        redirect: jest.fn().mockReturnThis(),
      };

      const error = new Error('Erro no login com Google');
      authService.googleLogin.mockRejectedValue(error);

      await controller.googleCallback(mockReq as any, mockRes as Response);

      expect(mockRes.redirect).toHaveBeenCalledWith(
        expect.stringContaining('/auth/error?message='),
      );
    });
  });

  describe('googleMobileLogin', () => {
    it('deve validar token e fazer login com sucesso', async () => {
      const token = 'google-token';
      const userData = {
        id: 'google-user-123',
        email: 'mobile@example.com',
        name: 'Usuário Mobile',
        picture: 'https://example.com/photo.jpg',
      };

      const expectedResult = {
        access_token: 'jwt-token',
        user: {
          ...userData,
          role: 'ADMINISTRADOR',
          tenantId: 'tenant-123',
        },
        userType: 'corporate_user',
      };

      authService.validateGoogleTokenAndLogin.mockResolvedValue(expectedResult);

      const result = await controller.googleMobileLogin({
        access_token: token,
        user: userData,
      });

      expect(authService.validateGoogleTokenAndLogin).toHaveBeenCalledWith(
        token,
        userData,
      );
      expect(result).toEqual(expectedResult);
    });
  });
});
