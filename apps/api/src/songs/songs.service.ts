import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, NotFoundException } from '@nestjs/common';
import type { Queue } from 'bullmq';
import type { GeneratedSong, SongGenerationRequest } from '@habit-buddy/shared';

@Injectable()
export class SongsService {
  private readonly requests = new Map<string, SongGenerationRequest>();
  private readonly songs = new Map<string, GeneratedSong>();

  constructor(@InjectQueue('song-generation') private readonly queue: Queue) {}

  async createRequest(input: { childId: string; habitId: string; prompt: string }): Promise<SongGenerationRequest> {
    const id = `req-${Date.now()}`;
    const request: SongGenerationRequest = {
      id,
      childId: input.childId,
      habitId: input.habitId,
      prompt: input.prompt,
      status: 'queued',
      createdAt: new Date().toISOString()
    };
    this.requests.set(id, request);
    await this.queue.add('generate-song', request);
    return request;
  }

  completeGeneration(requestId: string, lyrics: string) {
    const request = this.requests.get(requestId);
    if (!request) throw new NotFoundException();
    request.status = 'pending_approval';
    const song: GeneratedSong = {
      id: `song-${requestId}`,
      requestId,
      title: '나만의 동요',
      lyrics,
      status: 'pending_approval'
    };
    this.songs.set(song.id, song);
    return song;
  }

  listPending() {
    return [...this.songs.values()].filter((song) => song.status === 'pending_approval');
  }

  review(id: string, approved: boolean) {
    const song = this.songs.get(id);
    if (!song) throw new NotFoundException();
    song.status = approved ? 'approved' : 'rejected';
    return song;
  }
}
