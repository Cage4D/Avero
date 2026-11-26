import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { API_PREFIX } from './openapi';
import {
    AUTHORIZATION_HEADER,
    CONTENT_TYPE_HEADER,
    REQUEST_ID_HEADER,
} from '@common/enums/observability';
import { requestIdMiddleware } from '@common/observability/request-id';
import { createMetricsMiddleware } from '@common/observability/metrics.middleware';
import { MetricsService } from '@common/observability/metrics.service';
import { HttpExceptionFilter } from '@common/filters/http-exception.filter';
import { ResponseInterceptor } from '@common/interceptors/response.interceptor';

export const configureApp = (app: INestApplication): void => {
    const config = app.get(ConfigService);
    const metrics = app.get(MetricsService);

    app.use(requestIdMiddleware);
    app.use(createMetricsMiddleware(metrics));
    app.setGlobalPrefix(API_PREFIX);

    app.enableCors({
        origin: config.getOrThrow<string>('FRONTEND_URL'),
        credentials: true,
        methods: ['GET', 'POST', 'PATCH', 'DELETE'],
        allowedHeaders: [
            AUTHORIZATION_HEADER,
            CONTENT_TYPE_HEADER,
            REQUEST_ID_HEADER,
        ],
        exposedHeaders: [REQUEST_ID_HEADER],
    });

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            transform: true,
            forbidNonWhitelisted: true,
            errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        }),
    );

    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new ResponseInterceptor());
};
