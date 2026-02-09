import { Test, TestingModule } from '@nestjs/testing';
import { TenantsController } from '../../../src/tenants/tenants.controller';
import { TenantsService } from '../../../src/tenants/tenants.service';
import { SuperAdminAuthGuard } from '../../../src/auth/guards/super-admin-auth.guard';
import { TenantAuthGuard } from '../../../src/auth/guards/tenant-auth.guard';

const mockSuperAdminGuard = {
  canActivate: jest.fn().mockReturnValue(true),
};

const mockTenantAuthGuard = {
  canActivate: jest.fn().mockReturnValue(true),
};

describe('TenantsController - SuperAdmin endpoints', () => {
  let controller: TenantsController;
  let tenantsService: jest.Mocked<TenantsService>;

  const mockTenantsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findBySlug: jest.fn(),
    update: jest.fn(),
    toggleActive: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TenantsController],
      providers: [
        {
          provide: TenantsService,
          useValue: mockTenantsService,
        },
      ],
    })
      .overrideGuard(SuperAdminAuthGuard)
      .useValue(mockSuperAdminGuard)
      .overrideGuard(TenantAuthGuard)
      .useValue(mockTenantAuthGuard)
      .compile();

    controller = module.get<TenantsController>(TenantsController);
    tenantsService = module.get(TenantsService) as jest.Mocked<TenantsService>;
    jest.clearAllMocks();
  });

  it('deve estar definido', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll (GET /tenants)', () => {
    it('deve retornar lista de todos os tenants', async () => {
      const mockTenants = [
        {
          id: 'tenant-1',
          name: 'Empresa A',
          slug: 'empresa-a',
          email: 'a@empresa.com',
          phone: '(11) 99999-0001',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'tenant-2',
          name: 'Empresa B',
          slug: 'empresa-b',
          email: 'b@empresa.com',
          phone: '(11) 99999-0002',
          isActive: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      tenantsService.findAll.mockResolvedValue(mockTenants);

      const result = await controller.findAll();

      expect(tenantsService.findAll).toHaveBeenCalled();
      expect(result).toEqual(mockTenants);
      expect(result).toHaveLength(2);
    });

    it('deve retornar lista vazia quando não há tenants', async () => {
      tenantsService.findAll.mockResolvedValue([]);

      const result = await controller.findAll();

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('toggleActive (PUT /tenants/:id/toggle-active)', () => {
    it('deve alternar o status ativo de um tenant', async () => {
      const mockTenant = {
        id: 'tenant-1',
        name: 'Empresa A',
        slug: 'empresa-a',
        email: 'a@empresa.com',
        phone: '(11) 99999-0001',
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      tenantsService.toggleActive.mockResolvedValue(mockTenant);

      const result = await controller.toggleActive('tenant-1');

      expect(tenantsService.toggleActive).toHaveBeenCalledWith('tenant-1');
      expect(result).toEqual(mockTenant);
      expect(result.isActive).toBe(false);
    });
  });

  describe('remove (DELETE /tenants/:id)', () => {
    it('deve remover um tenant', async () => {
      tenantsService.remove.mockResolvedValue(undefined);

      await controller.remove('tenant-1');

      expect(tenantsService.remove).toHaveBeenCalledWith('tenant-1');
    });

    it('deve propagar erro quando tenant não encontrado', async () => {
      tenantsService.remove.mockRejectedValue(
        new Error('Tenant não encontrado'),
      );

      await expect(controller.remove('inexistente')).rejects.toThrow(
        'Tenant não encontrado',
      );
    });
  });

  describe('Verificação de guards nos endpoints', () => {
    it('findAll deve usar SuperAdminAuthGuard', () => {
      const guards = Reflect.getMetadata(
        '__guards__',
        TenantsController.prototype.findAll,
      );
      expect(guards).toBeDefined();
      const guardNames = guards.map((g: any) => g.name || g.constructor?.name);
      expect(guardNames).toContain('SuperAdminAuthGuard');
    });

    it('toggleActive deve usar SuperAdminAuthGuard', () => {
      const guards = Reflect.getMetadata(
        '__guards__',
        TenantsController.prototype.toggleActive,
      );
      expect(guards).toBeDefined();
      const guardNames = guards.map((g: any) => g.name || g.constructor?.name);
      expect(guardNames).toContain('SuperAdminAuthGuard');
    });

    it('remove deve usar SuperAdminAuthGuard', () => {
      const guards = Reflect.getMetadata(
        '__guards__',
        TenantsController.prototype.remove,
      );
      expect(guards).toBeDefined();
      const guardNames = guards.map((g: any) => g.name || g.constructor?.name);
      expect(guardNames).toContain('SuperAdminAuthGuard');
    });

    it('findMyTenant deve usar TenantAuthGuard (não SuperAdmin)', () => {
      const guards = Reflect.getMetadata(
        '__guards__',
        TenantsController.prototype.findMyTenant,
      );
      expect(guards).toBeDefined();
      const guardNames = guards.map((g: any) => g.name || g.constructor?.name);
      expect(guardNames).toContain('TenantAuthGuard');
      expect(guardNames).not.toContain('SuperAdminAuthGuard');
    });

    it('create deve ser @Public() (sem guard de superadmin)', () => {
      const isPublic = Reflect.getMetadata(
        'isPublic',
        TenantsController.prototype.create,
      );
      expect(isPublic).toBe(true);
    });
  });
});
