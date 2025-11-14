// src/rt/decorators.ts
import 'reflect-metadata';
import type { ZodTypeAny } from 'zod';

export const META = {
  CONTROLLER: Symbol('rt:controller'),
  ROUTES: Symbol('rt:routes'),
} as const;

export type RtMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'SSE';

export type RtMiddleware = (
  ctx: RtCtx,
  next: () => Promise<Response>,
) => Promise<Response>;
export type RtHandler = (ctx: RtCtx) => Promise<Response> | Response;

export interface RtRouteDef {
  method: RtMethod;
  path: string; // ex: "/notifications/:id"
  handlerName: string;
  bodySchema?: ZodTypeAny; // zod para validar body
  middlewares?: RtMiddleware[];
}

export interface RtCtx {
  req: Request;
  url: URL;
  params: Record<string, string>;
  query: URLSearchParams;
  body?: any; // já validado se houver @Body
  // Helpers:
  json: <T = any>(data: T, init?: ResponseInit) => Response;
  text: (data: string, init?: ResponseInit) => Response;
  sse?: RtSse; // só existe em rotas @Sse
}

export interface RtSse {
  response: Response; // Response com stream
  emit: (data: unknown) => void; // envia "data: ...\n\n"
  comment: (c: string) => void; // envia ": c\n\n"
  close: () => void; // encerra stream
  onClose: (fn: () => void) => void; // callback desconexão
}

/* ------------------------ Decorators ------------------------ */

export function Controller(basePath: string = ''): ClassDecorator {
  return (target) => {
    Reflect.defineMetadata(META.CONTROLLER, basePath, target);
    if (!Reflect.hasMetadata(META.ROUTES, target)) {
      Reflect.defineMetadata(META.ROUTES, [] as RtRouteDef[], target);
    }
  };
}

function methodDecorator(method: RtMethod) {
  return (
    path: string,
    ...rest: (RtMiddleware | undefined)[]
  ): MethodDecorator => {
    return (target, propertyKey) => {
      const routes: RtRouteDef[] =
        Reflect.getMetadata(META.ROUTES, target.constructor) ?? [];
      routes.push({
        method,
        path,
        handlerName: propertyKey as string,
        middlewares: rest?.filter(Boolean) as RtMiddleware[] | undefined,
      });
      Reflect.defineMetadata(META.ROUTES, routes, target.constructor);
    };
  };
}

export const Get = methodDecorator('GET');
export const Post = methodDecorator('POST');
export const Put = methodDecorator('PUT');
export const Patch = methodDecorator('PATCH');
export const Delete = methodDecorator('DELETE');
export const Sse = methodDecorator('SSE');

/** Anexa um schema zod ao método para validar body. */
export function Body(schema: ZodTypeAny): MethodDecorator {
  return (target, propertyKey) => {
    const routes: RtRouteDef[] =
      Reflect.getMetadata(META.ROUTES, target.constructor) ?? [];
    const idx = routes.findIndex((r) => r.handlerName === propertyKey);
    if (idx >= 0) {
      routes[idx] = { ...routes[idx], bodySchema: schema };
    } else {
      // Se @Body veio antes do @Post/@Put, cria placeholder e será atualizado depois
      routes.push({
        method: 'POST', // placeholder; será sobrescrito pelo decorator HTTP
        path: '',
        handlerName: propertyKey as string,
        bodySchema: schema,
      });
    }
    Reflect.defineMetadata(META.ROUTES, routes, target.constructor);
  };
}

/** Associa middlewares extras a uma rota específica. */
export function Use(...fns: RtMiddleware[]): MethodDecorator {
  return (target, propertyKey) => {
    const routes: RtRouteDef[] =
      Reflect.getMetadata(META.ROUTES, target.constructor) ?? [];
    const idx = routes.findIndex((r) => r.handlerName === propertyKey);
    if (idx >= 0) {
      routes[idx] = {
        ...routes[idx],
        middlewares: [...(routes[idx].middlewares ?? []), ...fns],
      };
    } else {
      routes.push({
        method: 'GET',
        path: '',
        handlerName: propertyKey as string,
        middlewares: fns,
      });
    }
    Reflect.defineMetadata(META.ROUTES, routes, target.constructor);
  };
}
