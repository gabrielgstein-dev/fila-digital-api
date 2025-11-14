import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { ExpressAdapter } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import * as express from 'express';
import { type RequestHandler } from 'express';
import { Readable } from 'node:stream';

// === IMPORTANTE: seu router do Igniter ===
import { AppRouter } from './rt/igniter.router';
import { TicketRealtimeOptimizedController } from './rt/ticket-realtime-optimized.controller';

/**
 * Adaptador mínimo para Express:
 * - Constrói um Web Request com headers e body do req Express
 * - Invoca AppRouter.handler(Request)
 * - Transmite o corpo da resposta (inclui SSE)
 */
function createIgniterExpressAdapter(
  handler: (req: Request) => Promise<Response>,
): RequestHandler {
  return async (req, res) => {
    try {
      const origin = `${req.protocol}://${req.get('host')}`;
      const url = origin + req.originalUrl;

      // Copia headers do Express para Headers Web
      const headers = new Headers();
      for (const [k, v] of Object.entries(req.headers)) {
        if (Array.isArray(v)) {
          v.forEach((val) => headers.append(k, val));
        } else if (v != null) {
          headers.set(k, String(v));
        }
      }

      // Para métodos com corpo, passamos o stream do req
      const hasBody = !['GET', 'HEAD'].includes(req.method);
      const webReq = new Request(url, {
        method: req.method,
        headers,
        body: hasBody ? (req as any) : undefined,
        // Node 18+ requer duplex quando body é Readable
        ...(hasBody ? { duplex: 'half' as any } : {}),
      });

      const webRes = await handler(webReq);

      // Status e headers
      res.status(webRes.status);
      webRes.headers.forEach((value, key) => res.setHeader(key, value));

      // Corpo (inclui SSE)
      if (webRes.body) {
        // Converte WHATWG ReadableStream -> Node Readable e faz pipe
        const nodeReadable = Readable.fromWeb(webRes.body as any);
        // Para SSE é bom flush imediato dos headers
        if (
          (webRes.headers.get('content-type') || '').includes(
            'text/event-stream',
          )
        ) {
          (res as any).flushHeaders?.();
        }
        nodeReadable.pipe(res);
      } else {
        // Sem body: envia buffer (casos raros)
        const buf = Buffer.from(await webRes.arrayBuffer());
        res.send(buf);
      }
    } catch (err) {
      // Fallback de erro
      console.error('[IgniterAdapter] error:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  };
}

async function bootstrap() {
  console.log('🚀 [STEP 1] Iniciando aplicação...');
  console.log('📊 [STEP 1] Variáveis de ambiente:');
  console.log('  NODE_ENV:', process.env.NODE_ENV || 'undefined');
  console.log('  PORT:', process.env.PORT || 'undefined');
  console.log('  DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
  console.log('  JWT_SECRET:', process.env.JWT_SECRET ? 'SET' : 'NOT SET');
  console.log('  RABBITMQ_URL:', process.env.RABBITMQ_URL ? 'SET' : 'NOT SET');

  console.log('🏗️ [STEP 2] Criando aplicação NestJS...');
  const server = express();
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));
  console.log('✅ [STEP 2] Aplicação NestJS criada com sucesso!');

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
  const packageJson = require('../package.json');
  const version = packageJson.version;
  const buildTime = new Date().toISOString();

  const config = new DocumentBuilder()
    .setTitle('Fila Digital API')
    .setDescription(
      `API para sistema de fila digital\n\n**Versão:** ${version}\n**Ambiente:** ${nodeEnv}\n**Build:** ${buildTime}`,
    )
    .setVersion(version)
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  console.log('✅ [STEP 8] Swagger configurado!');

  // === AQUI: monte o Igniter sob /api/rt ===
  console.log('⚡ [IGNITER] Configurando TicketController...');
  const ticketController = app.get(TicketRealtimeOptimizedController);
  AppRouter.setTicketController(ticketController);
  console.log('✅ [IGNITER] TicketController configurado!');

  const igniterHandler = createIgniterExpressAdapter(AppRouter.handler);
  // Monte DEPOIS de configurar helmet/CORS para herdar os middlewares
  app.getHttpAdapter().getInstance().use('/api/rt', igniterHandler);
  console.log('⚡ [IGNITER] Montado em /api/rt');

  const port = process.env.PORT || 8080;
  console.log(`🚀 [STEP 9] Tentando iniciar servidor na porta: ${port}`);
  console.log(`🚀 [STEP 9] Fazendo bind em 0.0.0.0:${port}...`);

  await app.init();
  await app.listen(port, '0.0.0.0');

  console.log('🎉 [SUCCESS] Servidor iniciado com sucesso!');
  console.log(`🌍 [SUCCESS] API Nest em http://0.0.0.0:${port}/api/v1`);
  console.log(`📖 [SUCCESS] Swagger em http://0.0.0.0:${port}/api`);
  console.log(`⚡ [SUCCESS] Igniter em http://0.0.0.0:${port}/api/rt`);
  console.log(`❤️ [SUCCESS] Health em http://0.0.0.0:${port}/api/v1/health`);
}

bootstrap().catch((error) => {
  console.error('💥 [FATAL] Erro fatal ao inicializar aplicação!');
  console.error('💥 [FATAL] Tipo do erro:', typeof error);
  console.error('💥 [FATAL] Erro:', error);
  console.error('💥 [FATAL] Message:', error?.message);
  console.error('💥 [FATAL] Stack:', error?.stack);
  process.exit(1);
});
