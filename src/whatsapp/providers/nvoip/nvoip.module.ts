import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NvoipProvider } from './nvoip.provider';

@Module({
  imports: [ConfigModule],
  providers: [NvoipProvider],
  exports: [NvoipProvider],
})
export class NvoipModule {}
