import { randomUUID } from 'node:crypto';
import { HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { UserRole } from 'generated/prisma/enums';
import { PasswordUtil } from '@lib/password';
import {
    ADMIN_ONLY_FIELDS,
    OWN_PROFILE_ONLY,
    PASSWORD_MAX_LENGTH,
    USER_EXISTS,
} from '@common/enums/auth';
import { MAX_PAGE_SIZE } from '@common/enums/page';
import { bootTestApp, type TestAppContext } from '../apitest';

interface Envelope<T> {
    statusCode: number;
    message: string;
    data: T;
    timestamp: string;
}

interface AuthData {
    user: { id: string; name: string; email: string; role: UserRole };
    accessToken: string;
}

interface UserData {
    id: string;
    fullName: string;
    email: string;
    role: UserRole;
    status: string;
}

const SECRET = 'correct-horse-battery';

describe('API HTTP pipeline (e2e)', () => {
    let ctx: TestAppContext;
    let adminToken: string;

    beforeAll(async () => {
        ctx = await bootTestApp({ inMemory: true });
        const hash = await PasswordUtil.hash(SECRET);
        ctx.userRepo?.seed({
            fullName: 'Grace Hopper',
            email: 'admin@example.com',
            passwordHash: hash,
            role: UserRole.ADMIN,
        });

        const loginRes = await request(ctx.httpServer)
            .post('/api/auth/login')
            .send({ email: 'admin@example.com', password: SECRET })
            .expect(HttpStatus.OK);
        adminToken = (loginRes.body as Envelope<AuthData>).data.accessToken;
    });

    afterAll(async () => {
        await ctx?.close();
    });

    it('wraps GET /api/health in the standard response envelope', async () => {
        const res = await request(ctx.httpServer)
            .get('/api/health')
            .expect(HttpStatus.OK);
        const body = res.body as Envelope<{ status: string }>;

        expect(body.statusCode).toBe(HttpStatus.OK);
        expect(body.message).toBe('Success');
        expect(body.data).toEqual({ status: 'ok' });
        expect(typeof body.timestamp).toBe('string');
    });

    it('registers, rejects duplicates with 409, and enforces password bounds with 422', async () => {
        const payload = {
            fullName: 'Ada Lovelace',
            email: 'ada@example.com',
            password: SECRET,
        };

        const created = await request(ctx.httpServer)
            .post('/api/auth/register')
            .send(payload)
            .expect(HttpStatus.CREATED);
        const token = (created.body as Envelope<AuthData>).data.accessToken;

        const dup = await request(ctx.httpServer)
            .post('/api/auth/register')
            .send(payload)
            .expect(HttpStatus.CONFLICT);
        expect((dup.body as { message: string }).message).toBe(USER_EXISTS);

        await request(ctx.httpServer)
            .post('/api/auth/register')
            .send({
                ...payload,
                email: 'long@example.com',
                password: 'x'.repeat(PASSWORD_MAX_LENGTH + 1),
            })
            .expect(HttpStatus.UNPROCESSABLE_ENTITY);

        const me = await request(ctx.httpServer)
            .get('/api/users/me')
            .set('Authorization', `Bearer ${token}`)
            .expect(HttpStatus.OK);
        expect((me.body as Envelope<UserData>).data.email).toBe(
            'ada@example.com',
        );
    });

    it('validates UUID path params, enforces RBAC, and paginates users', async () => {
        await request(ctx.httpServer)
            .get('/api/users/not-a-uuid')
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(HttpStatus.UNPROCESSABLE_ENTITY);

        await request(ctx.httpServer)
            .get(`/api/users/${randomUUID()}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(HttpStatus.NOT_FOUND);

        await request(ctx.httpServer)
            .get(`/api/users?limit=${MAX_PAGE_SIZE + 1}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(HttpStatus.UNPROCESSABLE_ENTITY);

        const page1 = await request(ctx.httpServer)
            .get('/api/users?limit=1&offset=0')
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(HttpStatus.OK);
        const page2 = await request(ctx.httpServer)
            .get('/api/users?limit=1&offset=1')
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(HttpStatus.OK);

        const first = (page1.body as Envelope<UserData[]>).data;
        const second = (page2.body as Envelope<UserData[]>).data;
        expect(first).toHaveLength(1);
        expect(second).toHaveLength(1);
        expect(first[0].id).not.toBe(second[0].id);
    });

    it('enforces self-only and admin-only field restrictions on PATCH /api/users/:id', async () => {
        const reg = await request(ctx.httpServer)
            .post('/api/auth/register')
            .send({
                fullName: 'Alan Turing',
                email: 'alan@example.com',
                password: SECRET,
            })
            .expect(HttpStatus.CREATED);
        const { user, accessToken } = (reg.body as Envelope<AuthData>).data;

        const promote = await request(ctx.httpServer)
            .patch(`/api/users/${user.id}`)
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ role: UserRole.ADMIN })
            .expect(HttpStatus.FORBIDDEN);
        expect((promote.body as { message: string }).message).toBe(
            ADMIN_ONLY_FIELDS,
        );

        const editOther = await request(ctx.httpServer)
            .patch(`/api/users/${randomUUID()}`)
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ bio: 'nope' })
            .expect(HttpStatus.FORBIDDEN);
        expect((editOther.body as { message: string }).message).toBe(
            OWN_PROFILE_ONLY,
        );

        await request(ctx.httpServer)
            .patch(`/api/users/${user.id}`)
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ bio: 'Mathematician' })
            .expect(HttpStatus.OK);

        await request(ctx.httpServer)
            .get('/api/users')
            .set('Authorization', `Bearer ${accessToken}`)
            .expect(HttpStatus.FORBIDDEN);
    });

    it('serves admin stats endpoints', async () => {
        const total = await request(ctx.httpServer)
            .get('/api/stats/users/total?period=month')
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(HttpStatus.OK);
        expect(
            (total.body as Envelope<{ total: number }>).data.total,
        ).toBeGreaterThanOrEqual(2);

        const series = await request(ctx.httpServer)
            .get('/api/stats/users/series?period=day')
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(HttpStatus.OK);
        expect(
            (series.body as Envelope<{ points: unknown[] }>).data.points,
        ).toHaveLength(7);
    });
});
