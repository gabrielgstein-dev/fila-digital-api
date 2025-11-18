import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EvolutionProvider } from './evolution.provider';

@Module({
  imports: [ConfigModule],
  providers: [EvolutionProvider],
  exports: [EvolutionProvider],
})
export class EvolutionModule {}
