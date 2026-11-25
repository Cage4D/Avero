import { existsSync } from 'node:fs';
import bcrypt from 'bcrypt';
import { faker } from '@faker-js/faker';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  Prisma,
  PrismaClient,
  UserAccountStatus,
  UserRole,
} from '../src/generated/prisma/client.js';

if (existsSync('.env')) process.loadEnvFile('.env');

const SEED_PASSWORD = 'password123';
const SALT_ROUNDS = 10;
const RANDOM_USERS = 20;
const ADMIN_EMAIL = 'admin@example.com';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL }),
});

const passwordHash = bcrypt.hashSync(SEED_PASSWORD, SALT_ROUNDS);

function buildUser(overrides: Partial<Prisma.UserCreateInput> = {}) {
  return {
    fullName: faker.person.fullName(),
    email: faker.internet.email().toLowerCase(),
    passwordHash,
    avatar: faker.image.avatar(),
    bio: faker.lorem.sentence(),
    phoneNumber: faker.phone.number(),
    role: UserRole.USER,
    status: faker.helpers.enumValue(UserAccountStatus),
    lastActive: faker.date.recent(),
    ...overrides,
  } satisfies Prisma.UserCreateInput;
}

async function main(): Promise<void> {
  // Idempotent: the admin is upserted, and random users are only added to an
  // empty table, so re-running setup.sh never duplicates or fails.
  await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {},
    create: buildUser({
      fullName: 'Admin User',
      email: ADMIN_EMAIL,
      role: UserRole.ADMIN,
      status: UserAccountStatus.ACTIVE,
    }),
  });

  const others = await prisma.user.count({ where: { email: { not: ADMIN_EMAIL } } });
  if (others === 0) {
    await prisma.user.createMany({
      data: Array.from({ length: RANDOM_USERS }, () => buildUser()),
      skipDuplicates: true,
    });
  }

  console.log(`Seeded users. Sign in as ${ADMIN_EMAIL} / ${SEED_PASSWORD}.`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
