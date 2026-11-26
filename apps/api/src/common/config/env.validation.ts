import { z } from 'zod';
import { DEFAULT_FRONTEND_URL, DEFAULT_PORT, NodeEnv } from '@common/enums/env';
import {
    DEFAULT_ADMIN_PORT,
    DEFAULT_SERVICE_NAME,
} from '@common/enums/observability';
import { DEFAULT_THROTTLE_LIMIT } from '@common/enums/cache';

const blankAsAbsent = (value: unknown): unknown =>
    typeof value === 'string' && value.trim() === '' ? undefined : value;

const requiredSecret = z.preprocess(blankAsAbsent, z.string().min(1));

const envSchema = z
    .object({
        DATABASE_URL: requiredSecret,
        JWT_PRIVATE_KEY: requiredSecret,
        JWT_PUBLIC_KEY: requiredSecret,
        NODE_ENV: z.preprocess(
            blankAsAbsent,
            z.enum(NodeEnv).default(NodeEnv.DEVELOPMENT),
        ),
        PORT: z.preprocess(
            blankAsAbsent,
            z.coerce.number().int().positive().default(DEFAULT_PORT),
        ),
        ADMIN_PORT: z.preprocess(
            blankAsAbsent,
            z.coerce.number().int().positive().default(DEFAULT_ADMIN_PORT),
        ),
        FRONTEND_URL: z.preprocess(
            blankAsAbsent,
            z.url().default(DEFAULT_FRONTEND_URL),
        ),
        REDIS_URL: z.preprocess(blankAsAbsent, z.url().optional()),
        THROTTLE_LIMIT: z.preprocess(
            blankAsAbsent,
            z.coerce.number().int().positive().default(DEFAULT_THROTTLE_LIMIT),
        ),
        OTEL_SERVICE_NAME: z.preprocess(
            blankAsAbsent,
            z.string().min(1).default(DEFAULT_SERVICE_NAME),
        ),
        OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: z.preprocess(
            blankAsAbsent,
            z.url().optional(),
        ),
    })
    .refine((data) => data.ADMIN_PORT !== data.PORT, {
        path: ['ADMIN_PORT'],
        message: 'ADMIN_PORT must differ from PORT',
    });

export const validateEnv = (
    config: Record<string, unknown>,
): Record<string, unknown> => {
    const parsed = envSchema.safeParse(config);

    if (!parsed.success) {
        const detail = parsed.error.issues
            .map((issue) => `  ${issue.path.join('.')} — ${issue.message}`)
            .join('\n');
        throw new Error(`Invalid environment configuration:\n${detail}`);
    }

    return { ...config, ...parsed.data };
};
