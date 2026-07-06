import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, NotFoundException } from '@nestjs/common';
import type { Queue } from 'bullmq';
import type { GeneratedSong, SongGenerationInputs, SongGenerationRequest } from '@habit-buddy/shared';
import type { SunoTrack } from './suno-api.client.js';
import { SongsRepository } from './songs.repository.js';

@Injectable()
export class SongsService {
  constructor(
    @InjectQueue('song-generation') private readonly queue: Queue,
    private readonly repository: SongsRepository
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
    await this.queue.add('generate-song', request);
    return request;
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
    return this.repository.updateRequest(request);
  }

  async failRequest(requestId: string, code: string, message: string) {
    const request = await this.getRequest(requestId);
    request.status = 'failed';
    request.errorCode = code;
    request.errorMessage = message;
    return this.repository.updateRequest(request);
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
    request.status = 'approved';
    await this.repository.updateRequest(request);
    const lyrics = track.prompt ?? request.prompt;
    const song: GeneratedSong = {
      id: `song-${track.id ?? requestId}`,
      requestId,
      title: track.title ?? '나만의 동요',
      lyrics,
      audioUrl: track.audioUrl ?? track.audio_url,
      streamAudioUrl: track.streamAudioUrl ?? track.stream_audio_url,
      sourceAudioUrl: track.sourceAudioUrl ?? track.source_audio_url,
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
