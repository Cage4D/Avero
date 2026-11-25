import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './common/config/env.validation.js';
import { PrismaModule } from './common/database/prisma.module.js';
import { RepoModule } from './common/repos/repo.module.js';
import { AuthModule } from './modules/core/auth/auth.module.js';
import { HealthModule } from './modules/core/health/health.module.js';
import { StatsModule } from './modules/core/stats/stats.module.js';
import { UsersModule } from './modules/core/users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    PrismaModule,
    RepoModule,
    AuthModule,
    UsersModule,
    HealthModule,
    StatsModule,
  ],
})
export class AppModule {}
