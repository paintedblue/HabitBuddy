import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import type { SongGenerationRequest } from '@habit-buddy/shared';
import { SongsService } from './songs.service.js';

@Processor('song-generation')
export class SongsProcessor extends WorkerHost {
  constructor(private readonly songs: SongsService) {
    super();
  }

  async process(job: Job<SongGenerationRequest>) {
    const safePrompt = job.data.prompt.replace(/[^\p{L}\p{N}\s]/gu, '').slice(0, 120);
    const lyrics = [
      '반짝반짝 오늘도',
      safePrompt ? `${safePrompt} 함께해요` : '우리 함께 시작해요',
      '한 걸음씩 씩씩하게',
      '동요 친구와 해냈어요'
    ].join('\n');
    return this.songs.completeGeneration(job.data.id, lyrics);
  }
}
