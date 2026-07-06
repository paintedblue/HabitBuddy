import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SongsModule } from './songs/songs.module.js';
import { AppController } from './app.controller.js';

function redisConnection() {
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    const url = new URL(redisUrl);
    return {
      host: url.hostname,
      port: Number(url.port || 6379),
      username: url.username || undefined,
      password: url.password ? decodeURIComponent(url.password) : undefined,
      tls: url.protocol === 'rediss:' ? {} : undefined
    };
  }

  return {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number(process.env.REDIS_PORT ?? 6379)
  };
}

@Module({
  imports: [
    BullModule.forRoot({
      connection: redisConnection()
    }),
    SongsModule
  ],
  controllers: [AppController]
})
export class AppModule {}
