import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@common/enums/page';

export class PageQueryDto {
    @ApiProperty({
        required: false,
        type: 'integer',
        minimum: 1,
        maximum: MAX_PAGE_SIZE,
        default: DEFAULT_PAGE_SIZE,
        description: 'How many items to return.',
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(MAX_PAGE_SIZE)
    limit: number = DEFAULT_PAGE_SIZE;

    @ApiProperty({
        required: false,
        type: 'integer',
        minimum: 0,
        default: 0,
        description: 'How many items to skip before the page starts.',
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    offset: number = 0;
}
