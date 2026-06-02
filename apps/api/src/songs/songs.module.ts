import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { SongsController } from './songs.controller.js';
import { SongsService } from './songs.service.js';
import { SongsProcessor } from './songs.processor.js';

@Module({
  imports: [BullModule.registerQueue({ name: 'song-generation' })],
  controllers: [SongsController],
  providers: [SongsService, SongsProcessor]
})
export class SongsModule {}
