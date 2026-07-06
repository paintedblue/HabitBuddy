import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { melodyPresetById, type SongGenerationRequest } from '@habit-buddy/shared';
import { SongsService } from './songs.service.js';
import { SunoApiClient, SunoApiError } from './suno-api.client.js';

@Processor('song-generation')
export class SongsProcessor extends WorkerHost {
  constructor(
    private readonly songs: SongsService,
    private readonly suno: SunoApiClient
  ) {
    super();
  }

  async process(job: Job<SongGenerationRequest>) {
    const referenceAudioUrl = job.data.inputs?.referenceAudioUrl;
    if (!referenceAudioUrl) {
      return await this.songs.failRequest(job.data.id, 'missing_reference_audio', 'A reference audio URL is required for Suno upload-extend generation');
    }

    const melody = melodyPresetById(job.data.inputs?.melodyPresetId);
    const title = `${job.data.inputs?.childName || '친구'}의 ${job.data.inputs?.dislikedHabit || job.data.habitId} ${melody.label}`.slice(0, 80);

    try {
      const response = await this.suno.uploadAndExtend({
        uploadUrl: referenceAudioUrl,
        prompt: job.data.prompt,
        style: melody.prompt,
        title,
        continueAt: job.data.inputs?.sunoContinueAtSeconds ?? job.data.inputs?.referenceAudioDurationSeconds
      });
      return await this.songs.markGenerating(job.data.id, response.taskId);
    } catch (error) {
      if (error instanceof SunoApiError) {
        return await this.songs.failRequest(job.data.id, error.code, error.message);
      }
      return await this.songs.failRequest(job.data.id, 'suno_request_failed', error instanceof Error ? error.message : 'Suno request failed');
    }
  }
}
