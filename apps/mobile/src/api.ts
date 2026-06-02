import type { GeneratedSong, SongGenerationRequest } from '@habit-buddy/shared';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export async function requestSong(input: {
  childId: string;
  habitId: string;
  prompt: string;
}): Promise<SongGenerationRequest> {
  const response = await fetch(`${API_URL}/songs/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });
  if (!response.ok) throw new Error('song request failed');
  return response.json();
}

export async function getPendingSongs(): Promise<GeneratedSong[]> {
  const response = await fetch(`${API_URL}/songs/pending`);
  if (!response.ok) throw new Error('pending songs failed');
  return response.json();
}

export async function reviewSong(songId: string, approved: boolean): Promise<GeneratedSong> {
  const response = await fetch(`${API_URL}/songs/${songId}/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ approved })
  });
  if (!response.ok) throw new Error('review failed');
  return response.json();
}
