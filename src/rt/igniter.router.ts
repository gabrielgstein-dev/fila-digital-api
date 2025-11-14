import { TicketRealtimeOptimizedController } from './ticket-realtime-optimized.controller';

export class AppRouter {
  private static ticketController: TicketRealtimeOptimizedController | null =
    null;

  static setTicketController(controller: TicketRealtimeOptimizedController) {
    this.ticketController = controller;
  }

  static async handler(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const { pathname, searchParams } = url;
    console.log('🔍 [IGNITER] Rota solicitada:', pathname);
    console.log('🔍 [IGNITER] Método:', req.method);
    console.log('🔍 [IGNITER] Parâmetros:');
    console.log('🔍 [IGNITER] Body:', req.body);
    console.log('🔍 [IGNITER] Headers:', req.headers);
    console.log('🔍 [IGNITER] URL:', req.url);
    console.log('🔍 [IGNITER] Pathname:', pathname);

    // Health
    if (req.method === 'GET' && pathname === '/api/rt/health') {
      return new Response(JSON.stringify({ ok: true, ts: Date.now() }), {
        headers: { 'content-type': 'application/json' },
      });
    }

    // Echo (POST) — lê body como texto ou JSON
    if (req.method === 'POST' && pathname === '/api/rt/echo') {
      const ct = req.headers.get('content-type') ?? '';
      let payload: unknown = null;
      if (ct.includes('application/json')) {
        payload = await req.json().catch(() => null);
      } else {
        payload = await req.text().catch(() => null);
      }
      return new Response(JSON.stringify({ received: payload }), {
        headers: { 'content-type': 'application/json' },
      });
    }

    // SSE: /api/rt/stream?topic=foo
    if (req.method === 'GET' && pathname === '/api/rt/stream') {
      const topic = searchParams.get('topic') ?? 'default';

      // Cria ReadableStream web nativa
      const stream = new ReadableStream({
        start(controller) {
          const send = (data: string) =>
            controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));

          send(JSON.stringify({ event: 'open', topic }));

          const interval = setInterval(() => {
            send(JSON.stringify({ event: 'tick', ts: Date.now() }));
          }, 10000);

          // Heartbeat a cada 15s (evita proxy fechar)
          const heartbeat = setInterval(() => {
            controller.enqueue(new TextEncoder().encode(': keep-alive\n\n'));
          }, 15000);

          // Cancel cleanup
          (controller as any)._cleanup = () => {
            clearInterval(interval);
            clearInterval(heartbeat);
          };
        },
        cancel() {
          const c: any = this as any;
          c._cleanup?.();
        },
      });

      return new Response(stream, {
        headers: {
          'content-type': 'text/event-stream; charset=utf-8',
          'cache-control': 'no-cache, no-transform',
          connection: 'keep-alive',
          'x-accel-buffering': 'no', // NGINX
        },
      });
    }

    // ==================== ROTAS OTIMIZADAS COM POSTGRES NOTIFY ====================

    // Stream de Tickets - Monitoramento via PostgreSQL NOTIFY
    if (req.method === 'GET' && pathname === '/api/rt/tickets/stream') {
      console.log('🔍 [IGNITER] Stream de Tickets solicitado:', pathname);
      console.log('🔍 [IGNITER] TicketController:', AppRouter.ticketController);
      try {
        if (!AppRouter.ticketController) {
          console.log(
            '🔍 [IGNITER] TicketController não disponível:',
            pathname,
          );
          return new Response(
            JSON.stringify({
              error: 'Serviço não disponível',
              message: 'TicketController não foi inicializado',
            }),
            {
              status: 503,
              headers: { 'content-type': 'application/json' },
            },
          );
        }
        return await AppRouter.ticketController.streamTickets(req);
      } catch (error) {
        return new Response(
          JSON.stringify({
            error: 'Erro interno do servidor',
            message:
              error instanceof Error ? error.message : 'Erro desconhecido',
          }),
          {
            status: 500,
            headers: { 'content-type': 'application/json' },
          },
        );
      }
    }

    // Stream de Ticket Específico - Monitorar um ticket específico via NOTIFY
    if (
      req.method === 'GET' &&
      pathname.startsWith('/api/rt/tickets/') &&
      pathname.endsWith('/stream')
    ) {
      try {
        if (!AppRouter.ticketController) {
          return new Response(
            JSON.stringify({
              error: 'Serviço não disponível',
              message: 'TicketController não foi inicializado',
            }),
            {
              status: 503,
              headers: { 'content-type': 'application/json' },
            },
          );
        }
        return await AppRouter.ticketController.streamSpecificTicket(req);
      } catch (error) {
        return new Response(
          JSON.stringify({
            error: 'Erro interno do servidor',
            message:
              error instanceof Error ? error.message : 'Erro desconhecido',
          }),
          {
            status: 500,
            headers: { 'content-type': 'application/json' },
          },
        );
      }
    }

    // Buscar Ticket Específico - GET apenas o ticket (sem stream)
    if (
      req.method === 'GET' &&
      pathname.startsWith('/api/rt/tickets/') &&
      !pathname.endsWith('/stream')
    ) {
      try {
        if (!AppRouter.ticketController) {
          return new Response(
            JSON.stringify({
              error: 'Serviço não disponível',
              message: 'TicketController não foi inicializado',
            }),
            {
              status: 503,
              headers: { 'content-type': 'application/json' },
            },
          );
        }
        return await AppRouter.ticketController.getTicket(req);
      } catch (error) {
        return new Response(
          JSON.stringify({
            error: 'Erro interno do servidor',
            message:
              error instanceof Error ? error.message : 'Erro desconhecido',
          }),
          {
            status: 500,
            headers: { 'content-type': 'application/json' },
          },
        );
      }
    }

    // Buscar Tickets de uma Fila - GET tickets de uma fila específica
    if (req.method === 'GET' && pathname.startsWith('/api/rt/tickets/queue/')) {
      try {
        if (!AppRouter.ticketController) {
          return new Response(
            JSON.stringify({
              error: 'Serviço não disponível',
              message: 'TicketController não foi inicializado',
            }),
            {
              status: 503,
              headers: { 'content-type': 'application/json' },
            },
          );
        }
        return await AppRouter.ticketController.getTicketsByQueue(req);
      } catch (error) {
        return new Response(
          JSON.stringify({
            error: 'Erro interno do servidor',
            message:
              error instanceof Error ? error.message : 'Erro desconhecido',
          }),
          {
            status: 500,
            headers: { 'content-type': 'application/json' },
          },
        );
      }
    }

    // Estado da Fila - Obter estado completo da fila (senha atual, próximas, chamadas)
    if (
      req.method === 'GET' &&
      pathname.startsWith('/api/rt/queues/') &&
      pathname.endsWith('/state')
    ) {
      try {
        console.log('🔍 [IGNITER] Estado da Fila solicitado:', pathname);
        console.log(
          '🔍 [IGNITER] TicketController:',
          AppRouter.ticketController,
        );
        if (!AppRouter.ticketController) {
          return new Response(
            JSON.stringify({
              error: 'Serviço não disponível',
              message: 'TicketController não foi inicializado',
            }),
            {
              status: 503,
              headers: { 'content-type': 'application/json' },
            },
          );
        }
        return await AppRouter.ticketController.getQueueState(req);
      } catch (error) {
        return new Response(
          JSON.stringify({
            error: 'Erro interno do servidor',
            message:
              error instanceof Error ? error.message : 'Erro desconhecido',
          }),
          {
            status: 500,
            headers: { 'content-type': 'application/json' },
          },
        );
      }
    }

    // Estatísticas do Sistema - Estatísticas do sistema otimizado
    if (req.method === 'GET' && pathname === '/api/rt/tickets/stats') {
      try {
        if (!AppRouter.ticketController) {
          return new Response(
            JSON.stringify({
              error: 'Serviço não disponível',
              message: 'TicketController não foi inicializado',
            }),
            {
              status: 503,
              headers: { 'content-type': 'application/json' },
            },
          );
        }
        return await AppRouter.ticketController.getStats();
      } catch (error) {
        return new Response(
          JSON.stringify({
            error: 'Erro interno do servidor',
            message:
              error instanceof Error ? error.message : 'Erro desconhecido',
          }),
          {
            status: 500,
            headers: { 'content-type': 'application/json' },
          },
        );
      }
    }

    // 404 padrão
    return new Response(JSON.stringify({ error: 'Not Found' }), {
      status: 404,
      headers: { 'content-type': 'application/json' },
    });
  }
}
