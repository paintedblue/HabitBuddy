import { describe, expect, it } from 'vitest';
import type { ChildProfile, GeneratedSong, SongGenerationRequest } from '@habit-buddy/shared';
import { buildLyricsGenerationInputs, buildSongGenerationInputs, createQueuedSunoSong, mergeSyncedSong, type SongPreview } from './songPipeline';

const profile: ChildProfile = {
  id: 'child-1',
  name: '토리',
  hardHabit: '양치',
  habitBarrier: '민트 맛이 싫어요',
  dreamIdentity: '우주비행사',
  dreamIdentityCustom: '',
  favoriteFood: '김밥',
  favoriteColor: '#FFCC2E',
  friendName: '토리',
  characterId: 'tori',
  melodyPresetId: 'princess',
  rhythmPresetId: 'clapClap',
  instrumentPresetId: 'piano'
};

const preview: SongPreview = {
  title: '토리의 양치 공주 동요',
  lyrics: '[Verse 1]\n토리야, 민트 맛이 싫어요 마음 알아'
};

describe('songPipeline', () => {
  it('builds OpenAI lyrics inputs from child preferences', () => {
    expect(buildLyricsGenerationInputs(profile)).toMatchObject({
      childName: '토리',
      dislikedHabit: '양치',
      dislikedReason: '민트 맛이 싫어요',
      aspiration: '우주비행사',
      foodKeyword: '김밥',
      colorKeyword: '노랑',
      melodyPresetId: 'princess',
      generationMode: 'text'
    });
  });

  it('builds Suno reference-audio inputs with generated lyrics supplied separately as prompt', () => {
    const inputs = buildSongGenerationInputs(profile, {
      url: 'https://example.com/reference-melodies/princess_bgm_cut.mp3',
      fileName: 'princess_bgm_cut.mp3',
      durationSeconds: 20
    });

    expect(inputs).toMatchObject({
      childName: '토리',
      dislikedHabit: '양치',
      aspiration: '우주비행사',
      foodKeyword: '김밥',
      colorKeyword: '노랑',
      melodyPresetId: 'princess',
      generationMode: 'reference_audio',
      referenceAudioUrl: 'https://example.com/reference-melodies/princess_bgm_cut.mp3',
      referenceAudioFileName: 'princess_bgm_cut.mp3',
      referenceAudioDurationSeconds: 20,
      sunoContinueAtSeconds: 20
    });
  });

  it('keeps OpenAI lyrics on the queued local song and merges completed Suno audio metadata', () => {
    const request: SongGenerationRequest = {
      id: 'req-1',
      childId: 'child-1',
      habitId: 'brush',
      prompt: preview.lyrics,
      inputs: buildSongGenerationInputs(profile, {
        url: 'https://example.com/reference.mp3',
        fileName: 'reference.mp3',
        durationSeconds: 20
      }),
      externalTaskId: 'task-1',
      provider: 'sunoapi',
      status: 'generating',
      createdAt: '2026-07-01T00:00:00.000Z'
    };
    const localSong = createQueuedSunoSong(profile, preview, request);
    const completed: GeneratedSong = {
      id: 'song-clip-1',
      requestId: 'req-1',
      title: '토리의 양치 공주 동요',
      lyrics: preview.lyrics,
      audioUrl: 'https://example.com/audio.mp3',
      streamAudioUrl: 'https://example.com/stream.mp3',
      externalSongId: 'clip-1',
      provider: 'sunoapi',
      durationSeconds: 42,
      melodyPresetId: 'princess',
      referenceAudioUrl: 'https://example.com/reference.mp3',
      referenceAudioFileName: 'reference.mp3',
      referenceAudioDurationSeconds: 20,
      sunoContinueAtSeconds: 20,
      status: 'approved'
    };

    expect(localSong.lyrics).toBe(preview.lyrics);
    expect(localSong.status).toBe('generating');
    expect(mergeSyncedSong(localSong, completed)).toMatchObject({
      id: localSong.id,
      requestId: 'req-1',
      lyrics: preview.lyrics,
      audioUrl: 'https://example.com/audio.mp3',
      streamAudioUrl: 'https://example.com/stream.mp3',
      status: 'approved'
    });
  });
});
