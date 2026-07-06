import 'reflect-metadata';
import './env.js';
import { NestExpressApplication } from '@nestjs/platform-express';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { apiStaticUploadsPath } from './paths.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors();
  app.useStaticAssets(apiStaticUploadsPath('song-seeds'), { prefix: '/song-seeds' });
  app.useStaticAssets(apiStaticUploadsPath('reference-melodies'), { prefix: '/reference-melodies' });
  await app.listen(process.env.PORT ? Number(process.env.PORT) : 3000, '0.0.0.0');
}

void bootstrap();
