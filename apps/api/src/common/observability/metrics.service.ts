import { Injectable } from '@nestjs/common';
import {
    Counter,
    Histogram,
    Registry,
    collectDefaultMetrics,
} from 'prom-client';

@Injectable()
export class MetricsService {
    private readonly registry = new Registry();
    private readonly requests: Counter<'route' | 'method' | 'status'>;
    private readonly duration: Histogram<'route' | 'method'>;

    constructor() {
        collectDefaultMetrics({ register: this.registry });
        this.requests = new Counter({
            name: 'http_server_requests_total',
            help: 'HTTP requests served, by route, method and status.',
            labelNames: ['route', 'method', 'status'],
            registers: [this.registry],
        });
        this.duration = new Histogram({
            name: 'http_server_request_duration_seconds',
            help: 'Time taken to serve an HTTP request, by route and method.',
            labelNames: ['route', 'method'],
            registers: [this.registry],
        });
    }

    record(
        route: string,
        method: string,
        status: number,
        durationSeconds: number,
    ): void {
        this.requests.inc({ route, method, status: String(status) });
        this.duration.observe({ route, method }, durationSeconds);
    }

    async scrape(): Promise<{ contentType: string; body: string }> {
        return {
            contentType: this.registry.contentType,
            body: await this.registry.metrics(),
        };
    }
}
