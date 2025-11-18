import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ZApiProvider } from './zapi.provider';

@Module({
  imports: [ConfigModule],
  providers: [ZApiProvider],
  exports: [ZApiProvider],
})
export class ZApiModule {}
