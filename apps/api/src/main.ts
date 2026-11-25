import 'reflect-metadata';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { API_PREFIX, configureApp, createOpenApiDocument, DOCS_PATH } from './setup.js';

if (existsSync('.env')) process.loadEnvFile('.env');

const logger = new Logger('Bootstrap');

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  
  SwaggerModule.setup(DOCS_PATH, app, createOpenApiDocument(app), {
    customSwaggerUiPath: fileURLToPath(new URL('../swagger-ui', import.meta.url)),
  });

  await app.listen(app.get(ConfigService).getOrThrow<number>('PORT'));

  const url = await app.getUrl();
  logger.log(`API running on ${url}/${API_PREFIX}`);
  logger.log(`Swagger docs at ${url}/${DOCS_PATH}`);
}

bootstrap().catch((error: unknown) => {
  logger.error('Failed to start application', error);
  process.exit(1);
});
