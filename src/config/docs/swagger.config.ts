import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export const setupSwagger = (app: INestApplication) => {
  // TODO: Add more details to the swagger documentation, like version, contact, etc.
  const swaggerConfig = new DocumentBuilder().setTitle('API').setDescription('API documentation').build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);
};
