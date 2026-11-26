import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { API_PREFIX, documentOptions, swaggerConfig } from './openapi';

const OUTPUT_PATH = 'openapi.json';
const CHECK_MODE = process.argv.includes('--check');

const PREVIEW_PLACEHOLDER = 'contract-preview';

const SECRETS_UNUSED_IN_PREVIEW = [
    'DATABASE_URL',
    'JWT_PRIVATE_KEY',
    'JWT_PUBLIC_KEY',
];

const standInForSecretsPreviewNeverReads = () => {
    for (const key of SECRETS_UNUSED_IN_PREVIEW) {
        process.env[key] ??= PREVIEW_PLACEHOLDER;
    }
};

async function emit() {
    standInForSecretsPreviewNeverReads();

    const { AppModule } = await import('./app.module.js');

    const app = await NestFactory.create(AppModule, {
        preview: true,
        logger: false,
    });

    app.setGlobalPrefix(API_PREFIX);

    const document = SwaggerModule.createDocument(
        app,
        swaggerConfig,
        documentOptions,
    );

    const rendered = `${JSON.stringify(document, null, 4)}\n`;
    await app.close();

    if (CHECK_MODE) {
        const current = existsSync(OUTPUT_PATH)
            ? readFileSync(OUTPUT_PATH, 'utf8')
            : '';
        if (current !== rendered) {
            process.stderr.write(
                `${OUTPUT_PATH} is out of date — run pnpm openapi and commit the result\n`,
            );
            process.exit(1);
        }
        process.stdout.write(`${OUTPUT_PATH}: up to date\n`);
        return;
    }

    writeFileSync(OUTPUT_PATH, rendered);
    process.stdout.write(
        `${OUTPUT_PATH}: ${Object.keys(document.paths).length} paths, ${Object.keys(document.components?.schemas ?? {}).length} schemas\n`,
    );
}

void emit();
