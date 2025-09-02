import { TestHelper } from './test-setup';

export default async function globalTeardown(): Promise<void> {
  console.log('🧹 Limpeza global concluída');
}
