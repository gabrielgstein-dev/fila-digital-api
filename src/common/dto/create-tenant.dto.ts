import {
  IsString,
  IsEmail,
  IsOptional,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTenantDto {
  @ApiProperty({ description: 'Nome da empresa' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: 'Slug único da empresa' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  slug: string;

  @ApiPropertyOptional({ description: 'Email da empresa' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Telefone da empresa' })
  @IsOptional()
  @IsString()
  phone?: string;
}
