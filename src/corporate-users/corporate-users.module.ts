import { Module } from '@nestjs/common';
import { CorporateUsersService } from './corporate-users.service';
import { CorporateUsersController } from './corporate-users.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CorporateUsersController],
  providers: [CorporateUsersService],
  exports: [CorporateUsersService],
})
export class CorporateUsersModule {}

