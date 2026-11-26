import { createServer, type Server } from 'node:http';
import { HttpStatus } from '@nestjs/common';
import { METRICS_PATH, READY_PATH } from '@common/enums/observability';
import type { MetricsService } from './metrics.service';
import type { ReadinessService } from './readiness.service';

export const createAdminServer = (
    metrics: MetricsService,
    readiness: ReadinessService,
): Server =>
    createServer((req, res) => {
        const pathname = req.url?.split('?')[0];

        if (req.method === 'GET' && pathname === METRICS_PATH) {
            void metrics
                .scrape()
                .then(({ contentType, body }) => {
                    res.writeHead(HttpStatus.OK, {
                        'Content-Type': contentType,
                    });
                    res.end(body);
                })
                .catch(() => {
                    res.writeHead(HttpStatus.INTERNAL_SERVER_ERROR);
                    res.end();
                });
            return;
        }

        if (req.method === 'GET' && pathname === READY_PATH) {
            void readiness
                .check()
                .then((result) => {
                    const status = result.ok
                        ? HttpStatus.OK
                        : HttpStatus.SERVICE_UNAVAILABLE;
                    res.writeHead(status, {
                        'Content-Type': 'application/json',
                    });
                    res.end(
                        JSON.stringify({
                            status: result.ok ? 'ready' : 'not_ready',
                            checks: result.checks,
                        }),
                    );
                })
                .catch(() => {
                    res.writeHead(HttpStatus.SERVICE_UNAVAILABLE);
                    res.end();
                });
            return;
        }

        res.writeHead(HttpStatus.NOT_FOUND);
        res.end();
    });

export const listenServer = (server: Server, port: number): Promise<void> =>
    new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, () => {
            server.off('error', reject);
            resolve();
        });
    });

export const closeServer = (server: Server): Promise<void> =>
    new Promise((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
    });
