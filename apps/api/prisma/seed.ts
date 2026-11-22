import { existsSync } from 'node:fs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

if (existsSync('.env')) process.loadEnvFile('.env');

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL }),
});

const models = [
  { code: 'gt', name: 'AVERO GT', status: 'live', sortOrder: 1 },
  { code: 'rs', name: 'AVERO RS', status: 'teaser', sortOrder: 2 },
  { code: 'x', name: 'AVERO X', status: 'teaser', sortOrder: 3 },
] as const;

async function main(): Promise<void> {
  for (const model of models) {
    await prisma.model.upsert({
      where: { code: model.code },
      update: { name: model.name, status: model.status, sortOrder: model.sortOrder },
      create: model,
    });
  }
  console.log(`Seeded ${models.length} models.`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
