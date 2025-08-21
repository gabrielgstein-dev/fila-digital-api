import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  console.log('🚀 Iniciando aplicação...');
  console.log('📊 Variáveis de ambiente:');
  console.log('  NODE_ENV:', process.env.NODE_ENV);
  console.log('  PORT:', process.env.PORT);
  console.log('  DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');

  const app = await NestFactory.create(AppModule);
  console.log('✅ Aplicação NestJS criada');

  const configService = app.get(ConfigService);

  app.use(
    helmet({
      contentSecurityPolicy: false, // Desabilitar CSP para não interferir nos testes
      hsts: configService.get('NODE_ENV') === 'production',
      xssFilter: false, // Versões modernas do helmet desabilitam por padrão
      noSniff: true,
      frameguard: { action: 'deny' },
      hidePoweredBy: true, // Força remoção do x-powered-by
    }),
  );

  app.enableCors({
    origin: configService.get('CORS_ORIGIN') || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false, // Não permitir cookies por segurança
    maxAge: 86400, // Cache preflight por 24h
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      disableErrorMessages: configService.get('NODE_ENV') === 'production',
      validateCustomDecorators: true,
    }),
  );

  app.setGlobalPrefix('api/v1');

  const config = new DocumentBuilder()
    .setTitle('Fila Digital API')
    .setDescription('API para sistema de fila digital')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = configService.get('PORT') || 3001;
  console.log(`🔧 Configurando para escutar na porta: ${port}`);

  await app.listen(port, '0.0.0.0');
  console.log(`✅ Servidor iniciado com sucesso!`);
  console.log(`🚀 API rodando em http://localhost:${port}`);
  console.log(`📚 Documentação disponível em http://localhost:${port}/api`);
}

bootstrap().catch((error) => {
  console.error('❌ Erro fatal ao inicializar aplicação:', error);
  process.exit(1);
});
