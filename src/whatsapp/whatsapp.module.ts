import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MetaWhatsappModule } from './providers/meta/meta.module';
import { MetaWhatsappProvider } from './providers/meta/meta.provider';
import { QueueInfoTemplateStrategy } from './templates/queue-info-template.strategy';
import { TemplateStrategyRegistry } from './templates/template-strategy.registry';
import { IWhatsAppProvider } from './whatsapp-provider.interface';
import { WhatsAppQueueService } from './whatsapp-queue.service';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppService } from './whatsapp.service';

@Module({
  imports: [ConfigModule, MetaWhatsappModule],
  providers: [
    WhatsAppService,
    WhatsAppQueueService,
    TemplateStrategyRegistry,
    QueueInfoTemplateStrategy,
    {
      provide: 'WHATSAPP_PROVIDER',
      useFactory: (metaProvider: MetaWhatsappProvider): IWhatsAppProvider => {
        return metaProvider;
      },
      inject: [MetaWhatsappProvider],
    },
    {
      provide: 'TEMPLATE_STRATEGY_REGISTRY',
      useFactory: (
        registry: TemplateStrategyRegistry,
        queueInfoStrategy: QueueInfoTemplateStrategy,
      ) => {
        registry.register(queueInfoStrategy);
        return registry;
      },
      inject: [TemplateStrategyRegistry, QueueInfoTemplateStrategy],
    },
  ],
  controllers: [WhatsAppController],
  exports: [WhatsAppService, WhatsAppQueueService],
})
export class WhatsAppModule {}
