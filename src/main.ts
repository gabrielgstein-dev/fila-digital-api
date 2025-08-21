import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  console.log('🚀 [STEP 1] Iniciando aplicação...');
  console.log('📊 [STEP 1] Variáveis de ambiente:');
  console.log('  NODE_ENV:', process.env.NODE_ENV || 'undefined');
  console.log('  PORT:', process.env.PORT || 'undefined');
  console.log('  DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
  console.log('  JWT_SECRET:', process.env.JWT_SECRET ? 'SET' : 'NOT SET');
  console.log('  RABBITMQ_URL:', process.env.RABBITMQ_URL ? 'SET' : 'NOT SET');

  console.log('🏗️ [STEP 2] Criando aplicação NestJS...');
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });
  console.log('✅ [STEP 2] Aplicação NestJS criada com sucesso!');

  console.log('⚙️ [STEP 3] Obtendo ConfigService...');
  const configService = app.get(ConfigService);
  console.log('✅ [STEP 3] ConfigService obtido!');

  console.log('🛡️ [STEP 4] Configurando helmet...');
  app.use(
    helmet({
      contentSecurityPolicy: false,
      hsts: configService.get('NODE_ENV') === 'production',
      xssFilter: false,
      noSniff: true,
      frameguard: { action: 'deny' },
      hidePoweredBy: true,
    }),
  );
  console.log('✅ [STEP 4] Helmet configurado!');

  console.log('🌐 [STEP 5] Configurando CORS...');
  app.enableCors({
    origin: configService.get('CORS_ORIGIN') || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
    maxAge: 86400,
  });
  console.log('✅ [STEP 5] CORS configurado!');

  console.log('🔧 [STEP 6] Configurando pipes globais...');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      disableErrorMessages: configService.get('NODE_ENV') === 'production',
      validateCustomDecorators: true,
    }),
  );
  console.log('✅ [STEP 6] Pipes configurados!');

  console.log('🏷️ [STEP 7] Configurando prefixo global...');
  app.setGlobalPrefix('api/v1');
  console.log('✅ [STEP 7] Prefixo configurado!');

  console.log('📚 [STEP 8] Configurando Swagger...');
  const config = new DocumentBuilder()
    .setTitle('Fila Digital API')
    .setDescription('API para sistema de fila digital')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  console.log('✅ [STEP 8] Swagger configurado!');

  const port = process.env.PORT || 8080;
  console.log(`🚀 [STEP 9] Tentando iniciar servidor na porta: ${port}`);
  console.log(`🚀 [STEP 9] Fazendo bind em 0.0.0.0:${port}...`);

  await app.listen(port, '0.0.0.0');

  console.log('🎉 [SUCCESS] Servidor iniciado com sucesso!');
  console.log(`🌍 [SUCCESS] API rodando em http://0.0.0.0:${port}`);
  console.log(
    `📖 [SUCCESS] Documentação disponível em http://0.0.0.0:${port}/api`,
  );
  console.log(
    `❤️ [SUCCESS] Health check em http://0.0.0.0:${port}/api/v1/health`,
  );
}

bootstrap().catch((error) => {
  console.error('💥 [FATAL] Erro fatal ao inicializar aplicação!');
  console.error('💥 [FATAL] Tipo do erro:', typeof error);
  console.error('💥 [FATAL] Erro:', error);
  console.error('💥 [FATAL] Message:', error?.message);
  console.error('💥 [FATAL] Stack:', error?.stack);
  process.exit(1);
});
