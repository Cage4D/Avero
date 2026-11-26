import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from '@core/auth/auth.module';
import { UsersModule } from '@core/users/users.module';
import { StatsModule } from '@core/stats/stats.module';
import { HealthModule } from '@core/health/health.module';
import { RepoModule } from '@common/repos/repo.module';
import { PrismaModule } from '@common/database/prisma.module';
import { ObservabilityModule } from '@common/observability/observability.module';
import { CacheModule } from '@common/cache/cache.module';
import { RedisThrottlerStorage } from '@common/cache/throttler.storage';
import { THROTTLE_TTL_MS } from '@common/enums/cache';
import { validateEnv } from '@common/config/env.validation';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            ignoreEnvFile: process.env.NODE_ENV === 'test',
            validate: validateEnv,
        }),
        PrismaModule,
        ObservabilityModule,
        CacheModule,
        ThrottlerModule.forRootAsync({
            inject: [ConfigService, RedisThrottlerStorage],
            useFactory: (
                config: ConfigService,
                storage: RedisThrottlerStorage,
            ) => ({
                throttlers: [
                    {
                        name: 'default',
                        ttl: THROTTLE_TTL_MS,
                        limit: config.getOrThrow<number>('THROTTLE_LIMIT'),
                    },
                ],
                storage,
            }),
        }),
        RepoModule,
        AuthModule,
        UsersModule,
        HealthModule,
        StatsModule,
    ],
    providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
