import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiEnvelope } from '../../../common/decorators/api-envelope.decorator.js';
import { HealthResponseDto } from './dto/index.js';
import { HealthService } from './health.service.js';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Report that the API is up' })
  @ApiEnvelope(HealthResponseDto)
  check() {
    return this.healthService.check();
  }
}
