import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { SongsController } from './songs.controller.js';
import { SongsService } from './songs.service.js';
import { SongsProcessor } from './songs.processor.js';
import { SunoApiClient } from './suno-api.client.js';
import { OpenAiLyricsClient } from './openai-lyrics.client.js';
import { SongsRepository } from './songs.repository.js';
import { AudioStorageService } from './audio-storage.service.js';

@Module({
  imports: [BullModule.registerQueue({ name: 'song-generation' })],
  controllers: [SongsController],
  providers: [SongsService, SongsRepository, SongsProcessor, SunoApiClient, OpenAiLyricsClient, AudioStorageService]
})
export class SongsModule {}
