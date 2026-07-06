import { Injectable } from '@nestjs/common';

export class SunoApiError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
  }
}

export interface SunoUploadExtendInput {
  uploadUrl: string;
  prompt: string;
  style: string;
  title: string;
  model?: string;
  continueAt?: number;
}

export interface SunoTrack {
  id?: string;
  audioUrl?: string;
  audio_url?: string;
  streamAudioUrl?: string;
  stream_audio_url?: string;
  sourceAudioUrl?: string;
  source_audio_url?: string;
  imageUrl?: string;
  image_url?: string;
  prompt?: string;
  modelName?: string;
  model_name?: string;
  title?: string;
  tags?: string;
  duration?: number;
}

export interface SunoRecordInfo {
  taskId?: string;
  status?: string;
  errorCode?: string | null;
  errorMessage?: string | null;
  response?: {
    sunoData?: SunoTrack[];
  };
}

@Injectable()
export class SunoApiClient {
  private readonly baseUrl = process.env.SUNO_API_BASE_URL ?? 'https://api.sunoapi.org';
  private readonly model = process.env.SUNO_MODEL ?? 'V4_5ALL';

  async uploadAndExtend(input: SunoUploadExtendInput): Promise<{ taskId: string }> {
    const token = this.requireApiKey();
    const callBackUrl = process.env.SUNO_CALLBACK_URL ?? (process.env.PUBLIC_API_BASE_URL ? `${process.env.PUBLIC_API_BASE_URL}/songs/callbacks/suno` : '');
    if (!callBackUrl) {
      throw new SunoApiError('missing_callback_url', 'SUNO_CALLBACK_URL or PUBLIC_API_BASE_URL is required');
    }

    const response = await fetch(`${this.baseUrl}/api/v1/generate/upload-extend`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        uploadUrl: input.uploadUrl,
        defaultParamFlag: true,
        model: input.model ?? this.model,
        callBackUrl,
        instrumental: false,
        prompt: input.prompt,
        style: input.style,
        title: input.title,
        continueAt: input.continueAt ?? this.defaultContinueAt()
      })
    });

    const body = await response.json().catch(() => null) as { code?: number; msg?: string; data?: { taskId?: string } } | null;
    if (!response.ok || body?.code !== 200 || !body.data?.taskId) {
      throw new SunoApiError(String(body?.code ?? response.status), body?.msg ?? 'Suno upload-extend request failed');
    }

    return { taskId: body.data.taskId };
  }

  async getRecordInfo(taskId: string): Promise<SunoRecordInfo> {
    const token = this.requireApiKey();
    const url = new URL(`${this.baseUrl}/api/v1/generate/record-info`);
    url.searchParams.set('taskId', taskId);
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    const body = await response.json().catch(() => null) as { code?: number; msg?: string; data?: SunoRecordInfo } | null;
    if (!response.ok || body?.code !== 200 || !body.data) {
      throw new SunoApiError(String(body?.code ?? response.status), body?.msg ?? 'Suno record-info request failed');
    }
    return body.data;
  }

  private requireApiKey() {
    const token = process.env.SUNO_API_KEY;
    if (!token) throw new SunoApiError('missing_api_key', 'SUNO_API_KEY is required');
    return token;
  }

  private defaultContinueAt() {
    const value = Number(process.env.SUNO_CONTINUE_AT_SECONDS ?? 5);
    return Number.isFinite(value) && value > 0 ? value : 5;
  }
}
