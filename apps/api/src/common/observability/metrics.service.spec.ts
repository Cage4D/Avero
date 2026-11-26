import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
    it('records HTTP request counts and durations in Prometheus format', async () => {
        const service = new MetricsService();
        service.record('/api/users/:id', 'GET', 200, 0.042);

        const { contentType, body } = await service.scrape();

        expect(contentType).toContain('text/plain');
        expect(body).toContain(
            'http_server_requests_total{route="/api/users/:id",method="GET",status="200"} 1',
        );
        expect(body).toContain(
            'http_server_request_duration_seconds_count{route="/api/users/:id",method="GET"} 1',
        );
    });
});
