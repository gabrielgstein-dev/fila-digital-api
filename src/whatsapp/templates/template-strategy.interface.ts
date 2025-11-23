export interface TemplateContext {
  tenantName: string;
  ticketToken: string;
  position: number;
  estimatedMinutes: number;
  ticketId: string;
  baseUrl?: string;
  clientName?: string;
  queueName?: string;
}

export interface TemplateResult {
  name: string;
  language: string;
  parameters: Array<{ type: string; text: string }>;
}

export interface ITemplateStrategy {
  getName(): string;
  getLanguage(): string;
  buildParameters(
    context: TemplateContext,
  ): Array<{ type: string; text: string }>;
  buildTemplate(context: TemplateContext): TemplateResult;
}
