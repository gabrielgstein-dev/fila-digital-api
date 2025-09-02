import { PartialType } from '@nestjs/mapped-types';
import { CreateCorporateUserDto } from './create-corporate-user.dto';

export class UpdateCorporateUserDto extends PartialType(
  CreateCorporateUserDto,
) {}

