import { describe, expect, it, vi } from 'vitest';
import { SongsService } from '../src/songs/songs.service.js';

describe('SongsService', () => {
  it('creates a queued request and approves generated songs', async () => {
    const service = new SongsService({ add: vi.fn() } as never);
    const request = await service.createRequest({ childId: 'c1', habitId: 'brush', prompt: '토리와 양치' });
    const song = service.completeGeneration(request.id, '노래');
    expect(request.status).toBe('pending_approval');
    expect(service.listPending()).toHaveLength(1);
    expect(service.review(song.id, true).status).toBe('approved');
  });
});
