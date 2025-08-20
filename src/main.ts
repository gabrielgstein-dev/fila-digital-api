import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
  await app.listen(port);

  console.log(`🚀 API rodando em http://localhost:${port}`);
  console.log(`📚 Documentação disponível em http://localhost:${port}/api`);
}

bootstrap();
