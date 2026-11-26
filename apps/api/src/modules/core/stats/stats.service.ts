import { Injectable } from '@nestjs/common';
import { UserRepo } from '@common/repos/user.repo';
import { CacheService } from '@common/cache/cache.service';
import {
    STATS_CACHE_TTL_SECONDS,
    STATS_CACHE_VERSION_KEY,
} from '@common/enums/cache';
import { SERIES_LENGTH } from '@common/enums/period';
import { countByKey, periodRange, periodSeries } from '@lib/period';
import {
    SeriesQueryDto,
    TotalQueryDto,
    PeriodSeriesResponseDto,
    PeriodTotalResponseDto,
} from './dto';

@Injectable()
export class StatsService {
    constructor(
        private readonly userRepo: UserRepo,
        private readonly cache: CacheService,
    ) {}

    async usersTotal({
        period,
        date,
    }: TotalQueryDto): Promise<PeriodTotalResponseDto> {
        const { start, end } = periodRange(
            period,
            date ? new Date(date) : new Date(),
        );
        const version = await this.cache.getCounter(STATS_CACHE_VERSION_KEY);
        const key = `stats:users:v${version}:total:${period}:${start.toISOString()}`;
        const cached = await this.cache.getJson<PeriodTotalResponseDto>(key);
        if (cached) return cached;

        const total = await this.userRepo.count({
            where: { createdAt: { gte: start, lt: end } },
        });

        const response: PeriodTotalResponseDto = {
            period,
            start: start.toISOString(),
            end: end.toISOString(),
            total,
        };
        await this.cache.setJson(key, response, STATS_CACHE_TTL_SECONDS);
        return response;
    }

    async usersSeries({
        period,
    }: SeriesQueryDto): Promise<PeriodSeriesResponseDto> {
        const { start, end, keys } = periodSeries(
            period,
            SERIES_LENGTH[period],
            new Date(),
        );
        const version = await this.cache.getCounter(STATS_CACHE_VERSION_KEY);
        const key = `stats:users:v${version}:series:${period}:${start.toISOString()}`;
        const cached = await this.cache.getJson<PeriodSeriesResponseDto>(key);
        if (cached) return cached;

        const rows = await this.userRepo.findMany({
            where: { createdAt: { gte: start, lt: end } },
            select: { createdAt: true },
        });
        const counts = countByKey(
            period,
            keys,
            rows.map((row) => row.createdAt),
        );

        const response: PeriodSeriesResponseDto = {
            period,
            start: start.toISOString(),
            end: end.toISOString(),
            points: [...counts].map(([pointKey, value]) => ({
                key: pointKey,
                value,
            })),
        };
        await this.cache.setJson(key, response, STATS_CACHE_TTL_SECONDS);
        return response;
    }
}
