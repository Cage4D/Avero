import { ApiProperty } from '@nestjs/swagger';

export enum ModelStatusDto {
  live = 'live',
  teaser = 'teaser',
}

// Types are declared explicitly so the OpenAPI export does not depend on
// emitted decorator metadata.
export class ModelDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String, example: 'gt' })
  code!: string;

  @ApiProperty({ type: String, example: 'AVERO GT' })
  name!: string;

  @ApiProperty({ type: String, nullable: true })
  tagline!: string | null;

  @ApiProperty({ enum: ModelStatusDto, enumName: 'ModelStatus' })
  status!: ModelStatusDto;

  @ApiProperty({ type: Number })
  sortOrder!: number;
}
