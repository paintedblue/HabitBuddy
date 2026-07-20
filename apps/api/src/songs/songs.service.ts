import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Queue } from 'bullmq';
import type { GeneratedSong, SongGenerationInputs, SongGenerationRequest } from '@habit-buddy/shared';
import type { SunoTrack } from './suno-api.client.js';
import { SunoApiClient, SunoApiError } from './suno-api.client.js';
import { buildSunoExtendInput } from './suno-generation.js';
import { SongsRepository } from './songs.repository.js';
import { AudioStorageService } from './audio-storage.service.js';

@Injectable()
export class SongsService {
  private readonly logger = new Logger(SongsService.name);

  constructor(
    @InjectQueue('song-generation') private readonly queue: Queue,
    private readonly repository: SongsRepository,
    private readonly suno: SunoApiClient,
    private readonly audioStorage: AudioStorageService
  ) {}

  async createRequest(input: { childId: string; habitId: string; prompt: string; inputs?: SongGenerationInputs }): Promise<SongGenerationRequest> {
    const id = `req-${Date.now()}`;
    const request: SongGenerationRequest = {
      id,
      childId: input.childId,
      habitId: input.habitId,
      prompt: input.prompt,
      inputs: input.inputs,
      provider: 'sunoapi',
      status: 'queued',
      createdAt: new Date().toISOString()
    };
    await this.repository.createRequest(request);
    return this.startSunoGeneration(request);
  }

  async enqueueRequest(input: { childId: string; habitId: string; prompt: string; inputs?: SongGenerationInputs }): Promise<SongGenerationRequest> {
    const id = `req-${Date.now()}`;
    const request: SongGenerationRequest = {
      id,
      childId: input.childId,
      habitId: input.habitId,
      prompt: input.prompt,
      inputs: input.inputs,
      provider: 'sunoapi',
      status: 'queued',
      createdAt: new Date().toISOString()
    };
    await this.repository.createRequest(request);
    await this.queue.add('generate-song', request);
    return request;
  }

  async startSunoGeneration(request: SongGenerationRequest) {
    const extendInput = buildSunoExtendInput(request);
    if (!extendInput) {
      return this.failRequest(request.id, 'missing_reference_audio', 'A reference audio URL is required for Suno upload-extend generation');
    }

    try {
      this.logger.log(`Starting Suno upload-extend for request ${request.id}`);
      const response = await this.suno.uploadAndExtend(extendInput);
      this.logger.log(`Suno upload-extend accepted request ${request.id} as task ${response.taskId}`);
      return this.markGenerating(request.id, response.taskId);
    } catch (error) {
      if (error instanceof SunoApiError) {
        this.logger.warn(`Suno upload-extend failed for request ${request.id}: ${error.code} ${error.message}`);
        return this.failRequest(request.id, error.code, error.message);
      }
      const message = error instanceof Error ? error.message : 'Suno request failed';
      this.logger.warn(`Suno upload-extend failed for request ${request.id}: ${message}`);
      return this.failRequest(request.id, 'suno_request_failed', message);
    }
  }

  async getRequest(id: string) {
    const request = await this.repository.getRequest(id);
    if (!request) throw new NotFoundException();
    return request;
  }

  async findRequestByExternalTaskId(taskId: string) {
    return this.repository.findRequestByExternalTaskId(taskId);
  }

  async markGenerating(requestId: string, externalTaskId: string) {
    const request = await this.getRequest(requestId);
    request.status = 'generating';
    request.externalTaskId = externalTaskId;
    request.provider = 'sunoapi';
    request.errorCode = undefined;
    request.errorMessage = undefined;
    return (await this.repository.updateRequest(request)) ?? request;
  }

  async failRequest(requestId: string, code: string, message: string) {
    const request = await this.getRequest(requestId);
    request.status = 'failed';
    request.errorCode = code;
    request.errorMessage = message;
    return (await this.repository.updateRequest(request)) ?? request;
  }

  async completeGeneration(requestId: string, lyrics: string) {
    const request = await this.getRequest(requestId);
    request.status = 'pending_approval';
    await this.repository.updateRequest(request);
    const song: GeneratedSong = {
      id: `song-${requestId}`,
      requestId,
      title: '나만의 동요',
      lyrics,
      status: 'pending_approval'
    };
    return this.repository.saveSong(song);
  }

  async completeSunoGeneration(requestId: string, track: SunoTrack) {
    const request = await this.getRequest(requestId);
    const lyrics = track.prompt ?? request.prompt;
    const sunoAudioUrl = track.audioUrl ?? track.audio_url;
    const sunoStreamAudioUrl = track.streamAudioUrl ?? track.stream_audio_url;
    const sunoSourceAudioUrl = track.sourceAudioUrl ?? track.source_audio_url;
    let persistedAudioUrl: string;
    try {
      persistedAudioUrl = await this.audioStorage.persistGeneratedAudio({
        requestId,
        externalSongId: track.id,
        title: track.title,
        sourceUrls: [sunoSourceAudioUrl, sunoAudioUrl, sunoStreamAudioUrl]
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Generated audio upload failed';
      this.logger.warn(`Failed to persist generated audio for request ${requestId}: ${message}`);
      await this.failRequest(requestId, 'audio_upload_failed', message);
      throw error;
    }

    request.status = 'approved';
    await this.repository.updateRequest(request);
    const song: GeneratedSong = {
      id: `song-${track.id ?? requestId}`,
      requestId,
      title: track.title ?? '나만의 동요',
      lyrics,
      audioUrl: persistedAudioUrl,
      streamAudioUrl: sunoStreamAudioUrl,
      sourceAudioUrl: sunoSourceAudioUrl ?? sunoAudioUrl,
      imageUrl: track.imageUrl ?? track.image_url,
      externalSongId: track.id,
      provider: 'sunoapi',
      durationSeconds: track.duration,
      melodyPresetId: request.inputs?.melodyPresetId,
      rhythmPresetId: request.inputs?.rhythmPresetId,
      instrumentPresetId: request.inputs?.instrumentPresetId,
      generationMode: request.inputs?.generationMode,
      referenceAudioUrl: request.inputs?.referenceAudioUrl,
      referenceAudioFileName: request.inputs?.referenceAudioFileName,
      referenceAudioDurationSeconds: request.inputs?.referenceAudioDurationSeconds,
      sunoContinueAtSeconds: request.inputs?.sunoContinueAtSeconds,
      modelName: track.modelName ?? track.model_name,
      status: 'approved'
    };
    return this.repository.saveSong(song);
  }

  listPending() {
    return this.repository.listPendingSongs();
  }

  async review(id: string, approved: boolean) {
    const song = await this.repository.getSong(id);
    if (!song) throw new NotFoundException();
    song.status = approved ? 'approved' : 'rejected';
    return this.repository.saveSong(song);
  }
}
