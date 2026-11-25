import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiEnvelope } from '../../../common/decorators/api-envelope.decorator.js';
import { UserRole } from '../../../generated/prisma/enums.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import {
  PeriodSeriesResponseDto,
  PeriodTotalResponseDto,
  SeriesQueryDto,
  TotalQueryDto,
} from './dto/index.js';
import { StatsService } from './stats.service.js';

@ApiTags('stats')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('users/total')
  @ApiOperation({ summary: 'Users created in one day, month or year (Admin only)' })
  @ApiEnvelope(PeriodTotalResponseDto)
  usersTotal(@Query() query: TotalQueryDto) {
    return this.statsService.usersTotal(query);
  }

  @Get('users/series')
  @ApiOperation({
    summary: 'Users created per day, month or year up to the current one (Admin only)',
  })
  @ApiEnvelope(PeriodSeriesResponseDto)
  usersSeries(@Query() query: SeriesQueryDto) {
    return this.statsService.usersSeries(query);
  }
}
