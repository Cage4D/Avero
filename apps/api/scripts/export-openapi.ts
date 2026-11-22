// Writes the OpenAPI document to packages/contract/openapi.json without
// starting an HTTP server or connecting to the database.
import 'reflect-metadata';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { configureApp, createOpenApiDocument } from '../src/setup';

async function main(): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: false });
  configureApp(app);
  const document = createOpenApiDocument(app);
  const outFile = resolve(__dirname, '../../../packages/contract/openapi.json');
  writeFileSync(outFile, `${JSON.stringify(document, null, 2)}\n`);
  await app.close();
  console.log(`OpenAPI document written to ${outFile}`);
}

void main();
