import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import type { Request, Response } from 'express';

const DEFAULT_MESSAGE = 'An error occurred';

const messageOf = (body: string | object): unknown =>
  typeof body === 'string' ? body : 'message' in body ? body.message : DEFAULT_MESSAGE;

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    response.status(status).json({
      statusCode: status,
      message: messageOf(exception.getResponse()),
      error: exception.name,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
