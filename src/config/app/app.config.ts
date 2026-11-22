import { BadRequestException, INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import { setupSwagger } from '../docs/swagger.config.js';
import { EnvironmentVariables } from '../environment/environment-variables.validation.js';
import { NodeEnv } from '../environment/environment.enum.js';
import { originCheckMiddleware } from './origin-check.middleware.js';

export const configureApp = (app: INestApplication) => {
  const configService = app.get(ConfigService);
  const corsOrigins = configService.getOrThrow<EnvironmentVariables['CORS_ORIGINS']>('CORS_ORIGINS');

  app.enableCors({ origin: corsOrigins, credentials: true, exposedHeaders: ['Content-Disposition'] });
  app.use(originCheckMiddleware(corsOrigins));
  app.use(cookieParser());
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      exceptionFactory: (errors) => new BadRequestException(errors),
    }),
  );

  const nodeEnv = configService.getOrThrow<EnvironmentVariables['NODE_ENV']>('NODE_ENV');

  if (nodeEnv === NodeEnv.Development) {
    setupSwagger(app);
  }

  app.enableShutdownHooks();
};
