import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CorporateUserRole } from './create-corporate-user.dto';

export class CorporateUserResponseDto {
  @ApiProperty({ description: 'ID único do usuário corporativo' })
  id: string;

  @ApiProperty({ description: 'Email do usuário corporativo' })
  email: string;

  @ApiProperty({ description: 'Nome completo do usuário' })
  name: string;

  @ApiProperty({ description: 'CPF do usuário' })
  cpf: string;

  @ApiProperty({
    description: 'Papel do usuário no sistema',
    enum: CorporateUserRole,
  })
  role: CorporateUserRole;

  @ApiProperty({ description: 'Status ativo do usuário' })
  isActive: boolean;

  @ApiProperty({ description: 'Data de criação' })
  createdAt: Date;

  @ApiProperty({ description: 'Data da última atualização' })
  updatedAt: Date;

  @ApiProperty({ description: 'ID do tenant ao qual o usuário pertence' })
  tenantId: string;

  @ApiPropertyOptional({ description: 'Telefone do usuário' })
  phone?: string;

  @ApiPropertyOptional({ description: 'Departamento do usuário' })
  department?: string;

  @ApiPropertyOptional({ description: 'Cargo do usuário' })
  position?: string;

  @ApiProperty({ description: 'Indica se é o usuário padrão do tenant' })
  isDefault: boolean;

  @ApiProperty({
    description: 'Indica se o usuário está protegido contra exclusão',
  })
  isProtected: boolean;

  @ApiPropertyOptional({
    description: 'Dados básicos do tenant',
    type: 'object',
    properties: {
      id: { type: 'string', description: 'ID do tenant' },
      name: { type: 'string', description: 'Nome do tenant' },
      slug: { type: 'string', description: 'Slug do tenant' },
    },
  })
  tenant?: {
    id: string;
    name: string;
    slug: string;
  };
}
