import { Injectable } from '@nestjs/common';
import { Tenant } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
    TenantInactiveException,
    TenantNotFoundException,
} from '../exceptions/business.exceptions';

@Injectable()
export abstract class BaseValidationService {
  constructor(protected prisma: PrismaService) {}

  protected async validateTenant(tenantId: string): Promise<Tenant> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new TenantNotFoundException();
    }

    return tenant;
  }

  protected validateTenantActive(tenant: Tenant): void {
    if (!tenant.isActive) {
      throw new TenantInactiveException();
    }
  }

  protected async validateAndGetActiveTenant(tenantId: string): Promise<Tenant> {
    const tenant = await this.validateTenant(tenantId);
    this.validateTenantActive(tenant);
    return tenant;
  }
}
