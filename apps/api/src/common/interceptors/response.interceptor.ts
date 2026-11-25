import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Response } from 'express';
import { map, Observable } from 'rxjs';
import { ApiEnvelopeDto } from '../dto/index.js';

export const SUCCESS_MESSAGE = 'Success';

export type ApiResponse<T> = ApiEnvelopeDto & { data: T };

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T>> {
    const response = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      map((data) => ({
        statusCode: response.statusCode,
        message: SUCCESS_MESSAGE,
        data,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
