import type { AddressInfo } from 'node:net';
import { HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { REQUEST_ID_HEADER } from '@common/enums/observability';
import {
    closeServer,
    createAdminServer,
    listenServer,
} from '@common/observability/admin-server';
import { bootTestApp, type TestAppContext } from '../apitest';

describe('Observability & rate limiting (e2e)', () => {
    let ctx: TestAppContext;

    beforeAll(async () => {
        ctx = await bootTestApp({
            inMemory: true,
            env: { THROTTLE_LIMIT: '3' },
        });
    });

    afterAll(async () => {
        await ctx?.close();
    });

    it('echoes caller X-Request-ID and generates one when missing', async () => {
        const echoed = await request(ctx.httpServer)
            .get('/api/health')
            .set(REQUEST_ID_HEADER, 'trace-caller-123')
            .expect(HttpStatus.OK);
        expect(echoed.headers['x-request-id']).toBe('trace-caller-123');

        const generated = await request(ctx.httpServer)
            .get('/api/health')
            .expect(HttpStatus.OK);
        expect(generated.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/i);
    });

    it('exposes metrics and readiness on the isolated admin server and enforces 429 limits', async () => {
        await request(ctx.httpServer).get('/api/health').expect(HttpStatus.OK);

        const throttled = await request(ctx.httpServer)
            .get('/api/health')
            .expect(HttpStatus.TOO_MANY_REQUESTS);
        expect(throttled.body).toMatchObject({
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            error: 'Too Many Requests',
        });

        const admin = createAdminServer(ctx.metrics, ctx.readiness);
        await listenServer(admin, 0);
        const { port } = admin.address() as AddressInfo;

        try {
            const metricsRes = await fetch(`http://127.0.0.1:${port}/metrics`);
            const text = await metricsRes.text();
            expect(metricsRes.status).toBe(HttpStatus.OK);
            expect(text).toContain(
                'http_server_requests_total{route="/api/health",method="GET",status="200"}',
            );

            const readyRes = await fetch(`http://127.0.0.1:${port}/ready`);
            expect(readyRes.status).toBe(HttpStatus.OK);
        } finally {
            await closeServer(admin);
        }
    });
});
