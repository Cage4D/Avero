import { ApiProperty } from '@nestjs/swagger';

export class ApiErrorDto {
    @ApiProperty({ type: 'integer' })
    statusCode: number;

    @ApiProperty()
    message: string;

    @ApiProperty()
    error: string;

    @ApiProperty({ format: 'date-time' })
    timestamp: string;
}
