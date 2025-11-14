import { Get, Post } from './core/decorators';

export class HelloController {
  @Get('/api/rt/hello')
  hello() {
    return new Response(JSON.stringify({ msg: 'Hello World' }), {
      headers: { 'content-type': 'application/json' },
    });
  }

  @Post('/api/rt/echo')
  async echo(req: Request) {
    const data = await req.json().catch(() => ({}));
    return new Response(JSON.stringify({ received: data }), {
      headers: { 'content-type': 'application/json' },
    });
  }
}
