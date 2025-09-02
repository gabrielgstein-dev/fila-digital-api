import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
}

