import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MetaWhatsappProvider } from './meta.provider';

@Module({
  imports: [ConfigModule, HttpModule],
  providers: [MetaWhatsappProvider],
  exports: [MetaWhatsappProvider],
})
export class MetaWhatsappModule {}
