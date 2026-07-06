import { afterEach, describe, expect, it, vi } from 'vitest';
import { SongsRepository } from '../src/songs/songs.repository.js';

const queryMock = vi.fn();
const endMock = vi.fn();

vi.mock('pg', () => ({
  Pool: vi.fn().mockImplementation(() => ({
    query: queryMock,
    end: endMock
  }))
}));

describe('SongsRepository', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('persists generation requests with JSON inputs', async () => {
    const repository = new SongsRepository();

    await repository.createRequest({
      id: 'req-1',
      childId: 'child-1',
      habitId: 'brush',
      prompt: '가사',
      inputs: { melodyPresetId: 'princess', referenceAudioUrl: 'https://example.com/ref.mp3' },
      provider: 'sunoapi',
      status: 'queued',
      createdAt: '2026-07-01T00:00:00.000Z'
    });

    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('insert into song_generation_requests'), expect.arrayContaining([
      'req-1',
      'child-1',
      'brush',
      '가사',
      JSON.stringify({ melodyPresetId: 'princess', referenceAudioUrl: 'https://example.com/ref.mp3' })
    ]));
  });

  it('maps request rows back to shared request shape', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [{
        id: 'req-1',
        child_id: 'child-1',
        habit_id: 'brush',
        prompt: '가사',
        inputs: { melodyPresetId: 'princess' },
        provider: 'sunoapi',
        external_task_id: 'task-1',
        error_code: null,
        error_message: null,
        status: 'generating',
        created_at: new Date('2026-07-01T00:00:00.000Z')
      }]
    });
    const repository = new SongsRepository();

    await expect(repository.getRequest('req-1')).resolves.toMatchObject({
      id: 'req-1',
      childId: 'child-1',
      habitId: 'brush',
      externalTaskId: 'task-1',
      inputs: { melodyPresetId: 'princess' },
      status: 'generating'
    });
  });

  it('upserts completed generated songs and maps audio metadata', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [{
        id: 'song-1',
        request_id: 'req-1',
        title: '공주 동요',
        lyrics: '가사',
        audio_url: 'https://example.com/audio.mp3',
        stream_audio_url: 'https://example.com/stream.mp3',
        source_audio_url: null,
        image_url: null,
        external_song_id: 'clip-1',
        provider: 'sunoapi',
        target_duration_seconds: null,
        duration_seconds: 42,
        model_name: 'V5',
        melody_preset_id: 'princess',
        rhythm_preset_id: null,
        instrument_preset_id: null,
        generation_mode: 'reference_audio',
        reference_audio_url: 'https://example.com/ref.mp3',
        reference_audio_file_name: 'ref.mp3',
        reference_audio_duration_seconds: 20,
        suno_continue_at_seconds: 20,
        status: 'approved'
      }]
    });
    const repository = new SongsRepository();

    const song = await repository.saveSong({
      id: 'song-1',
      requestId: 'req-1',
      title: '공주 동요',
      lyrics: '가사',
      audioUrl: 'https://example.com/audio.mp3',
      streamAudioUrl: 'https://example.com/stream.mp3',
      externalSongId: 'clip-1',
      provider: 'sunoapi',
      durationSeconds: 42.7,
      modelName: 'V5',
      melodyPresetId: 'princess',
      generationMode: 'reference_audio',
      referenceAudioUrl: 'https://example.com/ref.mp3',
      referenceAudioFileName: 'ref.mp3',
      referenceAudioDurationSeconds: 19.6,
      sunoContinueAtSeconds: 19.6,
      status: 'approved'
    });

    expect(queryMock.mock.calls[0][1][11]).toBe(43);
    expect(queryMock.mock.calls[0][1][19]).toBe(20);
    expect(queryMock.mock.calls[0][1][20]).toBe(20);
    expect(song).toMatchObject({
      id: 'song-1',
      requestId: 'req-1',
      audioUrl: 'https://example.com/audio.mp3',
      streamAudioUrl: 'https://example.com/stream.mp3',
      melodyPresetId: 'princess',
      status: 'approved'
    });
  });
});
