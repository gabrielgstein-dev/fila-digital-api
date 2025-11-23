import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : exception instanceof Error
          ? exception.message
          : 'Erro interno do servidor';

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message:
        typeof message === 'string'
          ? message
          : (message as { message?: string | string[] })?.message || message,
      error:
        exception instanceof HttpException
          ? exception.name
          : exception instanceof Error
            ? exception.name
            : 'InternalServerError',
    };

    const errorDetails = {
      ...errorResponse,
      stack:
        exception instanceof Error && exception.stack
          ? exception.stack
          : undefined,
      body: request.body ? JSON.stringify(request.body) : undefined,
      query: request.query ? JSON.stringify(request.query) : undefined,
      params: request.params ? JSON.stringify(request.params) : undefined,
    };

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} - ${status}`,
        JSON.stringify(errorDetails, null, 2),
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(
        `${request.method} ${request.url} - ${status}`,
        JSON.stringify(errorDetails, null, 2),
      );
    }

    response.status(status).json(errorResponse);
  }
}
