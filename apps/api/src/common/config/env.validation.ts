import { z } from 'zod';
import { DEFAULT_CORS_ORIGINS, DEFAULT_PORT, NodeEnv } from '../enums/env.js';

const blankAsAbsent = (value: unknown): unknown =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

const requiredSecret = z.preprocess(blankAsAbsent, z.string().min(1));

const originList = z
  .string()
  .transform((value) =>
    value
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  )
  .pipe(z.array(z.url()));

const envSchema = z.object({
  DATABASE_URL: requiredSecret,
  JWT_PRIVATE_KEY: requiredSecret,
  JWT_PUBLIC_KEY: requiredSecret,
  NODE_ENV: z.preprocess(blankAsAbsent, z.enum(NodeEnv).default(NodeEnv.DEVELOPMENT)),
  PORT: z.preprocess(blankAsAbsent, z.coerce.number().int().positive().default(DEFAULT_PORT)),
  CORS_ORIGINS: z.preprocess(blankAsAbsent, originList.prefault(DEFAULT_CORS_ORIGINS)),
});

export type Env = z.infer<typeof envSchema>;

export const validateEnv = (config: Record<string, unknown>): Record<string, unknown> => {
  const parsed = envSchema.safeParse(config);

  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((issue) => `  ${issue.path.join('.')} — ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${detail}`);
  }

  return { ...config, ...parsed.data };
};
