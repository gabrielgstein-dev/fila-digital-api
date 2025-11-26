import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import express from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  console.log('🚀 [STEP 1] Iniciando aplicação...');
  console.log('📊 [STEP 1] Variáveis de ambiente:');
  console.log('  NODE_ENV:', process.env.NODE_ENV || 'undefined');
  console.log('  PORT:', process.env.PORT || 'undefined');
  console.log('  DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
  console.log('  JWT_SECRET:', process.env.JWT_SECRET ? 'SET' : 'NOT SET');

  console.log('🏗️ [STEP 2] Criando aplicação NestJS...');
  const server = express();

  let app;
  try {
    app = await NestFactory.create(AppModule, new ExpressAdapter(server), {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });
    console.log('✅ [STEP 2] Aplicação NestJS criada com sucesso!');
  } catch (error) {
    console.error('💥 [FATAL] Erro ao criar aplicação NestJS:', error);
    throw error;
  }

  console.log('⚙️ [STEP 3] Obtendo ConfigService...');
  const configService = app.get(ConfigService);
  console.log('✅ [STEP 3] ConfigService obtido!');

  console.log('🛡️ [STEP 4] Configurando helmet...');
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      hsts: configService.get('NODE_ENV') === 'production',
      noSniff: true,
      frameguard: { action: 'deny' },
      hidePoweredBy: true,
    }),
  );
  console.log('✅ [STEP 4] Helmet configurado!');

  console.log('🌐 [STEP 5] Configurando CORS...');
  const nodeEnv = configService.get('NODE_ENV') || 'development';
  let corsOrigins: string[] | boolean;

  if (nodeEnv === 'production') {
    const productionOrigins = configService.get('CORS_ORIGIN') || '';
    corsOrigins = productionOrigins
      ? productionOrigins.split(',').map((o) => o.trim())
      : [
          'https://fila-digital.com',
          'https://www.fila-digital.com',
          'https://app.fila-digital.com',
        ];
    if (Array.isArray(corsOrigins)) {
      corsOrigins = corsOrigins.filter(
        (origin) =>
          origin.startsWith('https://') &&
          !origin.includes('localhost') &&
          !origin.includes('127.0.0.1'),
      );
    }
    console.log('🌐 [STEP 5] PRODUÇÃO: Origens CORS seguras:', corsOrigins);
  } else {
    corsOrigins = true;
    console.log(
      '🌐 [STEP 5] DESENVOLVIMENTO LOCAL: CORS liberado para TODAS as origens',
    );
  }

  app.enableCors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
    ],
    credentials: false, // troque para true se for usar cookies/sessão
    maxAge: nodeEnv === 'production' ? 86400 : 3600,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });
  console.log('✅ [STEP 5] CORS configurado para', nodeEnv);

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

  // Recomendados em prod
  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  app.enableShutdownHooks();

  console.log('📚 [STEP 8] Configurando Swagger...');

  // Lê o package.json a partir do diretório de trabalho (/app no Docker)
  let appVersion = 'dev';

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path');
    const pkg = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'),
    );
    appVersion = pkg.version ?? 'dev';
  } catch {
    // Em produção, se der ruim, só loga e segue com uma versão default
    console.warn('Não foi possível carregar package.json, usando versão "dev"');
    appVersion = 'dev';
  }

  const buildTime = new Date().toISOString();

  const config = new DocumentBuilder()
    .setTitle('Fila Digital API')
    .setDescription(
      `API para sistema de fila digital\n\n**Versão:** ${appVersion}\n**Ambiente:** ${nodeEnv}\n**Build:** ${buildTime}`,
    )
    .setVersion(appVersion)
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  console.log('✅ [STEP 8] Swagger configurado!');

  const port = process.env.PORT ? Number(process.env.PORT) : 3001;
  console.log(`🚀 [STEP 9] Tentando iniciar servidor na porta: ${port}`);
  console.log(`🚀 [STEP 9] Fazendo bind em 0.0.0.0:${port}...`);

  try {
    console.log('🔄 [STEP 9.1] Inicializando módulos da aplicação...');
    await app.init();
    console.log('✅ [STEP 9.1] Módulos inicializados!');

    console.log('🔄 [STEP 9.2] Iniciando servidor HTTP...');
    await app.listen(port, '0.0.0.0');
    console.log('✅ [STEP 9.2] Servidor HTTP iniciado!');
  } catch (error) {
    console.error('💥 [FATAL] Erro ao iniciar servidor:', error);
    console.error('💥 [FATAL] Tipo:', typeof error);
    console.error('💥 [FATAL] Message:', error?.message);
    console.error('💥 [FATAL] Stack:', error?.stack);
    throw error;
  }

  console.log('🎉 [SUCCESS] Servidor iniciado com sucesso!');
  console.log(`🌍 [SUCCESS] API Nest em http://0.0.0.0:${port}/api/v1`);
  console.log(`📖 [SUCCESS] Swagger em http://0.0.0.0:${port}/api`);
  console.log(`❤️ [SUCCESS] Health em http://0.0.0.0:${port}/api/v1/health`);

  app.enableShutdownHooks();

  const gracefulShutdown = async (signal: string) => {
    console.log(
      `\n🛑 [SHUTDOWN] Recebido sinal ${signal}, iniciando shutdown graceful...`,
    );
    try {
      await app.close();
      console.log('✅ [SHUTDOWN] Aplicação encerrada com sucesso');
      process.exit(0);
    } catch (error) {
      console.error('❌ [SHUTDOWN] Erro durante shutdown:', error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  return app;
}

bootstrap().catch((error) => {
  console.error('💥 [FATAL] Erro fatal ao inicializar aplicação!');
  console.error('💥 [FATAL] Tipo do erro:', typeof error);
  console.error('💥 [FATAL] Erro:', error);
  console.error('💥 [FATAL] Message:', error?.message);
  console.error('💥 [FATAL] Stack:', error?.stack);
  process.exit(1);
});
