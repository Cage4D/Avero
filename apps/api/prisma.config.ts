import { existsSync } from 'node:fs';
import { defineConfig } from 'prisma/config';

// Prisma 7 no longer auto-loads .env. Load it locally when present;
// on Vercel/CI the variables come from the environment.
if (existsSync('.env')) process.loadEnvFile('.env');

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  // Migrations use the direct (non-pooled) connection.
  datasource: {
    url: process.env.DIRECT_URL ?? '',
  },
});
