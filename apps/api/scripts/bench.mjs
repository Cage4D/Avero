import { generateKeyPairSync, randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const percentile = (sorted, p) =>
    sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];

async function measure(url, headers, total, concurrency) {
    const latencies = [];
    const started = performance.now();
    let issued = 0;

    const worker = async () => {
        while (issued < total) {
            issued++;
            const t0 = performance.now();
            const res = await fetch(url, { headers });
            await res.arrayBuffer();
            latencies.push(performance.now() - t0);
        }
    };

    await Promise.all(Array.from({ length: concurrency }, () => worker()));
    const elapsedSec = (performance.now() - started) / 1000;
    latencies.sort((a, b) => a - b);

    return {
        rps: Math.round(total / elapsedSec),
        p50Ms: Number(percentile(latencies, 0.5).toFixed(2)),
        p95Ms: Number(percentile(latencies, 0.95).toFixed(2)),
        p99Ms: Number(percentile(latencies, 0.99).toFixed(2)),
    };
}

async function main() {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'postgresql://bench:bench@localhost:5432/bench';
    process.env.JWT_PRIVATE_KEY = Buffer.from(privateKey).toString('base64');
    process.env.JWT_PUBLIC_KEY = Buffer.from(publicKey).toString('base64');
    process.env.FRONTEND_URL = 'http://localhost:3000';
    process.env.THROTTLE_LIMIT = '100000';

    const { Test } = require('@nestjs/testing');
    const { UserAccountStatus, UserRole } = require('../dist/generated/prisma/client');
    const { PasswordUtil } = require('../dist/src/lib/password');
    const { PrismaService } = require('../dist/src/common/database/prisma.service');
    const { UserRepo } = require('../dist/src/common/repos/user.repo');
    const { AppModule } = require('../dist/src/app.module');
    const { configureApp } = require('../dist/src/app.setup');

    const hash = await PasswordUtil.hash('password123');
    const now = new Date();
    const users = [
        {
            id: randomUUID(),
            fullName: 'Bench Admin',
            email: 'admin@example.com',
            passwordHash: hash,
            phoneNumber: null,
            avatar: null,
            bio: null,
            role: UserRole.ADMIN,
            status: UserAccountStatus.ACTIVE,
            createdAt: now,
            updatedAt: now,
            lastActive: now,
        },
        ...Array.from({ length: 200 }, (_, i) => ({
            id: randomUUID(),
            fullName: `User ${i}`,
            email: `user${i}@example.com`,
            passwordHash: hash,
            phoneNumber: null,
            avatar: null,
            bio: null,
            role: UserRole.USER,
            status: UserAccountStatus.ACTIVE,
            createdAt: new Date(now.getTime() - i * 3_600_000),
            updatedAt: now,
            lastActive: now,
        })),
    ];

    let repoReads = 0;
    const fakeRepo = {
        findUnique: ({ where }) =>
            Promise.resolve(
                users.find(
                    (u) =>
                        (where.id && u.id === where.id) ||
                        (where.email && u.email === where.email),
                ) ?? null,
            ),
        findMany: (params = {}) => {
            repoReads++;
            const start = params.skip ?? 0;
            const end =
                params.take !== undefined ? start + params.take : undefined;
            return Promise.resolve(users.slice(start, end));
        },
        count: () => Promise.resolve(users.length),
    };

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
        .overrideProvider(PrismaService)
        .useValue({
            $connect: () => Promise.resolve(),
            $disconnect: () => Promise.resolve(),
            $queryRaw: () => Promise.resolve([1]),
        })
        .overrideProvider(UserRepo)
        .useValue(fakeRepo)
        .compile();

    const app = moduleRef.createNestApplication();
    configureApp(app);
    await app.listen(0);

    const { port } = app.getHttpServer().address();
    const base = `http://127.0.0.1:${port}/api`;

    const loginRes = await fetch(`${base}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: 'admin@example.com',
            password: 'password123',
        }),
    });
    const { data } = await loginRes.json();
    const auth = { Authorization: `Bearer ${data.accessToken}` };

    const health = await measure(`${base}/health`, {}, 1000, 20);
    const listUsers = await measure(
        `${base}/users?limit=20&offset=0`,
        auth,
        500,
        20,
    );
    repoReads = 0;
    const statsSeries = await measure(
        `${base}/stats/users/series?period=day`,
        auth,
        500,
        20,
    );

    process.stdout.write(
        `${JSON.stringify({ health, listUsers, statsSeries, statsSeriesRepoReads: repoReads }, null, 2)}\n`,
    );

    await app.close();
}

void main();
