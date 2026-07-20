import type { GeneratedSong, GeneratedSongLyrics, MelodyPresetId, SongGenerationInputs, SongGenerationRequest } from '@habit-buddy/shared';

type CapacitorBridge = {
  getPlatform?: () => string;
};

declare global {
  interface Window {
    Capacitor?: CapacitorBridge;
  }
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/$/, '');
}

function isLocalhostUrl(value: string | undefined) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '::1';
  } catch {
    return false;
  }
}

function isNativeRuntime() {
  return typeof window !== 'undefined' && window.Capacitor?.getPlatform?.() === 'android';
}

function resolveApiUrl() {
  const browserApiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
  if (!isNativeRuntime()) return trimTrailingSlash(browserApiUrl);

  const nativeApiUrl = import.meta.env.VITE_NATIVE_API_URL;
  if (nativeApiUrl) return trimTrailingSlash(nativeApiUrl);

  const publicApiUrl = import.meta.env.VITE_PUBLIC_API_BASE_URL;
  if (publicApiUrl && !isLocalhostUrl(publicApiUrl)) return trimTrailingSlash(publicApiUrl);

  return 'http://10.0.2.2:3000';
}

const API_URL = resolveApiUrl();
const PUBLIC_API_URL = trimTrailingSlash(import.meta.env.VITE_PUBLIC_API_BASE_URL ?? API_URL);

export type ReferenceAudio = { url: string; fileName: string; durationSeconds?: number };

export class SongApiError extends Error {
  constructor(
    message: string,
    public readonly code = 'request_failed'
  ) {
    super(message);
  }
}

async function readError(response: Response, fallback: string) {
  try {
    const body = await response.json();
    const message = typeof body?.message === 'string'
      ? body.message
      : typeof body?.message?.message === 'string'
        ? body.message.message
        : fallback;
    const code = typeof body?.code === 'string' ? body.code : typeof body?.message?.code === 'string' ? body.message.code : 'request_failed';
    return new SongApiError(message, code);
  } catch {
    return new SongApiError(fallback);
  }
}

async function apiFetch(path: string, init?: RequestInit & { timeoutMs?: number }) {
  const timeoutMs = init?.timeoutMs;
  const controller = timeoutMs ? new AbortController() : null;
  const timeout = controller ? globalThis.setTimeout(() => controller.abort(), timeoutMs) : null;
  const { timeoutMs: _timeoutMs, signal, ...fetchInit } = init ?? {};
  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...fetchInit,
      signal: signal ?? controller?.signal
    });
    if (!response.ok) throw await readError(response, `${fallbackForPath(path)} (${API_URL})`);
    return response;
  } catch (error) {
    if (error instanceof SongApiError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new SongApiError(`${fallbackForPath(path)} timed out`, 'request_timeout');
    }
    console.warn(`HabitBuddy API request failed: ${API_URL}${path}`, error);
    throw new SongApiError(`API request failed: ${API_URL}${path}`, 'network_error');
  } finally {
    if (timeout) globalThis.clearTimeout(timeout);
  }
}

function fallbackForPath(path: string) {
  if (path === '/songs/lyrics') return 'lyrics generation failed';
  if (path === '/songs/requests') return 'song generation request failed';
  if (path.includes('/sync')) return 'song request sync failed';
  return 'song request lookup failed';
}

const referenceAudioByMelodyPreset: Partial<Record<MelodyPresetId, ReferenceAudio>> = {
  princess: {
    url: `${PUBLIC_API_URL.replace(/\/$/, '')}/reference-melodies/princess_bgm_cut.mp3`,
    fileName: 'princess_bgm_cut.mp3',
    durationSeconds: 20
  }
};

export function referenceAudioForMelody(melodyPresetId: MelodyPresetId | undefined) {
  return melodyPresetId ? referenceAudioByMelodyPreset[melodyPresetId] : undefined;
}

export async function requestSunoSong(input: {
  childId: string;
  habitId: string;
  lyrics: string;
  inputs: SongGenerationInputs;
}): Promise<SongGenerationRequest> {
  const response = await apiFetch('/songs/requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      childId: input.childId,
      habitId: input.habitId,
      prompt: input.lyrics,
      inputs: input.inputs
    })
  });
  return response.json();
}

export async function getSongRequest(id: string): Promise<SongGenerationRequest> {
  const response = await apiFetch(`/songs/requests/${id}`);
  return response.json();
}

export async function syncSongRequest(id: string): Promise<SongGenerationRequest | GeneratedSong> {
  const response = await apiFetch(`/songs/requests/${id}/sync`, {
    method: 'POST'
  });
  return response.json();
}

export async function generateSongLyrics(input: {
  childId: string;
  habitId: string;
  inputs: SongGenerationInputs;
}): Promise<GeneratedSongLyrics> {
  const response = await apiFetch('/songs/lyrics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    timeoutMs: 45000
  });
  return parseGeneratedSongLyrics(await response.json());
}

function parseGeneratedSongLyrics(body: unknown): GeneratedSongLyrics {
  if (!body || typeof body !== 'object') {
    throw new SongApiError('lyrics generation returned an invalid response', 'invalid_lyrics_response');
  }
  const value = body as Partial<GeneratedSongLyrics>;
  if (typeof value.title !== 'string' || typeof value.lyrics !== 'string') {
    throw new SongApiError('lyrics generation returned an invalid response', 'invalid_lyrics_response');
  }
  return {
    title: value.title,
    lyrics: value.lyrics,
    provider: value.provider === 'openai' ? value.provider : 'openai',
    modelName: typeof value.modelName === 'string' ? value.modelName : 'unknown'
  };
}
