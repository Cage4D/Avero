import type { ConfigService } from '@nestjs/config';
import type { ReadinessService } from '@common/observability/readiness.service';
import { CacheService } from './cache.service';

const createMemoryCache = () => {
    const config = {
        get: jest.fn().mockReturnValue(undefined),
    } as unknown as ConfigService;
    const register = jest.fn();
    const readiness = { register } as unknown as ReadinessService;
    return { cache: new CacheService(config, readiness), register };
};

describe('CacheService (in-memory fallback)', () => {
    it('stores and retrieves JSON values until TTL expires', async () => {
        jest.useFakeTimers({ now: new Date('2026-01-01T00:00:00.000Z') });
        try {
            const { cache, register } = createMemoryCache();

            expect(register).not.toHaveBeenCalled();
            expect(await cache.getJson('missing')).toBeNull();

            await cache.setJson('stats:1', { total: 42 }, 10);
            expect(await cache.getJson<{ total: number }>('stats:1')).toEqual({
                total: 42,
            });

            jest.advanceTimersByTime(10_001);
            expect(await cache.getJson('stats:1')).toBeNull();
        } finally {
            jest.useRealTimers();
        }
    });

    it('tracks monotonic counters for versioned invalidation', async () => {
        const { cache } = createMemoryCache();

        expect(await cache.getCounter('stats:version')).toBe(0);
        expect(await cache.incr('stats:version')).toBe(1);
        expect(await cache.incr('stats:version')).toBe(2);
        expect(await cache.getCounter('stats:version')).toBe(2);
    });
});
