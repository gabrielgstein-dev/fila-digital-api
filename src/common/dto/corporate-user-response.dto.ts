import { CorporateUserRole } from './create-corporate-user.dto';

export class CorporateUserResponseDto {
  id: string;
  email: string;
  name: string;
  cpf: string;
  role: CorporateUserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  tenantId: string;
  phone?: string;
  department?: string;
  position?: string;
  isDefault: boolean;
  isProtected: boolean;
  tenant?: {
    id: string;
    name: string;
    slug: string;
  };
}

