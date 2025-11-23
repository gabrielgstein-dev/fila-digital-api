import { Injectable, Logger } from '@nestjs/common';
import { ITemplateStrategy } from './template-strategy.interface';

@Injectable()
export class TemplateStrategyRegistry {
  private readonly logger = new Logger(TemplateStrategyRegistry.name);
  private readonly strategies = new Map<string, ITemplateStrategy>();

  register(strategy: ITemplateStrategy): void {
    const name = strategy.getName();
    this.strategies.set(name, strategy);
    this.logger.debug(`Template strategy registered: ${name}`);
  }

  get(name: string): ITemplateStrategy | undefined {
    this.logger.debug(
      `[TemplateStrategyRegistry] Buscando strategy: '${name}'`,
    );
    this.logger.debug(
      `[TemplateStrategyRegistry] Strategies registradas: ${Array.from(this.strategies.keys()).join(', ')}`,
    );
    const strategy = this.strategies.get(name);
    if (strategy) {
      this.logger.debug(
        `[TemplateStrategyRegistry] Strategy '${name}' encontrada: ${strategy.constructor.name}`,
      );
    } else {
      this.logger.warn(
        `[TemplateStrategyRegistry] Strategy '${name}' NÃO encontrada`,
      );
    }
    return strategy;
  }

  has(name: string): boolean {
    return this.strategies.has(name);
  }

  getAll(): ITemplateStrategy[] {
    return Array.from(this.strategies.values());
  }
}
