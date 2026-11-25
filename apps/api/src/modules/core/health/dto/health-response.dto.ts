import { ApiProperty } from '@nestjs/swagger';
import { HealthStatus } from '../../../../common/enums/health.js';

export class HealthResponseDto {
  @ApiProperty({ enum: HealthStatus, enumName: 'HealthStatus' })
  status!: HealthStatus;
}
