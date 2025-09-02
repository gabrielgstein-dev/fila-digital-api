import {
  IsEmail,
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
} from 'class-validator';

export enum CorporateUserRole {
  OPERADOR = 'OPERADOR',
  GERENTE = 'GERENTE',
  GESTOR = 'GESTOR',
  ADMINISTRADOR = 'ADMINISTRADOR',
}

export class CreateCorporateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  name: string;

  @IsString()
  cpf: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  googleId?: string;

  @IsEnum(CorporateUserRole)
  role: CorporateUserRole;

  @IsOptional()
  @IsString()
  tenantId?: string; // Opcional - será injetado pelo controller

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
