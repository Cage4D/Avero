import { Period } from '@common/enums/period';
import { STATS_CACHE_VERSION_KEY } from '@common/enums/cache';
import { CacheService } from '@common/cache/cache.service';
import type { ConfigService } from '@nestjs/config';
import type { ReadinessService } from '@common/observability/readiness.service';
import { StatsService } from './stats.service';
import type { UserRepo } from '@common/repos/user.repo';

const NOW = new Date('2026-09-22T08:17:00.000Z');

const createCache = () =>
    new CacheService(
        {
            get: jest.fn().mockReturnValue(undefined),
        } as unknown as ConfigService,
        { register: jest.fn() } as unknown as ReadinessService,
    );

const repoWith = (createdAt: Date[]) => {
    const count = jest.fn().mockResolvedValue(createdAt.length);
    const findMany = jest
        .fn()
        .mockResolvedValue(createdAt.map((date) => ({ createdAt: date })));
    const repo = { count, findMany } as Pick<UserRepo, 'count' | 'findMany'>;
    const cache = createCache();
    return {
        service: new StatsService(repo as UserRepo, cache),
        count,
        findMany,
        cache,
    };
};

describe('StatsService', () => {
    beforeAll(() => {
        jest.useFakeTimers({ now: NOW });
    });

    afterAll(() => {
        jest.useRealTimers();
    });

    it('counts one calendar month, end-exclusive', async () => {
        const { service, count } = repoWith([]);
        const result = await service.usersTotal({ period: Period.MONTH });

        expect(count).toHaveBeenCalledWith({
            where: {
                createdAt: {
                    gte: new Date('2026-09-01T00:00:00.000Z'),
                    lt: new Date('2026-10-01T00:00:00.000Z'),
                },
            },
        });
        expect(result.start).toBe('2026-09-01T00:00:00.000Z');
        expect(result.end).toBe('2026-10-01T00:00:00.000Z');
    });

    it('counts the period that contains a supplied date', async () => {
        const { service } = repoWith([]);
        const result = await service.usersTotal({
            period: Period.YEAR,
            date: '2024-03-15',
        });

        expect(result.start).toBe('2024-01-01T00:00:00.000Z');
        expect(result.end).toBe('2025-01-01T00:00:00.000Z');
    });

    it('returns one point per day, zero-filled, oldest first', async () => {
        const { service } = repoWith([
            new Date('2026-09-22T01:00:00.000Z'),
            new Date('2026-09-22T05:00:00.000Z'),
            new Date('2026-09-18T12:00:00.000Z'),
        ]);
        const { points } = await service.usersSeries({ period: Period.DAY });

        expect(points).toHaveLength(7);
        expect(points[0]).toEqual({ key: '2026-09-16', value: 0 });
        expect(points[2]).toEqual({ key: '2026-09-18', value: 1 });
        expect(points[6]).toEqual({ key: '2026-09-22', value: 2 });
    });

    it('serves repeated queries from cache and invalidates when version bumps', async () => {
        const { service, findMany, cache } = repoWith([
            new Date('2026-09-22T01:00:00.000Z'),
        ]);

        await service.usersSeries({ period: Period.DAY });
        await service.usersSeries({ period: Period.DAY });
        expect(findMany).toHaveBeenCalledTimes(1);

        await cache.incr(STATS_CACHE_VERSION_KEY);
        await service.usersSeries({ period: Period.DAY });
        expect(findMany).toHaveBeenCalledTimes(2);
    });
});
