import { describe, expect, it, vi } from 'vitest';
import type { GeneratedSong, SongGenerationRequest } from '@habit-buddy/shared';
import { SongsService } from '../src/songs/songs.service.js';

function createRepositoryMock() {
  const requests = new Map<string, SongGenerationRequest>();
  const songs = new Map<string, GeneratedSong>();
  return {
    createRequest: vi.fn(async (request: SongGenerationRequest) => {
      requests.set(request.id, request);
      return request;
    }),
    getRequest: vi.fn(async (id: string) => requests.get(id) ?? null),
    findRequestByExternalTaskId: vi.fn(async (taskId: string) => [...requests.values()].find((request) => request.externalTaskId === taskId) ?? null),
    updateRequest: vi.fn(async (request: SongGenerationRequest) => {
      requests.set(request.id, request);
      return request;
    }),
    saveSong: vi.fn(async (song: GeneratedSong) => {
      songs.set(song.id, song);
      return song;
    }),
    getSong: vi.fn(async (id: string) => songs.get(id) ?? null),
    listPendingSongs: vi.fn(async () => [...songs.values()].filter((song) => song.status === 'pending_approval'))
  };
}

describe('SongsService', () => {
  it('creates a queued request and approves generated songs', async () => {
    const repository = createRepositoryMock();
    const audioStorage = { persistGeneratedAudio: vi.fn() };
    const service = new SongsService({ add: vi.fn() } as never, repository as never, { uploadAndExtend: vi.fn() } as never, audioStorage as never);
    const request = await service.enqueueRequest({ childId: 'c1', habitId: 'brush', prompt: '토리와 양치' });
    const song = await service.completeGeneration(request.id, '노래');
    expect(request.status).toBe('pending_approval');
    await expect(service.listPending()).resolves.toHaveLength(1);
    await expect(service.review(song.id, true)).resolves.toMatchObject({ status: 'approved' });
  });

  it('tracks Suno task state and stores completed audio metadata', async () => {
    const repository = createRepositoryMock();
    const audioStorage = { persistGeneratedAudio: vi.fn().mockResolvedValue('https://storage.googleapis.com/habit-audio/generated-songs/req/clip-1.mp3') };
    const service = new SongsService({ add: vi.fn() } as never, repository as never, { uploadAndExtend: vi.fn() } as never, audioStorage as never);
    const request = await service.enqueueRequest({
      childId: 'c1',
      habitId: 'brush',
      prompt: '노래 가사',
      inputs: {
        childName: '토리',
        referenceAudioUrl: 'https://example.com/reference.mp3',
        melodyPresetId: 'energetic',
        generationMode: 'reference_audio'
      }
    });

    await expect(service.markGenerating(request.id, 'task-1')).resolves.toMatchObject({ status: 'generating' });
    const song = await service.completeSunoGeneration(request.id, {
      id: 'clip-1',
      title: '토리의 양치 노래',
      audio_url: 'https://example.com/song.mp3',
      stream_audio_url: 'https://example.com/stream',
      prompt: '노래 가사',
      duration: 42
    });

    await expect(service.getRequest(request.id)).resolves.toMatchObject({ status: 'approved' });
    expect(song.provider).toBe('sunoapi');
    expect(song.audioUrl).toBe('https://storage.googleapis.com/habit-audio/generated-songs/req/clip-1.mp3');
    expect(song.sourceAudioUrl).toBe('https://example.com/song.mp3');
    expect(audioStorage.persistGeneratedAudio).toHaveBeenCalledWith(expect.objectContaining({
      requestId: request.id,
      externalSongId: 'clip-1',
      sourceUrls: [undefined, 'https://example.com/song.mp3', 'https://example.com/stream']
    }));
    expect(song.durationSeconds).toBe(42);
    expect(song.melodyPresetId).toBe('energetic');
  });

  it('marks requests as failed with an error code', async () => {
    const repository = createRepositoryMock();
    const audioStorage = { persistGeneratedAudio: vi.fn() };
    const service = new SongsService({ add: vi.fn() } as never, repository as never, { uploadAndExtend: vi.fn() } as never, audioStorage as never);
    const request = await service.enqueueRequest({ childId: 'c1', habitId: 'brush', prompt: '토리와 양치' });
    await expect(service.failRequest(request.id, 'missing_reference_audio', 'Reference audio is required')).resolves.toMatchObject({
      status: 'failed',
      errorCode: 'missing_reference_audio'
    });
  });

  it('starts Suno upload-extend immediately when creating a request', async () => {
    const repository = createRepositoryMock();
    const suno = { uploadAndExtend: vi.fn().mockResolvedValue({ taskId: 'task-now' }) };
    const audioStorage = { persistGeneratedAudio: vi.fn() };
    const service = new SongsService({ add: vi.fn() } as never, repository as never, suno as never, audioStorage as never);

    await expect(service.createRequest({
      childId: 'c1',
      habitId: 'brush',
      prompt: '노래 가사',
      inputs: {
        childName: '토리',
        dislikedHabit: '양치',
        referenceAudioUrl: 'https://example.com/reference.mp3',
        melodyPresetId: 'princess',
        generationMode: 'reference_audio',
        sunoContinueAtSeconds: 20
      }
    })).resolves.toMatchObject({
      status: 'generating',
      externalTaskId: 'task-now'
    });
    expect(suno.uploadAndExtend).toHaveBeenCalledWith(expect.objectContaining({
      uploadUrl: 'https://example.com/reference.mp3',
      prompt: '노래 가사',
      continueAt: 5
    }));
  });
});
