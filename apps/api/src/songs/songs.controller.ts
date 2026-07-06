import { mkdir } from 'node:fs/promises';
import { extname } from 'node:path';
import { BadRequestException, Body, Controller, Get, Param, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { SongGenerationInputs } from '@habit-buddy/shared';
import { diskStorage, type File as MulterFile } from 'multer';
import { SongsService } from './songs.service.js';
import { SunoApiClient, SunoApiError, type SunoTrack } from './suno-api.client.js';
import { OpenAiLyricsClient, OpenAiLyricsError } from './openai-lyrics.client.js';
import { apiWritableUploadsPath } from '../paths.js';

const seedUploadDir = apiWritableUploadsPath('song-seeds');
const allowedSeedMimeTypes = new Set(['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/aac', 'audio/flac', 'audio/ogg', 'audio/webm']);
const seedStorage = diskStorage({
  destination: async (_request, _file, callback) => {
    try {
      await mkdir(seedUploadDir, { recursive: true });
      callback(null, seedUploadDir);
    } catch (error) {
      callback(error as Error, seedUploadDir);
    }
  },
  filename: (_request, file, callback) => {
    const extension = extname(file.originalname) || seedExtensionForMimeType(file.mimetype);
    callback(null, `seed-${Date.now()}-${Math.round(Math.random() * 100000)}${extension}`);
  }
});

function seedExtensionForMimeType(mimeType: string) {
  if (mimeType === 'audio/wav' || mimeType === 'audio/x-wav') return '.wav';
  if (mimeType === 'audio/mp4' || mimeType === 'audio/aac') return '.m4a';
  if (mimeType === 'audio/flac') return '.flac';
  if (mimeType === 'audio/ogg') return '.ogg';
  if (mimeType === 'audio/webm') return '.webm';
  return '.mp3';
}

@Controller('songs')
export class SongsController {
  constructor(
    private readonly songs: SongsService,
    private readonly suno: SunoApiClient,
    private readonly openAiLyrics: OpenAiLyricsClient
  ) {}

  @Post('requests')
  async create(@Body() body: { childId: string; habitId: string; prompt: string; inputs?: SongGenerationInputs }) {
    return this.songs.createRequest(body);
  }

  @Post('lyrics')
  async lyrics(@Body() body: { childId: string; habitId: string; inputs?: SongGenerationInputs }) {
    try {
      return await this.openAiLyrics.generate(body);
    } catch (error) {
      if (error instanceof OpenAiLyricsError) {
        throw new BadRequestException({ code: error.code, message: error.message });
      }
      throw error;
    }
  }

  @Post('seed-audio')
  @UseInterceptors(FileInterceptor('file', {
    storage: seedStorage,
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: (_request, file, callback) => {
      callback(null, allowedSeedMimeTypes.has(file.mimetype));
    }
  }))
  uploadSeedAudio(@UploadedFile() file?: MulterFile) {
    if (!file) throw new BadRequestException('A 10-20 second audio seed file is required');
    const publicBaseUrl = process.env.PUBLIC_API_BASE_URL ?? `http://localhost:${process.env.PORT ? Number(process.env.PORT) : 3000}`;
    return {
      url: `${publicBaseUrl.replace(/\/$/, '')}/song-seeds/${file.filename}`,
      fileName: file.originalname,
      sizeBytes: file.size,
      mimeType: file.mimetype
    };
  }

  @Get('requests/:id')
  async request(@Param('id') id: string) {
    return this.songs.getRequest(id);
  }

  @Post('requests/:id/sync')
  async sync(@Param('id') id: string) {
    const request = await this.songs.getRequest(id);
    if (!request.externalTaskId) return request;
    try {
      const record = await this.suno.getRecordInfo(request.externalTaskId);
      if (record.status === 'SUCCESS') {
        const track = record.response?.sunoData?.[0];
        if (track) return this.songs.completeSunoGeneration(id, track);
      }
      if (record.status?.endsWith('FAILED') || record.status === 'SENSITIVE_WORD_ERROR' || record.errorCode) {
        return this.songs.failRequest(id, record.errorCode ?? record.status ?? 'suno_generation_failed', record.errorMessage ?? 'Suno generation failed');
      }
      return request;
    } catch (error) {
      if (error instanceof SunoApiError) return this.songs.failRequest(id, error.code, error.message);
      return this.songs.failRequest(id, 'suno_sync_failed', error instanceof Error ? error.message : 'Suno sync failed');
    }
  }

  @Get('pending')
  async pending() {
    return this.songs.listPending();
  }

  @Post('callbacks/suno')
  async sunoCallback(@Body() body: {
    code?: number;
    msg?: string;
    data?: {
      callbackType?: string;
      task_id?: string;
      taskId?: string;
      data?: SunoTrack[];
    };
  }) {
    const taskId = body.data?.task_id ?? body.data?.taskId;
    if (!taskId) return { ok: false, reason: 'missing_task_id' };
    const request = await this.songs.findRequestByExternalTaskId(taskId);
    if (!request) return { ok: false, reason: 'unknown_task_id' };

    if (body.code !== 200 || body.data?.callbackType === 'error') {
      await this.songs.failRequest(request.id, String(body.code ?? 'suno_callback_error'), body.msg ?? 'Suno callback failed');
      return { ok: true };
    }

    if (body.data?.callbackType === 'complete') {
      const track = body.data.data?.[0];
      if (!track) {
        await this.songs.failRequest(request.id, 'missing_suno_track', 'Suno callback did not include a generated track');
        return { ok: true };
      }
      await this.songs.completeSunoGeneration(request.id, track);
    }

    return { ok: true };
  }

  @Post(':id/review')
  async review(@Param('id') id: string, @Body() body: { approved: boolean }) {
    return this.songs.review(id, body.approved);
  }
}
