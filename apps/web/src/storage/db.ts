import type { ChildProfile, HabitId, MelodyPresetId, RoutineSession } from '@habit-buddy/shared';

export interface LocalAuth {
  childName: string;
  parentPinLast4: string;
  autoLoginEnabled: boolean;
}

export interface LocalGeneratedSong {
  id: string;
  childId: string;
  habitId: HabitId;
  title: string;
  lyrics: string;
  melodyPresetId?: MelodyPresetId;
  status: 'approved' | 'draft';
  createdAt: string;
  lastUsedAt?: string;
  inputs: {
    childName: string;
    hardHabit: string;
    habitBarrier: string;
    dreamIdentity: string;
    favoriteFood: string;
    favoriteColor: string;
  };
}

const profileKey = 'habitbuddy.profile';
const authKey = 'habitbuddy.auth';
const sessionsKey = 'habitbuddy.sessions';
const songsKey = 'habitbuddy.songs';

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export const habitBuddyDb = {
  async getAuth(): Promise<LocalAuth | null> {
    return readJson<LocalAuth | null>(authKey, null);
  },

  async saveAuth(auth: LocalAuth) {
    window.localStorage.setItem(authKey, JSON.stringify(auth));
  },

  async getProfile(): Promise<ChildProfile | null> {
    return readJson<ChildProfile | null>(profileKey, null);
  },

  async saveProfile(profile: ChildProfile) {
    window.localStorage.setItem(profileKey, JSON.stringify(profile));
  },

  async listSongs(): Promise<LocalGeneratedSong[]> {
    return readJson<LocalGeneratedSong[]>(songsKey, []);
  },

  async listSongsByHabit(habitId: HabitId): Promise<LocalGeneratedSong[]> {
    const songs = readJson<LocalGeneratedSong[]>(songsKey, []);
    return songs.filter((song) => song.habitId === habitId);
  },

  async getSong(songId: string): Promise<LocalGeneratedSong | null> {
    const songs = readJson<LocalGeneratedSong[]>(songsKey, []);
    return songs.find((song) => song.id === songId) ?? null;
  },

  async saveSong(song: LocalGeneratedSong) {
    const songs = readJson<LocalGeneratedSong[]>(songsKey, []);
    const next = [song, ...songs.filter((item) => item.id !== song.id)];
    window.localStorage.setItem(songsKey, JSON.stringify(next));
  },

  async listRoutineSessions(): Promise<RoutineSession[]> {
    return readJson<RoutineSession[]>(sessionsKey, []);
  },

  async saveRoutineSession(session: RoutineSession) {
    const sessions = readJson<RoutineSession[]>(sessionsKey, []);
    const next = [session, ...sessions.filter((item) => item.id !== session.id)].slice(0, 30);
    window.localStorage.setItem(sessionsKey, JSON.stringify(next));
  }
};
