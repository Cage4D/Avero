import { stopTracing } from './instrument';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule } from '@nestjs/swagger';
import { Logger as NestLogger } from '@nestjs/common';
import { Logger as PinoLogger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import {
    API_PREFIX,
    DOCS_PATH,
    documentOptions,
    swaggerConfig,
} from './openapi';
import { METRICS_PATH, READY_PATH } from '@common/enums/observability';
import {
    closeServer,
    createAdminServer,
    listenServer,
} from '@common/observability/admin-server';
import { MetricsService } from '@common/observability/metrics.service';
import { ReadinessService } from '@common/observability/readiness.service';

const bootstrapLogger = new NestLogger('Bootstrap');

async function bootstrap() {
    const app = await NestFactory.create(AppModule, { bufferLogs: true });
    const logger = app.get(PinoLogger);
    app.useLogger(logger);

    const config = app.get(ConfigService);
    configureApp(app);

    const document = SwaggerModule.createDocument(
        app,
        swaggerConfig,
        documentOptions,
    );
    SwaggerModule.setup(DOCS_PATH, app, document);

    const port = config.getOrThrow<number>('PORT');
    const adminPort = config.getOrThrow<number>('ADMIN_PORT');

    const adminServer = createAdminServer(
        app.get(MetricsService),
        app.get(ReadinessService),
    );
    await listenServer(adminServer, adminPort);
    await app.listen(port);

    let shuttingDown = false;
    const shutdown = (signal: string) => {
        if (shuttingDown) return;
        shuttingDown = true;
        logger.log(`Received ${signal}, shutting down gracefully`, 'Bootstrap');
        void Promise.allSettled([
            app.close(),
            closeServer(adminServer),
            stopTracing(),
        ]).finally(() => process.exit(0));
    };

    process.once('SIGINT', () => shutdown('SIGINT'));
    process.once('SIGTERM', () => shutdown('SIGTERM'));

    const url = await app.getUrl();
    logger.log(`API running on ${url}/${API_PREFIX}`, 'Bootstrap');
    logger.log(`Swagger docs at ${url}/${DOCS_PATH}`, 'Bootstrap');
    logger.log(
        `Metrics at http://localhost:${adminPort}${METRICS_PATH}`,
        'Bootstrap',
    );
    logger.log(
        `Readiness at http://localhost:${adminPort}${READY_PATH}`,
        'Bootstrap',
    );
}

void bootstrap().catch((err: unknown) => {
    bootstrapLogger.error('Failed to start application', err);
    void stopTracing().finally(() => process.exit(1));
});
