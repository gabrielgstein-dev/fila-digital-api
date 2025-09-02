import { ConfigModule } from '@nestjs/config';

beforeAll(async () => {
  // Configuração mínima para testes unitários
  ConfigModule.forRoot({
    envFilePath: '.env.test',
    isGlobal: true,
  });
});

afterAll(async () => {
  // Cleanup se necessário
});

beforeEach(async () => {
  // Reset de mocks se necessário
});

afterEach(async () => {
  // Cleanup após cada teste
});
