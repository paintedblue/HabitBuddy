import 'reflect-metadata';
import { TestingModule, Test } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GeneratedSong, SongGenerationInputs, SongGenerationRequest } from '@habit-buddy/shared';
import { SongsController } from '../src/songs/songs.controller.js';
import { SongsService } from '../src/songs/songs.service.js';
import { SongsProcessor } from '../src/songs/songs.processor.js';
import { SongsRepository } from '../src/songs/songs.repository.js';
import { SunoApiClient } from '../src/songs/suno-api.client.js';
import { OpenAiLyricsClient } from '../src/songs/openai-lyrics.client.js';
import { AudioStorageService } from '../src/songs/audio-storage.service.js';

function createRepositoryFake() {
  const requests = new Map<string, SongGenerationRequest>();
  const songs = new Map<string, GeneratedSong>();
  return {
    createRequest: vi.fn(async (songRequest: SongGenerationRequest) => {
      requests.set(songRequest.id, songRequest);
      return songRequest;
    }),
    getRequest: vi.fn(async (id: string) => requests.get(id) ?? null),
    findRequestByExternalTaskId: vi.fn(async (taskId: string) => [...requests.values()].find((item) => item.externalTaskId === taskId) ?? null),
    updateRequest: vi.fn(async (songRequest: SongGenerationRequest) => {
      requests.set(songRequest.id, songRequest);
      return songRequest;
    }),
    saveSong: vi.fn(async (song: GeneratedSong) => {
      songs.set(song.id, song);
      return song;
    }),
    getSong: vi.fn(async (id: string) => songs.get(id) ?? null),
    listPendingSongs: vi.fn(async () => [...songs.values()].filter((song) => song.status === 'pending_approval'))
  };
}

async function compileSongTestModule(
  repository: ReturnType<typeof createRepositoryFake>,
  queue: { add: ReturnType<typeof vi.fn> },
  suno: { uploadAndExtend: ReturnType<typeof vi.fn>; getRecordInfo: ReturnType<typeof vi.fn> },
  openAiLyrics: { generate: ReturnType<typeof vi.fn> },
  audioStorage: { persistGeneratedAudio: ReturnType<typeof vi.fn> }
) {
  return Test.createTestingModule({
    providers: [
      {
        provide: SongsController,
        useFactory: (songs: SongsService, sunoClient: SunoApiClient, lyricsClient: OpenAiLyricsClient) => new SongsController(songs, sunoClient, lyricsClient),
        inject: [SongsService, SunoApiClient, OpenAiLyricsClient]
      },
      {
        provide: SongsService,
        useFactory: (songQueue: typeof queue, songsRepository: typeof repository, sunoClient: typeof suno, audioStorageService: typeof audioStorage) => new SongsService(songQueue as never, songsRepository as never, sunoClient as never, audioStorageService as never),
        inject: [getQueueToken('song-generation'), SongsRepository, SunoApiClient, AudioStorageService]
      },
      {
        provide: SongsProcessor,
        useFactory: (songs: SongsService, sunoClient: typeof suno) => new SongsProcessor(songs, sunoClient as never),
        inject: [SongsService, SunoApiClient]
      },
      { provide: getQueueToken('song-generation'), useValue: queue },
      { provide: SongsRepository, useValue: repository },
      { provide: SunoApiClient, useValue: suno },
      { provide: OpenAiLyricsClient, useValue: openAiLyrics },
      { provide: AudioStorageService, useValue: audioStorage }
    ]
  }).compile();
}

describe('song generation pipeline e2e', () => {
  let moduleRef: TestingModule;
  let controller: SongsController;
  let processor: SongsProcessor;
  let repository: ReturnType<typeof createRepositoryFake>;
  const queue = { add: vi.fn() };
  const openAiLyrics = {
    generate: vi.fn()
  };
  const suno = {
    uploadAndExtend: vi.fn(),
    getRecordInfo: vi.fn()
  };
  const audioStorage = {
    persistGeneratedAudio: vi.fn()
  };

  beforeEach(async () => {
    queue.add.mockReset();
    openAiLyrics.generate.mockReset();
    suno.uploadAndExtend.mockReset();
    suno.getRecordInfo.mockReset();
    audioStorage.persistGeneratedAudio.mockReset();
    audioStorage.persistGeneratedAudio.mockResolvedValue('https://storage.googleapis.com/habit-buddy-audio/generated-songs/req/clip.mp3');
    repository = createRepositoryFake();

    moduleRef = await compileSongTestModule(repository, queue, suno, openAiLyrics, audioStorage);
    controller = moduleRef.get(SongsController);
    processor = moduleRef.get(SongsProcessor);
  });

  afterEach(async () => {
    await moduleRef?.close();
  });

  it('connects preference-based OpenAI lyrics to Suno extend and stores the completed song', async () => {
    const lyrics = '[Verse 1]\n토리야, 민트 맛이 싫어요 마음 알아\n\n[Chorus]\n쓱쓱 싹싹 이를 닦아\n우주비행사 꿈에 한 걸음 가까워';
    openAiLyrics.generate.mockResolvedValue({
      title: '토리의 양치 공주 동요',
      lyrics,
      provider: 'openai',
      modelName: 'gpt-5-mini'
    });
    suno.uploadAndExtend.mockResolvedValue({ taskId: 'task-princess-1' });
    suno.getRecordInfo.mockResolvedValue({
      status: 'SUCCESS',
      response: {
        sunoData: [{
          id: 'clip-1',
          title: '토리의 양치 공주 동요',
          prompt: lyrics,
          audio_url: 'https://example.com/audio.mp3',
          stream_audio_url: 'https://example.com/stream.mp3',
          duration: 42,
          model_name: 'V5'
        }]
      }
    });

    const inputs: SongGenerationInputs = {
      childName: '토리',
      dislikedHabit: '양치',
      dislikedReason: '민트 맛이 싫어요',
      aspiration: '우주비행사',
      foodKeyword: '김밥',
      colorKeyword: '노랑',
      melodyPresetId: 'princess',
      generationMode: 'reference_audio',
      referenceAudioUrl: 'https://example.com/reference-melodies/princess_bgm_cut.mp3',
      referenceAudioFileName: 'princess_bgm_cut.mp3',
      referenceAudioDurationSeconds: 20,
      sunoContinueAtSeconds: 20
    };

    await expect(controller.lyrics({ childId: 'child-1', habitId: 'brush', inputs })).resolves.toMatchObject({
      lyrics
    });
    expect(openAiLyrics.generate).toHaveBeenCalledWith(expect.objectContaining({
      childId: 'child-1',
      habitId: 'brush',
      inputs: expect.objectContaining({
        aspiration: '우주비행사',
        foodKeyword: '김밥',
        colorKeyword: '노랑'
      })
    }));

    const created = await controller.create({ childId: 'child-1', habitId: 'brush', prompt: lyrics, inputs });
    expect(created.prompt).toBe(lyrics);
    expect(suno.uploadAndExtend).toHaveBeenCalledWith(expect.objectContaining({
      uploadUrl: 'https://example.com/reference-melodies/princess_bgm_cut.mp3',
      prompt: lyrics,
      continueAt: 5
    }));
    expect(suno.uploadAndExtend.mock.calls[0][0].style).toContain('princess fairytale');
    expect(queue.add).not.toHaveBeenCalled();
    expect(created).toMatchObject({
      externalTaskId: 'task-princess-1',
      status: 'generating'
    });

    await expect(controller.sunoCallback({
        code: 200,
        data: {
          callbackType: 'complete',
          task_id: 'task-princess-1',
          data: [{
            id: 'clip-1',
            title: '토리의 양치 공주 동요',
            prompt: lyrics,
            audio_url: 'https://example.com/audio.mp3',
            stream_audio_url: 'https://example.com/stream.mp3',
            duration: 42,
            model_name: 'V5'
          }]
        }
      })).resolves.toEqual({ ok: true });

    await expect(controller.sync(created.id)).resolves.toMatchObject({
      requestId: created.id,
      title: '토리의 양치 공주 동요',
      lyrics,
      audioUrl: 'https://storage.googleapis.com/habit-buddy-audio/generated-songs/req/clip.mp3',
      streamAudioUrl: 'https://example.com/stream.mp3',
      status: 'approved'
    });
    expect(audioStorage.persistGeneratedAudio).toHaveBeenCalledWith(expect.objectContaining({
      externalSongId: 'clip-1',
      sourceUrls: [undefined, 'https://example.com/audio.mp3', 'https://example.com/stream.mp3']
    }));
  });

  it('recovers an in-flight Suno request after an API module restart using persisted request state', async () => {
    const lyrics = '[Verse 1]\n토리야 양치하자';
    const inputs: SongGenerationInputs = {
      childName: '토리',
      dislikedHabit: '양치',
      dislikedReason: '민트 맛이 싫어요',
      aspiration: '우주비행사',
      foodKeyword: '김밥',
      colorKeyword: '노랑',
      melodyPresetId: 'princess',
      generationMode: 'reference_audio',
      referenceAudioUrl: 'https://example.com/reference-melodies/princess_bgm_cut.mp3',
      referenceAudioFileName: 'princess_bgm_cut.mp3',
      referenceAudioDurationSeconds: 20,
      sunoContinueAtSeconds: 20
    };
    suno.uploadAndExtend.mockResolvedValue({ taskId: 'task-after-restart' });

    const created = await controller.create({ childId: 'child-1', habitId: 'brush', prompt: lyrics, inputs });
    await expect(controller.request(created.id)).resolves.toMatchObject({
      id: created.id,
      externalTaskId: 'task-after-restart',
      status: 'generating'
    });

    await moduleRef.close();
    moduleRef = await compileSongTestModule(repository, queue, suno, openAiLyrics, audioStorage);
    controller = moduleRef.get(SongsController);
    suno.getRecordInfo.mockResolvedValue({
      status: 'SUCCESS',
      response: {
        sunoData: [{
          id: 'clip-after-restart',
          title: '재시작 후 토리 동요',
          prompt: lyrics,
          audio_url: 'https://example.com/audio-after-restart.mp3',
          stream_audio_url: 'https://example.com/stream-after-restart.mp3',
          duration: 94.92,
          model_name: 'V5'
        }]
      }
    });

    await expect(controller.sync(created.id)).resolves.toMatchObject({
      requestId: created.id,
      externalSongId: 'clip-after-restart',
      audioUrl: 'https://storage.googleapis.com/habit-buddy-audio/generated-songs/req/clip.mp3',
      streamAudioUrl: 'https://example.com/stream-after-restart.mp3',
      status: 'approved'
    });
    await expect(controller.request(created.id)).resolves.toMatchObject({
      id: created.id,
      externalTaskId: 'task-after-restart',
      status: 'approved'
    });
  });
});
