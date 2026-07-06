import { afterEach, describe, expect, it, vi } from 'vitest';
import OpenAI from 'openai';
import { OpenAiLyricsClient, OpenAiLyricsError } from '../src/songs/openai-lyrics.client.js';

const createMock = vi.fn();

vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    responses: {
      create: createMock
    }
  }))
}));

describe('OpenAiLyricsClient', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  it('requires OPENAI_API_KEY', async () => {
    delete process.env.OPENAI_API_KEY;
    const client = new OpenAiLyricsClient();

    await expect(client.generate({ childId: 'c1', habitId: 'brush' })).rejects.toMatchObject({
      code: 'missing_openai_api_key'
    });
  });

  it('generates safe lyrics with the configured model', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    process.env.OPENAI_MODEL = 'gpt-5-mini';
    createMock.mockResolvedValue({
      output_text: JSON.stringify({
        title: '토리의 양치 노래',
        lyrics: [
          '[Verse 1]',
          '토리야, 맛이 싫어요 마음 알아',
          '그 마음 안아 주고',
          '우리 천천히 같이 해',
          '',
          '[Chorus]',
          '쓱쓱 싹싹 이를 닦아',
          '우주비행사 꿈에 한 걸음 가까워',
          '뽀득뽀득 한 번 더 천천히',
          '토리야, 오늘도 반짝 해보자',
          '',
          '[Verse 2]',
          '양치 하면 입안이 상쾌해져',
          '노랑처럼 반짝반짝',
          '김밥처럼 든든하게',
          '웃음이 톡톡 피어나',
          '',
          '[Chorus]',
          '쓱쓱 싹싹 이를 닦아',
          '우주비행사 꿈에 한 걸음 가까워',
          '뽀득뽀득 한 번 더 천천히',
          '토리야, 오늘도 반짝 해보자',
          '',
          '[Outro]',
          '다 했어! 잘했어 토리!',
          '반짝 웃음 짝짝짝'
        ].join('\n')
      })
    });

    const client = new OpenAiLyricsClient();
    const result = await client.generate({
      childId: 'c1',
      habitId: 'brush',
      inputs: {
        childName: '토리',
        dislikedHabit: '양치',
        dislikedReason: '맛이 싫어요',
        aspiration: '우주비행사',
        foodKeyword: '김밥',
        colorKeyword: '노랑',
        melodyPresetId: 'energetic'
      }
    });

    expect(OpenAI).toHaveBeenCalledWith({ apiKey: 'test-key' });
    expect(createMock).toHaveBeenCalledWith(expect.objectContaining({ model: 'gpt-5-mini' }));
    expect(result).toMatchObject({
      title: '토리의 양치 노래',
      provider: 'openai',
      modelName: 'gpt-5-mini'
    });
  });

  it('fails when generated lyrics do not pass deterministic safety checks', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    createMock.mockResolvedValue({
      output_text: JSON.stringify({
        title: '위험한 노래',
        lyrics: [
          '[Verse 1]',
          '토리야, 우리 천천히 같이 해',
          '',
          '[Chorus]',
          '우주비행사 꿈에 한 걸음 가까워',
          '뜨거운 물과 가위를 들어',
          '',
          '[Verse 2]',
          '양치 하면 입안이 상쾌해져',
          '',
          '[Chorus]',
          '우주비행사 꿈에 한 걸음 가까워',
          '뜨거운 물과 가위를 들어',
          '',
          '[Outro]',
          '다 했어! 잘했어 토리!'
        ].join('\n')
      })
    });

    const client = new OpenAiLyricsClient();

    await expect(client.generate({ childId: 'c1', habitId: 'brush' })).rejects.toBeInstanceOf(OpenAiLyricsError);
    expect(createMock).toHaveBeenCalledTimes(2);
  });
});
