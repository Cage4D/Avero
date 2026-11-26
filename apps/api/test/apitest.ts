import { generateKeyPairSync, randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { App } from 'supertest/types';
import {
    Prisma,
    type User,
    UserAccountStatus,
    UserRole,
} from 'generated/prisma/client';
import type { AppModule as AppModuleClass } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '@common/database/prisma.service';
import { UserRepo } from '@common/repos/user.repo';
import { RepoError } from '@common/errors/repo.error';
import { RECORD_NOT_FOUND, UNIQUE_VIOLATION } from '@common/enums/prisma';
import { MetricsService } from '@common/observability/metrics.service';
import { ReadinessService } from '@common/observability/readiness.service';
import { HttpStatus } from '@nestjs/common';

export interface TestKeyPair {
    privateKeyB64: string;
    publicKeyB64: string;
}

export const generateTestKeys = (): TestKeyPair => {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    return {
        privateKeyB64: Buffer.from(privateKey).toString('base64'),
        publicKeyB64: Buffer.from(publicKey).toString('base64'),
    };
};

const prismaError = (code: string): RepoError =>
    new RepoError(
        'In-memory repo error',
        HttpStatus.INTERNAL_SERVER_ERROR,
        new Prisma.PrismaClientKnownRequestError('Prisma', {
            code,
            clientVersion: 'test',
        }),
    );

const pickFields = (
    user: User,
    select?: Record<string, boolean>,
): Record<string, unknown> => {
    if (!select) return { ...user };
    const result: Record<string, unknown> = {};
    for (const [key, include] of Object.entries(select)) {
        if (include) {
            result[key] = user[key as keyof User];
        }
    }
    return result;
};

export class InMemoryUserRepo {
    private readonly users = new Map<string, User>();

    seed(
        partial: Partial<User> &
            Pick<User, 'fullName' | 'email' | 'passwordHash'>,
    ): User {
        const now = partial.createdAt ?? new Date();
        const user: User = {
            id: partial.id ?? randomUUID(),
            fullName: partial.fullName,
            email: partial.email,
            passwordHash: partial.passwordHash,
            phoneNumber: partial.phoneNumber ?? null,
            avatar: partial.avatar ?? null,
            bio: partial.bio ?? null,
            role: partial.role ?? UserRole.USER,
            status: partial.status ?? UserAccountStatus.ACTIVE,
            createdAt: now,
            updatedAt: partial.updatedAt ?? now,
            lastActive: partial.lastActive ?? now,
        };
        this.users.set(user.id, user);
        return user;
    }

    findUnique(params: {
        where: { id?: string; email?: string };
        select?: Record<string, boolean>;
    }): Promise<Record<string, unknown> | null> {
        const found = [...this.users.values()].find(
            (u) =>
                (params.where.id !== undefined && u.id === params.where.id) ||
                (params.where.email !== undefined &&
                    u.email === params.where.email),
        );
        return Promise.resolve(found ? pickFields(found, params.select) : null);
    }

    findMany(params?: {
        where?: { createdAt?: { gte?: Date; lt?: Date } };
        select?: Record<string, boolean>;
        take?: number;
        skip?: number;
    }): Promise<Record<string, unknown>[]> {
        let items = this.filterByCreatedAt(params?.where?.createdAt);
        items = items.sort(
            (a, b) =>
                a.createdAt.getTime() - b.createdAt.getTime() ||
                a.id.localeCompare(b.id),
        );
        const start = params?.skip ?? 0;
        const end =
            params?.take !== undefined ? start + params.take : undefined;
        return Promise.resolve(
            items.slice(start, end).map((u) => pickFields(u, params?.select)),
        );
    }

    create(params: {
        data: {
            fullName: string;
            email: string;
            passwordHash: string;
            role?: UserRole;
            phoneNumber?: string;
            bio?: string;
        };
        select?: Record<string, boolean>;
    }): Promise<Record<string, unknown>> {
        const duplicate = [...this.users.values()].some(
            (u) => u.email === params.data.email,
        );
        if (duplicate) {
            return Promise.reject(prismaError(UNIQUE_VIOLATION));
        }
        const created = this.seed(params.data);
        return Promise.resolve(pickFields(created, params.select));
    }

    update(params: {
        where: { id: string };
        data: Partial<User>;
        select?: Record<string, boolean>;
    }): Promise<Record<string, unknown>> {
        const existing = this.users.get(params.where.id);
        if (!existing) {
            return Promise.reject(prismaError(RECORD_NOT_FOUND));
        }
        if (
            params.data.email !== undefined &&
            params.data.email !== existing.email &&
            [...this.users.values()].some((u) => u.email === params.data.email)
        ) {
            return Promise.reject(prismaError(UNIQUE_VIOLATION));
        }
        const updated: User = {
            ...existing,
            ...Object.fromEntries(
                Object.entries(params.data).filter(
                    ([, value]) => value !== undefined,
                ),
            ),
            updatedAt: new Date(),
        };
        this.users.set(updated.id, updated);
        return Promise.resolve(pickFields(updated, params.select));
    }

    delete(params: {
        where: { id: string };
        select?: Record<string, boolean>;
    }): Promise<Record<string, unknown>> {
        const existing = this.users.get(params.where.id);
        if (!existing) {
            return Promise.reject(prismaError(RECORD_NOT_FOUND));
        }
        this.users.delete(existing.id);
        return Promise.resolve(pickFields(existing, params.select));
    }

    count(params?: {
        where?: { createdAt?: { gte?: Date; lt?: Date } };
    }): Promise<number> {
        return Promise.resolve(
            this.filterByCreatedAt(params?.where?.createdAt).length,
        );
    }

    private filterByCreatedAt(range?: { gte?: Date; lt?: Date }): User[] {
        return [...this.users.values()].filter((u) => {
            if (range?.gte && u.createdAt < range.gte) return false;
            if (range?.lt && u.createdAt >= range.lt) return false;
            return true;
        });
    }
}

export interface TestAppContext {
    app: INestApplication<App>;
    httpServer: App;
    userRepo?: InMemoryUserRepo;
    metrics: MetricsService;
    readiness: ReadinessService;
    close: () => Promise<void>;
}

export const bootTestApp = async (options?: {
    inMemory?: boolean;
    env?: Record<string, string | undefined>;
}): Promise<TestAppContext> => {
    const keys = generateTestKeys();
    const defaults: Record<string, string | undefined> = {
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/test',
        JWT_PRIVATE_KEY: keys.privateKeyB64,
        JWT_PUBLIC_KEY: keys.publicKeyB64,
        PORT: '5000',
        ADMIN_PORT: '6060',
        FRONTEND_URL: 'http://localhost:3000',
        THROTTLE_LIMIT: '1000',
        REDIS_URL: undefined,
        OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: undefined,
        ...options?.env,
    };

    const previous = new Map<string, string | undefined>();
    for (const [key, value] of Object.entries(defaults)) {
        previous.set(key, process.env[key]);
        if (value === undefined) {
            delete process.env[key];
        } else {
            process.env[key] = value;
        }
    }

    const { AppModule } = jest.requireActual<{
        AppModule: typeof AppModuleClass;
    }>('../src/app.module');
    const builder = Test.createTestingModule({ imports: [AppModule] });
    let userRepo: InMemoryUserRepo | undefined;

    if (options?.inMemory) {
        userRepo = new InMemoryUserRepo();
        builder
            .overrideProvider(PrismaService)
            .useValue({
                $connect: jest.fn(),
                $disconnect: jest.fn(),
                $queryRaw: jest.fn().mockResolvedValue([1]),
            })
            .overrideProvider(UserRepo)
            .useValue(userRepo);
    }

    const moduleRef = await builder.compile();
    const app = moduleRef.createNestApplication<INestApplication<App>>();
    configureApp(app);
    await app.init();

    return {
        app,
        httpServer: app.getHttpServer(),
        userRepo,
        metrics: app.get(MetricsService),
        readiness: app.get(ReadinessService),
        close: async () => {
            await app.close();
            for (const [key, value] of previous.entries()) {
                if (value === undefined) {
                    delete process.env[key];
                } else {
                    process.env[key] = value;
                }
            }
        },
    };
};
