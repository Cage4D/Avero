import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { HttpStatus } from '@nestjs/common';
import request from 'supertest';
import {
    PostgreSqlContainer,
    type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import {
    RedisContainer,
    type StartedRedisContainer,
} from '@testcontainers/redis';
import { UserAccountStatus, UserRole } from 'generated/prisma/enums';
import { PrismaService } from '@common/database/prisma.service';
import { PasswordUtil } from '@lib/password';
import { USER_EXISTS } from '@common/enums/auth';
import { MAX_PAGE_SIZE } from '@common/enums/page';
import { bootTestApp, type TestAppContext } from '../apitest';

interface Envelope<T> {
    statusCode: number;
    message: string;
    data: T;
    timestamp: string;
}

interface AuthData {
    user: { id: string; email: string; role: UserRole };
    accessToken: string;
}

interface UserData {
    id: string;
    email: string;
    role: UserRole;
    status: UserAccountStatus;
}

const SECRET = 'correct-horse-battery';

const uniqueEmail = () => `${randomUUID().slice(0, 8)}@example.com`;

describe('Users, stats cache, and rate limiting against Postgres + Redis (integration)', () => {
    let pgContainer: StartedPostgreSqlContainer;
    let redisContainer: StartedRedisContainer;
    let ctx: TestAppContext;

    beforeAll(async () => {
        [pgContainer, redisContainer] = await Promise.all([
            new PostgreSqlContainer('postgres:17-alpine').start(),
            new RedisContainer('redis:7-alpine').start(),
        ]);

        const databaseUrl = pgContainer.getConnectionUri();
        execFileSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
            env: { ...process.env, DATABASE_URL: databaseUrl },
            stdio: 'pipe',
            shell: process.platform === 'win32',
        });

        ctx = await bootTestApp({
            inMemory: false,
            env: {
                DATABASE_URL: databaseUrl,
                REDIS_URL: redisContainer.getConnectionUrl(),
                THROTTLE_LIMIT: '100',
            },
        });
    });

    afterAll(async () => {
        await ctx?.close();
        await Promise.all([pgContainer?.stop(), redisContainer?.stop()]);
    });

    const seedAdmin = async (): Promise<string> => {
        const email = uniqueEmail();
        const prisma = ctx.app.get(PrismaService);
        await prisma.user.create({
            data: {
                fullName: 'Grace Hopper',
                email,
                passwordHash: await PasswordUtil.hash(SECRET),
                role: UserRole.ADMIN,
                status: UserAccountStatus.ACTIVE,
            },
        });
        const login = await request(ctx.httpServer)
            .post('/api/auth/login')
            .send({ email, password: SECRET })
            .expect(HttpStatus.OK);
        return (login.body as Envelope<AuthData>).data.accessToken;
    };

    it('reports both Postgres and Redis healthy on readiness', async () => {
        const result = await ctx.readiness.check();
        expect(result).toEqual({
            ok: true,
            checks: { postgres: 'ok', redis: 'ok' },
        });
    });

    it('registers against real Postgres, maps P2002 to 409, and validates JWTs', async () => {
        const email = uniqueEmail();
        const payload = {
            fullName: 'Ada Lovelace',
            email,
            password: SECRET,
        };

        await request(ctx.httpServer)
            .post('/api/auth/register')
            .send(payload)
            .expect(HttpStatus.CREATED);

        const dup = await request(ctx.httpServer)
            .post('/api/auth/register')
            .send(payload)
            .expect(HttpStatus.CONFLICT);
        expect((dup.body as { message: string }).message).toBe(USER_EXISTS);

        const login = await request(ctx.httpServer)
            .post('/api/auth/login')
            .send({ email, password: SECRET })
            .expect(HttpStatus.OK);
        const token = (login.body as Envelope<AuthData>).data.accessToken;

        const me = await request(ctx.httpServer)
            .get('/api/users/me')
            .set('Authorization', `Bearer ${token}`)
            .expect(HttpStatus.OK);
        expect((me.body as Envelope<UserData>).data.email).toBe(email);
    });

    it('manages users, paginates stably, invalidates Redis stats cache, and deletes', async () => {
        const adminToken = await seedAdmin();
        const email = uniqueEmail();

        const beforeStats = await request(ctx.httpServer)
            .get('/api/stats/users/total?period=month')
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(HttpStatus.OK);
        const countBefore = (beforeStats.body as Envelope<{ total: number }>)
            .data.total;

        const createdRes = await request(ctx.httpServer)
            .post('/api/users')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                fullName: 'Alan Turing',
                email,
                password: SECRET,
            })
            .expect(HttpStatus.CREATED);
        const member = (createdRes.body as Envelope<UserData>).data;

        const afterStats = await request(ctx.httpServer)
            .get('/api/stats/users/total?period=month')
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(HttpStatus.OK);
        expect(
            (afterStats.body as Envelope<{ total: number }>).data.total,
        ).toBe(countBefore + 1);

        const page1 = await request(ctx.httpServer)
            .get('/api/users?limit=1&offset=0')
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(HttpStatus.OK);
        const page2 = await request(ctx.httpServer)
            .get('/api/users?limit=1&offset=1')
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(HttpStatus.OK);
        expect((page1.body as Envelope<UserData[]>).data[0].id).not.toBe(
            (page2.body as Envelope<UserData[]>).data[0].id,
        );

        await request(ctx.httpServer)
            .get(`/api/users?limit=${MAX_PAGE_SIZE + 1}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(HttpStatus.UNPROCESSABLE_ENTITY);

        const suspended = await request(ctx.httpServer)
            .patch(`/api/users/${member.id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ status: UserAccountStatus.SUSPENDED })
            .expect(HttpStatus.OK);
        expect((suspended.body as Envelope<UserData>).data.status).toBe(
            UserAccountStatus.SUSPENDED,
        );

        await request(ctx.httpServer)
            .delete(`/api/users/${member.id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(HttpStatus.OK);
        await request(ctx.httpServer)
            .get(`/api/users/${member.id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(HttpStatus.NOT_FOUND);
    });
});
