import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SongsModule } from './songs/songs.module.js';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: Number(process.env.REDIS_PORT ?? 6379)
      }
    }),
    SongsModule
  ]
})
export class AppModule {}
