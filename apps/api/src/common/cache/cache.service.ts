import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { ReadinessService } from '@common/observability/readiness.service';

interface MemoryEntry {
    value: string;
    expiresAt: number | null;
}

@Injectable()
export class CacheService implements OnModuleDestroy {
    private readonly logger = new Logger(CacheService.name);
    private readonly redis: Redis | null;
    private readonly memory = new Map<string, MemoryEntry>();

    constructor(config: ConfigService, readiness: ReadinessService) {
        const redisUrl = config.get<string>('REDIS_URL');
        if (redisUrl) {
            this.redis = new Redis(redisUrl, {
                maxRetriesPerRequest: 2,
                enableReadyCheck: true,
            });
            this.redis.on('error', (err: Error) => {
                this.logger.warn(`Redis error: ${err.message}`);
            });
            readiness.register('redis', async () => {
                await this.redis?.ping();
            });
        } else {
            this.redis = null;
        }
    }

    getRedisClient(): Redis | null {
        return this.redis;
    }

    async getJson<T>(key: string): Promise<T | null> {
        const raw = await this.getRaw(key);
        if (raw === null) return null;
        try {
            return JSON.parse(raw) as T;
        } catch {
            return null;
        }
    }

    async setJson<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
        const serialized = JSON.stringify(value);
        if (this.redis) {
            await this.redis.set(key, serialized, 'EX', ttlSeconds);
            return;
        }
        this.memory.set(key, {
            value: serialized,
            expiresAt: Date.now() + ttlSeconds * 1000,
        });
    }

    async getCounter(key: string): Promise<number> {
        const raw = await this.getRaw(key);
        const parsed = raw ? Number.parseInt(raw, 10) : 0;
        return Number.isNaN(parsed) ? 0 : parsed;
    }

    async incr(key: string): Promise<number> {
        if (this.redis) {
            return this.redis.incr(key);
        }
        const next = (await this.getCounter(key)) + 1;
        this.memory.set(key, { value: String(next), expiresAt: null });
        return next;
    }

    async onModuleDestroy(): Promise<void> {
        if (this.redis) {
            await this.redis.quit();
        }
        this.memory.clear();
    }

    private async getRaw(key: string): Promise<string | null> {
        if (this.redis) {
            return this.redis.get(key);
        }
        const entry = this.memory.get(key);
        if (!entry) return null;
        if (entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
            this.memory.delete(key);
            return null;
        }
        return entry.value;
    }
}
