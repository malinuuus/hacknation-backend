import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApp } from './config/app/app.config.js';
import { EnvironmentVariables } from './config/environment/environment-variables.validation.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);

  const configService = app.get(ConfigService);
  const port = configService.getOrThrow<EnvironmentVariables['PORT']>('PORT');

  await app.listen(port);
}
await bootstrap();
