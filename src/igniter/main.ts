import { AppRouter } from './igniter.router';
import { createIgniterAppContext } from './igniter.context';
import { createServer } from 'http';

async function bootstrap() {
  console.log('🚀 [STEP 1] Iniciando aplicação Igniter.js...');
  console.log('📊 [STEP 1] Variáveis de ambiente:');
  console.log('  NODE_ENV:', process.env.NODE_ENV || 'undefined');
  console.log('  PORT:', process.env.PORT || 'undefined');
  console.log('  DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
  console.log('  JWT_SECRET:', process.env.JWT_SECRET ? 'SET' : 'NOT SET');
  console.log('  RABBITMQ_URL:', process.env.RABBITMQ_URL ? 'SET' : 'NOT SET');

  console.log('🏗️ [STEP 2] Criando aplicação Igniter.js...');

  const port = process.env.PORT || 8080;
  console.log(`🚀 [STEP 3] Tentando iniciar servidor na porta: ${port}`);
  console.log(`🚀 [STEP 3] Fazendo bind em 0.0.0.0:${port}...`);

  // Criação do servidor HTTP usando o AppRouter
  createServer(async (req, res) => {
    try {
      // Capturar o corpo da requisição se existir
      let body: string | undefined;
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          chunks.push(chunk);
        }
        body = Buffer.concat(chunks).toString();
      }

      const request = new Request(`http://${req.headers.host}${req.url}`, {
        method: req.method,
        headers: req.headers as any,
        body: body,
      });

      const response = await AppRouter.handler(request);

      res.statusCode = response.status;
      for (const [key, value] of response.headers.entries()) {
        res.setHeader(key, value);
      }
      res.end(await response.text());
    } catch (error) {
      console.error('❌ [ERROR] Erro ao processar requisição:', error);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  }).listen(Number(port), '0.0.0.0', () => {
    console.log('🎉 [SUCCESS] Servidor Igniter.js iniciado com sucesso!');
    console.log(`🌍 [SUCCESS] API rodando em http://0.0.0.0:${port}`);
    console.log(
      `❤️ [SUCCESS] Health check em http://0.0.0.0:${port}/api/v1/health`,
    );
  });
}

bootstrap().catch((error) => {
  console.error('❌ [ERROR] Erro ao iniciar servidor:', error);
  process.exit(1);
});
