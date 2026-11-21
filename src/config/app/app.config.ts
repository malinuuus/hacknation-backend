import { BadRequestException, INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { setupSwagger } from '../docs/swagger.config.js';
import { EnvironmentVariables } from '../environment/environment-variables.validation.js';
import { NodeEnv } from '../environment/environment.enum.js';

export const configureApp = (app: INestApplication) => {
  app.enableCors({ exposedHeaders: ['Content-Disposition'] });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      exceptionFactory: (errors) => new BadRequestException(errors),
    }),
  );

  const configService = app.get(ConfigService);
  const nodeEnv = configService.getOrThrow<EnvironmentVariables['NODE_ENV']>('NODE_ENV');

  if (nodeEnv === NodeEnv.Development) {
    setupSwagger(app);
  }

  app.enableShutdownHooks();
};
