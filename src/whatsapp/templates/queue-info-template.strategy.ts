import { Injectable, Logger } from '@nestjs/common';
import {
  ITemplateStrategy,
  TemplateContext,
  TemplateResult,
} from './template-strategy.interface';

@Injectable()
export class QueueInfoTemplateStrategy implements ITemplateStrategy {
  private readonly logger = new Logger(QueueInfoTemplateStrategy.name);
  getName(): string {
    return 'queue_info';
  }

  getLanguage(): string {
    return 'en';
  }

  buildParameters(
    context: TemplateContext,
  ): Array<{ type: string; text: string }> {
    this.logger.debug(
      `[QueueInfoTemplateStrategy] Construindo parâmetros para context: ${JSON.stringify(context, null, 2)}`,
    );

    const peopleAhead = Math.max(0, context.position - 1);
    const waitingTime =
      context.estimatedMinutes === 1
        ? '1 minuto'
        : `${context.estimatedMinutes} minutos`;
    const queueDisplayName = context.queueName || 'de atendimento';

    this.logger.debug(
      `[QueueInfoTemplateStrategy] Parâmetros calculados: peopleAhead=${peopleAhead}, waitingTime=${waitingTime}, queueDisplayName=${queueDisplayName}`,
    );

    const parameters = [
      {
        type: 'text',
        text: queueDisplayName,
      },
      {
        type: 'text',
        text: context.ticketToken,
      },
      {
        type: 'text',
        text: waitingTime,
      },
      {
        type: 'text',
        text: peopleAhead.toString(),
      },
    ];

    this.logger.debug(
      `[QueueInfoTemplateStrategy] Parâmetros construídos: ${JSON.stringify(parameters, null, 2)}`,
    );

    return parameters;
  }

  buildTemplate(context: TemplateContext): TemplateResult {
    this.logger.debug(
      `[QueueInfoTemplateStrategy] Construindo template completo`,
    );

    const parameters = this.buildParameters(context);
    const template = {
      name: this.getName(),
      language: this.getLanguage(),
      parameters,
    };

    this.logger.debug(
      `[QueueInfoTemplateStrategy] Template completo: ${JSON.stringify(template, null, 2)}`,
    );

    return template;
  }
}
