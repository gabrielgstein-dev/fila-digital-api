import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';

describe('Debug Simple Test', () => {
  let app: TestingModule;

  beforeAll(async () => {
    console.log('🔍 [DEBUG] Iniciando teste simples...');
    try {
      app = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      console.log('✅ [DEBUG] Módulos compilados com sucesso!');
    } catch (error) {
      console.error('❌ [DEBUG] Erro ao compilar módulos:', error);
      throw error;
    }
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('deve compilar módulos sem erro', () => {
    expect(app).toBeDefined();
  });

  it('deve obter instância do app', () => {
    const application = app.createNestApplication();
    expect(application).toBeDefined();
  });
});
