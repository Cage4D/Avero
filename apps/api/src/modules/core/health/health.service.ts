import { Injectable } from '@nestjs/common';
import { HealthStatus } from '../../../common/enums/health.js';
import { HealthResponseDto } from './dto/index.js';

@Injectable()
export class HealthService {
  check(): HealthResponseDto {
    return { status: HealthStatus.OK };
  }
}
