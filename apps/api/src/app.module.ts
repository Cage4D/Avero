import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller.js';
import { ModelsModule } from './models/models.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [PrismaModule, ModelsModule],
  controllers: [HealthController],
})
export class AppModule {}
