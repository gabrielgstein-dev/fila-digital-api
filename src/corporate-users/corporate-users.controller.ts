import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { CorporateUsersService } from './corporate-users.service';
import { CreateCorporateUserDto } from '../common/dto/create-corporate-user.dto';
import { UpdateCorporateUserDto } from '../common/dto/update-corporate-user.dto';
import { TenantAuthGuard } from '../auth/guards/tenant-auth.guard';
import { RequireTenant } from '../auth/decorators/require-tenant.decorator';
import { CurrentCorporateUser } from '../auth/decorators/current-corporate-user.decorator';

@Controller('tenants/:tenantId/corporate-users')
@UseGuards(TenantAuthGuard)
@RequireTenant()
export class CorporateUsersController {
  constructor(private readonly corporateUsersService: CorporateUsersService) {}

  @Post()
  async create(
    @Param('tenantId') tenantId: string,
    @Body() createCorporateUserDto: CreateCorporateUserDto,
    @CurrentCorporateUser('id') currentUserId: string,
  ) {
    // Garantir que o tenantId da URL seja usado
    const dataWithTenantId = {
      ...createCorporateUserDto,
      tenantId, // Sempre usar o tenantId da URL
    };

    return this.corporateUsersService.create(
      dataWithTenantId,
      currentUserId,
    );
  }

  @Get()
  async findAll(
    @Param('tenantId') tenantId: string,
    @CurrentCorporateUser('id') currentUserId: string,
  ) {
    return this.corporateUsersService.findAll(tenantId, currentUserId);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentCorporateUser('id') currentUserId: string,
  ) {
    return this.corporateUsersService.findOne(id, currentUserId);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateCorporateUserDto: UpdateCorporateUserDto,
    @CurrentCorporateUser('id') currentUserId: string,
  ) {
    return this.corporateUsersService.update(
      id,
      updateCorporateUserDto,
      currentUserId,
    );
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentCorporateUser('id') currentUserId: string,
  ) {
    return this.corporateUsersService.remove(id, currentUserId);
  }

  @Patch(':id/toggle-active')
  async toggleActive(
    @Param('id') id: string,
    @CurrentCorporateUser('id') currentUserId: string,
  ) {
    return this.corporateUsersService.toggleActive(id, currentUserId);
  }

  @Patch(':id/permissions')
  async assignPermission(
    @Param('id') id: string,
    @Body()
    permissionData: {
      resource: string;
      action: string;
      granted: boolean;
    },
    @CurrentCorporateUser('id') currentUserId: string,
  ) {
    return this.corporateUsersService.assignPermission(
      id,
      permissionData.resource,
      permissionData.action,
      permissionData.granted,
      currentUserId,
    );
  }

  @Get(':id/permissions/:resource/:action')
  async checkPermission(
    @Param('id') id: string,
    @Param('resource') resource: string,
    @Param('action') action: string,
  ) {
    const hasPermission = await this.corporateUsersService.checkPermission(
      id,
      resource,
      action,
    );
    return { hasPermission };
  }
}
