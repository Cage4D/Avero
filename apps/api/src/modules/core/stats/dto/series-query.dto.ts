import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { Period } from '../../../../common/enums/period.js';

export class SeriesQueryDto {
  @ApiProperty({ enum: Period, enumName: 'Period' })
  @IsEnum(Period)
  period!: Period;
}
