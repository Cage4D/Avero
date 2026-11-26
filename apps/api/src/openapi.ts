import { DocumentBuilder, SwaggerDocumentOptions } from '@nestjs/swagger';
import { ApiErrorDto } from '@common/dto';

export const API_PREFIX = 'api';

export const DOCS_PATH = `${API_PREFIX}/docs`;

export const swaggerConfig = new DocumentBuilder()
    .setTitle('API')
    .setDescription('Backend REST API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

export const documentOptions: SwaggerDocumentOptions = {
    extraModels: [ApiErrorDto],
};
