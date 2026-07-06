import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';
import type { GeneratedSong, SongGenerationInputs, SongGenerationRequest, SongStatus } from '@habit-buddy/shared';

interface RequestRow {
  id: string;
  child_id: string;
  habit_id: string;
  prompt: string;
  inputs: SongGenerationInputs | null;
  provider: SongGenerationRequest['provider'] | null;
  external_task_id: string | null;
  error_code: string | null;
  error_message: string | null;
  status: SongStatus;
  created_at: Date;
}

interface SongRow {
  id: string;
  request_id: string;
  title: string;
  lyrics: string;
  audio_url: string | null;
  stream_audio_url: string | null;
  source_audio_url: string | null;
  image_url: string | null;
  external_song_id: string | null;
  provider: GeneratedSong['provider'] | null;
  target_duration_seconds: number | null;
  duration_seconds: number | null;
  model_name: string | null;
  melody_preset_id: GeneratedSong['melodyPresetId'] | null;
  rhythm_preset_id: GeneratedSong['rhythmPresetId'] | null;
  instrument_preset_id: GeneratedSong['instrumentPresetId'] | null;
  generation_mode: GeneratedSong['generationMode'] | null;
  reference_audio_url: string | null;
  reference_audio_file_name: string | null;
  reference_audio_duration_seconds: number | null;
  suno_continue_at_seconds: number | null;
  status: SongStatus;
}

@Injectable()
export class SongsRepository implements OnModuleDestroy {
  private readonly pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    host: process.env.DATABASE_URL ? undefined : process.env.POSTGRES_HOST ?? 'localhost',
    port: process.env.DATABASE_URL ? undefined : Number(process.env.POSTGRES_PORT ?? 5432),
    database: process.env.DATABASE_URL ? undefined : process.env.POSTGRES_DB ?? 'habit_buddy',
    user: process.env.DATABASE_URL ? undefined : process.env.POSTGRES_USER ?? 'habit_buddy',
    password: process.env.DATABASE_URL ? undefined : process.env.POSTGRES_PASSWORD ?? 'habit_buddy'
  });

  async onModuleDestroy() {
    await this.pool.end();
  }

  async createRequest(request: SongGenerationRequest) {
    await this.pool.query(
      `insert into song_generation_requests
        (id, child_id, habit_id, prompt, inputs, provider, external_task_id, error_code, error_message, status, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        request.id,
        request.childId,
        request.habitId,
        request.prompt,
        JSON.stringify(request.inputs ?? null),
        request.provider ?? null,
        request.externalTaskId ?? null,
        request.errorCode ?? null,
        request.errorMessage ?? null,
        request.status,
        request.createdAt
      ]
    );
    return request;
  }

  async getRequest(id: string) {
    const result = await this.pool.query<RequestRow>('select * from song_generation_requests where id = $1', [id]);
    return result.rows[0] ? requestFromRow(result.rows[0]) : null;
  }

  async findRequestByExternalTaskId(taskId: string) {
    const result = await this.pool.query<RequestRow>('select * from song_generation_requests where external_task_id = $1 limit 1', [taskId]);
    return result.rows[0] ? requestFromRow(result.rows[0]) : null;
  }

  async updateRequest(request: SongGenerationRequest) {
    const result = await this.pool.query<RequestRow>(
      `update song_generation_requests
       set inputs = $2, provider = $3, external_task_id = $4, error_code = $5, error_message = $6, status = $7
       where id = $1
       returning *`,
      [
        request.id,
        JSON.stringify(request.inputs ?? null),
        request.provider ?? null,
        request.externalTaskId ?? null,
        request.errorCode ?? null,
        request.errorMessage ?? null,
        request.status
      ]
    );
    return result.rows[0] ? requestFromRow(result.rows[0]) : null;
  }

  async saveSong(song: GeneratedSong) {
    const result = await this.pool.query<SongRow>(
      `insert into generated_songs
        (id, request_id, title, lyrics, audio_url, stream_audio_url, source_audio_url, image_url,
         external_song_id, provider, target_duration_seconds, duration_seconds, model_name,
         melody_preset_id, rhythm_preset_id, instrument_preset_id, generation_mode,
         reference_audio_url, reference_audio_file_name, reference_audio_duration_seconds,
         suno_continue_at_seconds, status)
       values
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
       on conflict (id) do update set
         title = excluded.title,
         lyrics = excluded.lyrics,
         audio_url = excluded.audio_url,
         stream_audio_url = excluded.stream_audio_url,
         source_audio_url = excluded.source_audio_url,
         image_url = excluded.image_url,
         external_song_id = excluded.external_song_id,
         provider = excluded.provider,
         target_duration_seconds = excluded.target_duration_seconds,
         duration_seconds = excluded.duration_seconds,
         model_name = excluded.model_name,
         melody_preset_id = excluded.melody_preset_id,
         rhythm_preset_id = excluded.rhythm_preset_id,
         instrument_preset_id = excluded.instrument_preset_id,
         generation_mode = excluded.generation_mode,
         reference_audio_url = excluded.reference_audio_url,
         reference_audio_file_name = excluded.reference_audio_file_name,
         reference_audio_duration_seconds = excluded.reference_audio_duration_seconds,
         suno_continue_at_seconds = excluded.suno_continue_at_seconds,
         status = excluded.status
       returning *`,
      [
        song.id,
        song.requestId,
        song.title,
        song.lyrics,
        song.audioUrl ?? null,
        song.streamAudioUrl ?? null,
        song.sourceAudioUrl ?? null,
        song.imageUrl ?? null,
        song.externalSongId ?? null,
        song.provider ?? null,
        integerSeconds(song.targetDurationSeconds),
        integerSeconds(song.durationSeconds),
        song.modelName ?? null,
        song.melodyPresetId ?? null,
        song.rhythmPresetId ?? null,
        song.instrumentPresetId ?? null,
        song.generationMode ?? null,
        song.referenceAudioUrl ?? null,
        song.referenceAudioFileName ?? null,
        integerSeconds(song.referenceAudioDurationSeconds),
        integerSeconds(song.sunoContinueAtSeconds),
        song.status
      ]
    );
    return songFromRow(result.rows[0]);
  }

  async getSong(id: string) {
    const result = await this.pool.query<SongRow>('select * from generated_songs where id = $1', [id]);
    return result.rows[0] ? songFromRow(result.rows[0]) : null;
  }

  async listPendingSongs() {
    const result = await this.pool.query<SongRow>('select * from generated_songs where status = $1 order by id desc', ['pending_approval']);
    return result.rows.map(songFromRow);
  }
}

function requestFromRow(row: RequestRow): SongGenerationRequest {
  return {
    id: row.id,
    childId: row.child_id,
    habitId: row.habit_id,
    prompt: row.prompt,
    inputs: row.inputs ?? undefined,
    provider: row.provider ?? undefined,
    externalTaskId: row.external_task_id ?? undefined,
    errorCode: row.error_code ?? undefined,
    errorMessage: row.error_message ?? undefined,
    status: row.status,
    createdAt: row.created_at.toISOString()
  };
}

function integerSeconds(value?: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.max(0, Math.round(value));
}

function songFromRow(row: SongRow): GeneratedSong {
  return {
    id: row.id,
    requestId: row.request_id,
    title: row.title,
    lyrics: row.lyrics,
    audioUrl: row.audio_url ?? undefined,
    streamAudioUrl: row.stream_audio_url ?? undefined,
    sourceAudioUrl: row.source_audio_url ?? undefined,
    imageUrl: row.image_url ?? undefined,
    externalSongId: row.external_song_id ?? undefined,
    provider: row.provider ?? undefined,
    targetDurationSeconds: row.target_duration_seconds ?? undefined,
    durationSeconds: row.duration_seconds ?? undefined,
    modelName: row.model_name ?? undefined,
    melodyPresetId: row.melody_preset_id ?? undefined,
    rhythmPresetId: row.rhythm_preset_id ?? undefined,
    instrumentPresetId: row.instrument_preset_id ?? undefined,
    generationMode: row.generation_mode ?? undefined,
    referenceAudioUrl: row.reference_audio_url ?? undefined,
    referenceAudioFileName: row.reference_audio_file_name ?? undefined,
    referenceAudioDurationSeconds: row.reference_audio_duration_seconds ?? undefined,
    sunoContinueAtSeconds: row.suno_continue_at_seconds ?? undefined,
    status: row.status
  };
}
