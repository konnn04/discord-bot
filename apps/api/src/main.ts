import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { join } from 'path';
import { existsSync } from 'fs';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Global API prefix
  app.setGlobalPrefix('api');

  // CORS
  app.enableCors({ origin: true, credentials: true });

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );

  // Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('Discord Bot API')
    .setDescription('The Discord Bot backend API')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Serve web build in production
  if (process.env.NODE_ENV === 'production') {
    const webDistPath = join(__dirname, '..', '..', 'web', 'dist');
    if (existsSync(webDistPath)) {
      app.useStaticAssets(webDistPath);
    }
  }

  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 API server running on port ${port}`);
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
