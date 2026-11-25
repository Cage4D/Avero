// Writes the OpenAPI document to packages/contract/openapi.json without
// starting an HTTP server or touching the database. Runs from dist/ (see the
// `openapi:export` script) so decorator metadata is emitted by tsc.
import 'reflect-metadata';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { API_PREFIX, createOpenApiDocument } from './setup.js';

const OUTPUT_PATH = resolve(import.meta.dirname, '../../../packages/contract/openapi.json');

const PREVIEW_PLACEHOLDER = 'contract-preview';

// Preview mode never instantiates providers, so these are never read. They
// only have to satisfy env validation.
const SECRETS_UNUSED_IN_PREVIEW = ['DATABASE_URL', 'JWT_PRIVATE_KEY', 'JWT_PUBLIC_KEY'];

async function emit(): Promise<void> {
  for (const key of SECRETS_UNUSED_IN_PREVIEW) process.env[key] ??= PREVIEW_PLACEHOLDER;

  // Imported after the stand-ins: ConfigModule validates the env at import time.
  const { AppModule } = await import('./app.module.js');
  const app = await NestFactory.create(AppModule, { preview: true, logger: false });
  app.setGlobalPrefix(API_PREFIX);

  const document = createOpenApiDocument(app);
  writeFileSync(OUTPUT_PATH, `${JSON.stringify(document, null, 2)}\n`);
  await app.close();

  new Logger('OpenAPI').log(
    `${OUTPUT_PATH}: ${Object.keys(document.paths).length} paths, ${Object.keys(document.components?.schemas ?? {}).length} schemas`,
  );
}

void emit();
