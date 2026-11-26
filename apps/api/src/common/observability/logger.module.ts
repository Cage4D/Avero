import type { IncomingMessage, ServerResponse } from 'node:http';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { isSpanContextValid, trace } from '@opentelemetry/api';
import { NodeEnv } from '@common/enums/env';
import {
    REQUEST_ID_HEADER,
    REQUEST_ID_HEADER_LOWER,
} from '@common/enums/observability';
import { resolveRequestId } from './request-id';

const activeTraceProps = (): Record<string, string> => {
    const spanContext = trace.getActiveSpan()?.spanContext();
    if (!spanContext || !isSpanContextValid(spanContext)) {
        return {};
    }
    return {
        trace_id: spanContext.traceId,
        span_id: spanContext.spanId,
    };
};

@Module({
    imports: [
        LoggerModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => {
                const env = config.getOrThrow<NodeEnv>('NODE_ENV');
                return {
                    pinoHttp: {
                        level: env === NodeEnv.TEST ? 'silent' : 'info',
                        transport:
                            env === NodeEnv.DEVELOPMENT
                                ? {
                                      target: 'pino-pretty',
                                      options: {
                                          singleLine: true,
                                          colorize: true,
                                      },
                                  }
                                : undefined,
                        genReqId: (
                            req: IncomingMessage,
                            res: ServerResponse,
                        ) => {
                            const id = resolveRequestId(
                                req.headers[REQUEST_ID_HEADER_LOWER],
                            );
                            res.setHeader(REQUEST_ID_HEADER, id);
                            return id;
                        },
                        redact: [
                            'req.headers.authorization',
                            'req.headers.cookie',
                        ],
                        customProps: () => activeTraceProps(),
                        customSuccessMessage: () => 'request served',
                        customErrorMessage: () => 'request failed',
                        serializers: {
                            req: (
                                req: IncomingMessage & { id?: string | number },
                            ) => ({
                                id: req.id,
                                method: req.method,
                                url: req.url,
                            }),
                            res: (res: ServerResponse) => ({
                                statusCode: res.statusCode,
                            }),
                        },
                    },
                };
            },
        }),
    ],
})
export class ObservabilityLoggerModule {}
