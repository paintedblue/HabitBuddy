import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import type { SongGenerationRequest } from '@habit-buddy/shared';
import { SongsService } from './songs.service.js';
import { SunoApiClient, SunoApiError } from './suno-api.client.js';
import { buildSunoExtendInput } from './suno-generation.js';

@Processor('song-generation')
export class SongsProcessor extends WorkerHost {
  constructor(
    private readonly songs: SongsService,
    private readonly suno: SunoApiClient
  ) {
    super();
  }

  async process(job: Job<SongGenerationRequest>) {
    const extendInput = buildSunoExtendInput(job.data);
    if (!extendInput) {
      return await this.songs.failRequest(job.data.id, 'missing_reference_audio', 'A reference audio URL is required for Suno upload-extend generation');
    }

    try {
      const response = await this.suno.uploadAndExtend(extendInput);
      return await this.songs.markGenerating(job.data.id, response.taskId);
    } catch (error) {
      if (error instanceof SunoApiError) {
        return await this.songs.failRequest(job.data.id, error.code, error.message);
      }
      return await this.songs.failRequest(job.data.id, 'suno_request_failed', error instanceof Error ? error.message : 'Suno request failed');
    }
  }
}
