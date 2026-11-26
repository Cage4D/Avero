import { HttpStatus, ParseUUIDPipe } from '@nestjs/common';

export const uuidPipe = new ParseUUIDPipe({
    errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
});
