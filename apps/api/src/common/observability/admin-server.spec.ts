import type { AddressInfo } from 'node:net';
import { HttpStatus } from '@nestjs/common';
import type { PrismaService } from '@common/database/prisma.service';
import { MetricsService } from './metrics.service';
import { ReadinessService } from './readiness.service';
import { closeServer, createAdminServer, listenServer } from './admin-server';

describe('admin server', () => {
    it('serves Prometheus metrics on /metrics and readiness on /ready', async () => {
        const prisma = {
            $queryRaw: jest.fn().mockResolvedValue([1]),
        } as unknown as PrismaService;
        const metrics = new MetricsService();
        metrics.record('/api/health', 'GET', 200, 0.005);
        const readiness = new ReadinessService(prisma);

        const server = createAdminServer(metrics, readiness);
        await listenServer(server, 0);
        const { port } = server.address() as AddressInfo;

        try {
            const metricsRes = await fetch(`http://127.0.0.1:${port}/metrics`);
            expect(metricsRes.status).toBe(HttpStatus.OK);
            expect(await metricsRes.text()).toContain(
                'http_server_requests_total',
            );

            const readyRes = await fetch(`http://127.0.0.1:${port}/ready`);
            expect(readyRes.status).toBe(HttpStatus.OK);
            expect(await readyRes.json()).toEqual({
                status: 'ready',
                checks: { postgres: 'ok' },
            });

            const missingRes = await fetch(`http://127.0.0.1:${port}/unknown`);
            expect(missingRes.status).toBe(HttpStatus.NOT_FOUND);
        } finally {
            await closeServer(server);
        }
    });

    it('returns 503 when a readiness probe fails', async () => {
        const prisma = {
            $queryRaw: jest.fn().mockRejectedValue(new Error('db down')),
        } as unknown as PrismaService;
        const server = createAdminServer(
            new MetricsService(),
            new ReadinessService(prisma),
        );
        await listenServer(server, 0);
        const { port } = server.address() as AddressInfo;

        try {
            const readyRes = await fetch(`http://127.0.0.1:${port}/ready`);
            expect(readyRes.status).toBe(HttpStatus.SERVICE_UNAVAILABLE);
            expect(await readyRes.json()).toEqual({
                status: 'not_ready',
                checks: { postgres: 'error' },
            });
        } finally {
            await closeServer(server);
        }
    });
});
