import { afterEach, describe, expect, it, vi } from 'vitest';
import { SunoApiClient } from '../src/songs/suno-api.client.js';

describe('SunoApiClient', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.unstubAllGlobals();
  });

  it('sends upload-extend requests with the expected body', async () => {
    process.env.SUNO_API_KEY = 'test-key';
    process.env.SUNO_CALLBACK_URL = 'https://example.com/songs/callbacks/suno';
    process.env.SUNO_CONTINUE_AT_SECONDS = '7';

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ code: 200, msg: 'success', data: { taskId: 'task-1' } })
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = new SunoApiClient();
    const result = await client.uploadAndExtend({
      uploadUrl: 'https://example.com/reference.mp3',
      prompt: '가사',
      style: 'children song',
      title: '테스트 동요'
    });

    expect(result.taskId).toBe('task-1');
    expect(fetchMock).toHaveBeenCalledWith('https://api.sunoapi.org/api/v1/generate/upload-extend', expect.objectContaining({
      method: 'POST',
      headers: {
        Authorization: 'Bearer test-key',
        'Content-Type': 'application/json'
      }
    }));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      uploadUrl: 'https://example.com/reference.mp3',
      defaultParamFlag: true,
      model: 'V4_5ALL',
      callBackUrl: 'https://example.com/songs/callbacks/suno',
      instrumental: false,
      prompt: '가사',
      style: 'children song',
      title: '테스트 동요',
      continueAt: 7
    });
  });

  it('uses an explicit continueAt value for reference melody extension', async () => {
    process.env.SUNO_API_KEY = 'test-key';
    process.env.SUNO_CALLBACK_URL = 'https://example.com/songs/callbacks/suno';

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ code: 200, msg: 'success', data: { taskId: 'task-2' } })
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = new SunoApiClient();
    await client.uploadAndExtend({
      uploadUrl: 'https://example.com/reference-melodies/princess_bgm_cut.mp3',
      prompt: '공주 동요 가사',
      style: 'princess fairytale children song',
      title: '공주 동요',
      continueAt: 20
    });

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      uploadUrl: 'https://example.com/reference-melodies/princess_bgm_cut.mp3',
      prompt: '공주 동요 가사',
      style: 'princess fairytale children song',
      title: '공주 동요',
      continueAt: 20
    });
  });
});
