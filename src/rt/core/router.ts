// src/rt/router-core.ts
import {
  META,
  type RtCtx,
  type RtRouteDef,
  type RtMiddleware,
  type RtSse,
} from './decorators';
import type { ZodTypeAny } from 'zod';

/* ------------ utils ------------- */

// Converte "/a/:id/b" para regex e captura nomeada (?<id>[^/]+)
function pathToRegex(path: string) {
  const reStr =
    '^' +
    path
      .replace(/\/+$/, '') // remove trailing slash
      .replace(/\/:([A-Za-z0-9_]+)/g, '/(?<$1>[^/]+)') +
    '$';
  return new RegExp(reStr);
}

function joinPaths(base: string, sub: string) {
  const a = ('/' + (base || '')).replace(/\/+$/, '');
  const b = ('/' + (sub || '')).replace(/^\/+/, '');
  const out = (a + (b === '/' ? '' : '/' + b)).replace(/\/+$/, '');
  return out || '/';
}

function notFound() {
  return new Response(JSON.stringify({ error: 'Not Found' }), {
    status: 404,
    headers: { 'content-type': 'application/json' },
  });
}

function json(data: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    ...(init || {}),
    headers: { 'content-type': 'application/json', ...(init?.headers || {}) },
  });
}

function text(data: string, init?: ResponseInit) {
  return new Response(data, init);
}

/* ------------ SSE ------------- */
function createSse(): RtSse {
  const encoder = new TextEncoder();
  let closed = false;
  let onCloseCb: (() => void) | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      // noop
      (globalThis as any).__sseController = controller; // debug
    },
    cancel() {
      closed = true;
      onCloseCb?.();
    },
  });

  const writable = {
    enqueue: (chunk: string) => {
      if (closed) return;
      (stream as any).controller?.enqueue?.(encoder.encode(chunk));
    },
  };

  const sse: RtSse = {
    response: new Response(stream as any, {
      headers: {
        'content-type': 'text/event-stream; charset=utf-8',
        'cache-control': 'no-cache, no-transform',
        connection: 'keep-alive',
        'x-accel-buffering': 'no',
      },
    }),
    emit: (data: unknown) => {
      writable.enqueue(`data: ${JSON.stringify(data)}\n\n`);
    },
    comment: (c: string) => {
      writable.enqueue(`: ${c}\n\n`);
    },
    close: () => {
      closed = true;
      (stream as any).controller?.close?.();
      onCloseCb?.();
    },
    onClose: (fn: () => void) => {
      onCloseCb = fn;
    },
  };

  // hack para acessar controller interno (limitação do TS aqui)
  Object.defineProperty(stream, 'controller', {
    value: {
      enqueue: (u: Uint8Array) => {
        (stream as any)._controller?.enqueue?.(u);
      },
      close: () => {
        (stream as any)._controller?.close?.();
      },
    },
    writable: true,
  });

  return sse;
}

/* ---------- pipeline ---------- */

async function runMiddlewares(
  ctx: RtCtx,
  mws: RtMiddleware[],
  finalHandler: () => Promise<Response>,
) {
  let i = -1;
  const run = async (idx: number): Promise<Response> => {
    if (idx <= i) throw new Error('next() chamado múltiplas vezes');
    i = idx;
    const mw = mws[idx];
    if (!mw) return finalHandler();
    return mw(ctx, () => run(idx + 1));
  };
  return run(0);
}

/* ---------- build handler (controllers) ---------- */

export function buildHandler(controllers: any[]) {
  // monta tabela de rotas
  const table: Array<{
    method: string;
    regex: RegExp;
    def: RtRouteDef;
    instance: any;
  }> = [];

  for (const ctrl of controllers) {
    const ctor = ctrl.constructor;
    const base: string = Reflect.getMetadata(META.CONTROLLER, ctor) ?? '';
    const routes: RtRouteDef[] = Reflect.getMetadata(META.ROUTES, ctor) ?? [];
    for (const r of routes) {
      const fullPath = joinPaths(base, r.path || '');
      table.push({
        method: r.method,
        regex: pathToRegex(fullPath),
        def: { ...r, path: fullPath },
        instance: ctrl,
      });
    }
  }

  return async function handler(req: Request): Promise<Response> {
    const url = new URL(req.url);

    for (const row of table) {
      if (row.method === 'SSE' && req.method !== 'GET') continue; // SSE usa GET
      if (row.method !== 'SSE' && row.method !== req.method) continue;

      const match = row.regex.exec(url.pathname);
      if (!match) continue;

      const params = (match.groups ?? {}) as Record<string, string>;
      const ctx: RtCtx = {
        req,
        url,
        params,
        query: url.searchParams,
        json,
        text,
      };

      const route = row.def;

      // Body parse/validate se houver schema
      if (route.bodySchema) {
        const ct = req.headers.get('content-type') || '';
        let parsed: any = undefined;
        if (ct.includes('application/json')) {
          parsed = await req.json().catch(() => undefined);
        } else if (ct.includes('text/plain')) {
          parsed = await req.text().catch(() => undefined);
        } else if (ct.includes('application/x-www-form-urlencoded')) {
          const form = await req.formData();
          parsed = Object.fromEntries(form.entries());
        } else {
          // tenta como arrayBuffer e assume binário
          parsed = await req.arrayBuffer().catch(() => undefined);
        }
        const result = (route.bodySchema as ZodTypeAny).safeParse(parsed);
        if (!result.success) {
          return json(
            { error: 'ValidationError', issues: result.error.issues },
            { status: 400 },
          );
        }
        ctx.body = result.data;
      }

      // SSE prepara stream
      if (route.method === 'SSE') {
        const sse = createSse();
        ctx.sse = sse;

        const call = async () => {
          const fn = (row.instance as any)[route.handlerName].bind(
            row.instance,
          );
          // handler de SSE deve retornar Response OU usar ctx.sse diretamente.
          const maybeRes = await fn(ctx);
          return maybeRes instanceof Response ? maybeRes : sse.response;
        };

        const mws = route.middlewares ?? [];
        return mws.length ? runMiddlewares(ctx, mws, call) : call();
      }

      // Demais rotas HTTP
      const call = async () => {
        const fn = (row.instance as any)[route.handlerName].bind(row.instance);
        const res = await fn(ctx);
        if (res instanceof Response) return res;
        // permitir retornar plain object
        return json(res ?? {});
      };

      const mws = route.middlewares ?? [];
      return mws.length ? runMiddlewares(ctx, mws, call) : call();
    }

    return notFound();
  };
}
