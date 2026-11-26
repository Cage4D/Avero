import { STATUS_CODES } from 'node:http';
import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiErrorDto } from '@common/dto';

const FALLBACK_MESSAGE = 'An error occurred';
const INTERNAL_ERROR =
    STATUS_CODES[HttpStatus.INTERNAL_SERVER_ERROR] ?? 'Internal Server Error';
const DETAIL_SEPARATOR = '; ';

const messageOf = (body: string | object): string => {
    if (typeof body === 'string') return body;

    const message = 'message' in body ? body.message : undefined;

    if (Array.isArray(message))
        return message.map(String).join(DETAIL_SEPARATOR);

    return typeof message === 'string' ? message : FALLBACK_MESSAGE;
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(HttpExceptionFilter.name);

    catch(exception: unknown, host: ArgumentsHost): void {
        const isHttp = exception instanceof HttpException;
        const status = isHttp
            ? exception.getStatus()
            : HttpStatus.INTERNAL_SERVER_ERROR;

        const reason = STATUS_CODES[status] ?? INTERNAL_ERROR;
        let message: string;

        if (status >= Number(HttpStatus.INTERNAL_SERVER_ERROR)) {
            this.logInternalError(exception, status);
            message = reason;
        } else {
            message = isHttp ? messageOf(exception.getResponse()) : reason;
        }

        const body: ApiErrorDto = {
            statusCode: status,
            message,
            error: reason,
            timestamp: new Date().toISOString(),
        };

        host.switchToHttp().getResponse<Response>().status(status).json(body);
    }

    private logInternalError(exception: unknown, status: number): void {
        if (exception instanceof Error) {
            const cause =
                exception.cause instanceof Error
                    ? exception.cause.stack
                    : undefined;
            this.logger.error(
                `${status} ${exception.message}`,
                cause ?? exception.stack,
            );
            return;
        }
        this.logger.error(`${status} Non-error exception thrown`);
    }
}
