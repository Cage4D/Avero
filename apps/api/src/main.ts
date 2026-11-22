import 'reflect-metadata';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { API_PREFIX, configureApp, createOpenApiDocument } from './setup.js';

if (existsSync('.env')) process.loadEnvFile('.env');

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  SwaggerModule.setup(`${API_PREFIX}/docs`, app, createOpenApiDocument(app), {
    // Local copy of the Swagger UI assets (scripts/copy-swagger-ui.mjs). The
    // static import.meta.url path lets Vercel's file tracing bundle them.
    customSwaggerUiPath: fileURLToPath(new URL('../swagger-ui', import.meta.url)),
  });
  await app.listen(process.env.PORT ?? 4000);
}

void bootstrap();
