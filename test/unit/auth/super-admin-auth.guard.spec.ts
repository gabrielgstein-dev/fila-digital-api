import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SuperAdminAuthGuard } from '../../../src/auth/guards/super-admin-auth.guard';

describe('SuperAdminAuthGuard', () => {
  let guard: SuperAdminAuthGuard;
  let reflector: Reflector;

  const createMockContext = (user: any): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
        getResponse: () => ({}),
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
      getArgs: () => [],
      getArgByIndex: () => null,
      switchToRpc: () => ({} as any),
      switchToWs: () => ({} as any),
      getType: () => 'http',
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    reflector = new Reflector();
    guard = new SuperAdminAuthGuard(reflector);
  });

  it('deve estar definido', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('deve permitir acesso quando userType é superadmin', async () => {
      const context = createMockContext({
        id: 'sa-123',
        email: 'admin@agilizafilas.com',
        userType: 'superadmin',
      });

      jest
        .spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), 'canActivate')
        .mockResolvedValue(true);

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('deve lançar ForbiddenException quando userType é agent', async () => {
      const context = createMockContext({
        id: 'agent-123',
        email: 'agent@empresa.com',
        userType: 'agent',
      });

      jest
        .spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), 'canActivate')
        .mockResolvedValue(true);

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('deve lançar ForbiddenException quando userType é corporate_user', async () => {
      const context = createMockContext({
        id: 'cu-123',
        email: 'admin@empresa.com',
        userType: 'corporate_user',
      });

      jest
        .spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), 'canActivate')
        .mockResolvedValue(true);

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('deve lançar ForbiddenException quando userType é client', async () => {
      const context = createMockContext({
        id: 'client-123',
        email: 'client@example.com',
        userType: 'client',
      });

      jest
        .spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), 'canActivate')
        .mockResolvedValue(true);

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('deve lançar UnauthorizedException quando não há user no request', async () => {
      const context = createMockContext(null);

      jest
        .spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), 'canActivate')
        .mockResolvedValue(true);

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('deve lançar ForbiddenException com mensagem correta', async () => {
      const context = createMockContext({
        id: 'agent-123',
        userType: 'agent',
      });

      jest
        .spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), 'canActivate')
        .mockResolvedValue(true);

      await expect(guard.canActivate(context)).rejects.toThrow(
        'Acesso restrito aos administradores do sistema',
      );
    });
  });
});
