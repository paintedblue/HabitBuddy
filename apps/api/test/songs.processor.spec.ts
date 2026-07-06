import { describe, expect, it, vi } from 'vitest';
import type { SongGenerationRequest } from '@habit-buddy/shared';
import { SongsProcessor } from '../src/songs/songs.processor.js';

describe('SongsProcessor', () => {
  it('passes reference melody URL, generated lyrics, princess style, and continueAt to Suno upload-extend', async () => {
    const request: SongGenerationRequest = {
      id: 'req-princess',
      childId: 'child-1',
      habitId: 'brush',
      prompt: '[Verse 1]\n공주 동요 가사',
      provider: 'sunoapi',
      status: 'queued',
      createdAt: new Date().toISOString(),
      inputs: {
        childName: '토리',
        dislikedHabit: '양치',
        melodyPresetId: 'princess',
        referenceAudioUrl: 'https://example.com/reference-melodies/princess_bgm_cut.mp3',
        referenceAudioFileName: 'princess_bgm_cut.mp3',
        referenceAudioDurationSeconds: 20,
        sunoContinueAtSeconds: 20,
        generationMode: 'reference_audio'
      }
    };
    const songs = {
      markGenerating: vi.fn().mockReturnValue({ ...request, status: 'generating' }),
      failRequest: vi.fn()
    };
    const suno = {
      uploadAndExtend: vi.fn().mockResolvedValue({ taskId: 'task-princess' })
    };
    const processor = new SongsProcessor(songs as never, suno as never);

    await processor.process({ data: request } as never);

    expect(suno.uploadAndExtend).toHaveBeenCalledWith(expect.objectContaining({
      uploadUrl: 'https://example.com/reference-melodies/princess_bgm_cut.mp3',
      prompt: '[Verse 1]\n공주 동요 가사',
      title: '토리의 양치 공주 동요',
      continueAt: 20
    }));
    expect(suno.uploadAndExtend.mock.calls[0][0].style).toContain('princess fairytale');
    expect(songs.markGenerating).toHaveBeenCalledWith('req-princess', 'task-princess');
  });
});
