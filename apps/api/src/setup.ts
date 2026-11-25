import { INestApplication, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter.js";
import { ResponseInterceptor } from "./common/interceptors/response.interceptor.js";

export const API_PREFIX = "api/v1";

export const DOCS_PATH = `${API_PREFIX}/docs`;

const swaggerConfig = new DocumentBuilder()
  .setTitle("AVERO API")
  .setDescription("Public API for the AVERO website")
  .setVersion("1.0.0")
  .addBearerAuth()
  .build();

/** Shared app configuration, used by main.ts and the e2e tests. */
export function configureApp(app: INestApplication): void {
  const config = app.get(ConfigService);

  app.setGlobalPrefix(API_PREFIX);
  app.use(helmet());
  app.enableCors({
    origin: config.getOrThrow<string[]>("CORS_ORIGINS"),
    credentials: true,
    method: ["GET", "POST", "PUT", "PATCH", "OPTIONS"],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());
}

export function createOpenApiDocument(app: INestApplication): OpenAPIObject {
  return SwaggerModule.createDocument(app, swaggerConfig);
}
