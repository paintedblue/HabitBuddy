import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ChildProfile, CustomHabit, HabitSession, GeneratedSong, ObserverNote, RoutineSession } from '@habit-buddy/shared';

const keys = {
  profile: 'profile',
  customHabits: 'customHabits',
  sessions: 'sessions',
  songs: 'songs',
  routineSessions: 'routineSessions',
  observerNotes: 'observerNotes'
};

async function read<T>(key: string, fallback: T): Promise<T> {
  const value = await AsyncStorage.getItem(key);
  return value ? (JSON.parse(value) as T) : fallback;
}

async function write<T>(key: string, value: T) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export const storage = {
  getProfile: () => read<ChildProfile | null>(keys.profile, null),
  setProfile: (profile: ChildProfile) => write(keys.profile, profile),
  getCustomHabits: () => read<CustomHabit[]>(keys.customHabits, []),
  setCustomHabits: (items: CustomHabit[]) => write(keys.customHabits, items),
  getSessions: () => read<HabitSession[]>(keys.sessions, []),
  setSessions: (items: HabitSession[]) => write(keys.sessions, items),
  getSongs: () => read<GeneratedSong[]>(keys.songs, []),
  setSongs: (items: GeneratedSong[]) => write(keys.songs, items),
  getRoutineSessions: () => read<RoutineSession[]>(keys.routineSessions, []),
  setRoutineSessions: (items: RoutineSession[]) => write(keys.routineSessions, items),
  getObserverNotes: () => read<ObserverNote[]>(keys.observerNotes, []),
  setObserverNotes: (items: ObserverNote[]) => write(keys.observerNotes, items)
};
