import 'reflect-metadata';
import { existsSync } from 'node:fs';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { API_PREFIX, configureApp, createOpenApiDocument } from './setup';

if (existsSync('.env')) process.loadEnvFile('.env');

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  SwaggerModule.setup(`${API_PREFIX}/docs`, app, createOpenApiDocument(app));
  await app.listen(process.env.PORT ?? 4000);
}

void bootstrap();
