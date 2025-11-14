import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdminUserResponseDto {
  @ApiProperty({ description: 'ID do usuário administrador' })
  id: string;

  @ApiProperty({ description: 'Email do administrador' })
  email: string;

  @ApiProperty({ description: 'Nome do administrador' })
  name: string;

  @ApiProperty({ description: 'Role do administrador' })
  role: string;
}

export class TenantResponseDto {
  @ApiProperty({ description: 'ID único do tenant' })
  id: string;

  @ApiProperty({ description: 'Nome da empresa' })
  name: string;

  @ApiProperty({ description: 'Slug único da empresa' })
  slug: string;

  @ApiPropertyOptional({ description: 'Email da empresa' })
  email?: string;

  @ApiPropertyOptional({ description: 'Telefone da empresa' })
  phone?: string;

  @ApiProperty({ description: 'Status ativo do tenant' })
  isActive: boolean;

  @ApiProperty({ description: 'Data de criação' })
  createdAt: Date;

  @ApiProperty({ description: 'Data da última atualização' })
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'Dados do administrador criado (apenas na criação)',
    type: AdminUserResponseDto,
  })
  adminUser?: AdminUserResponseDto;

  @ApiPropertyOptional({
    description: 'Senha temporária gerada (apenas se não foi informada senha)',
    example: 'K7m@xP9#vL2q',
  })
  temporaryPassword?: string;
}
