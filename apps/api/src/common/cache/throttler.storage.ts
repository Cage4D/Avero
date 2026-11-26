import { Injectable } from '@nestjs/common';
import type { ThrottlerStorage } from '@nestjs/throttler';
import type { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface';
import { CacheService } from './cache.service';

const INCREMENT_SCRIPT = `
local hits = redis.call('INCR', KEYS[1])
if hits == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
local pttl = redis.call('PTTL', KEYS[1])
if pttl < 0 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
  pttl = tonumber(ARGV[1])
end
return {hits, pttl}
`;

interface WindowEntry {
    hits: number;
    expiresAt: number;
}

@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage {
    private readonly memory = new Map<string, WindowEntry>();

    constructor(private readonly cache: CacheService) {}

    async increment(
        key: string,
        ttl: number,
        limit: number,
        blockDuration: number,
        throttlerName: string,
    ): Promise<ThrottlerStorageRecord> {
        const storageKey = `throttle:${throttlerName}:${key}`;
        const redis = this.cache.getRedisClient();

        if (redis) {
            const raw = (await redis.eval(
                INCREMENT_SCRIPT,
                1,
                storageKey,
                ttl,
            )) as [number, number];
            return this.toRecord(raw[0], raw[1], limit, blockDuration);
        }

        const now = Date.now();
        const existing = this.memory.get(storageKey);
        const entry =
            existing && existing.expiresAt > now
                ? { hits: existing.hits + 1, expiresAt: existing.expiresAt }
                : { hits: 1, expiresAt: now + ttl };

        this.memory.set(storageKey, entry);
        return this.toRecord(
            entry.hits,
            Math.max(1, entry.expiresAt - now),
            limit,
            blockDuration,
        );
    }

    private toRecord(
        totalHits: number,
        pttlMs: number,
        limit: number,
        blockDuration: number,
    ): ThrottlerStorageRecord {
        const timeToExpire = Math.ceil(pttlMs / 1000);
        const isBlocked = totalHits > limit;
        const blockMs = blockDuration > 0 ? blockDuration : pttlMs;
        return {
            totalHits,
            timeToExpire,
            isBlocked,
            timeToBlockExpire: isBlocked ? Math.ceil(blockMs / 1000) : 0,
        };
    }
}
