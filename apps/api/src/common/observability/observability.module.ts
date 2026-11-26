import { Global, Module } from '@nestjs/common';
import { ObservabilityLoggerModule } from './logger.module';
import { MetricsService } from './metrics.service';
import { ReadinessService } from './readiness.service';

@Global()
@Module({
    imports: [ObservabilityLoggerModule],
    providers: [MetricsService, ReadinessService],
    exports: [MetricsService, ReadinessService],
})
export class ObservabilityModule {}
