export interface ChildInputs {
  childId: string;
  name?: string;
  habit?: string;
  dislikedReason?: string;
  aspiration?: string;
  favoriteFood?: string;
  favoriteColor?: string;
  actionCue?: string;
  melody?: string;
}

export interface CleanInputs {
  childId: string;
  name: string;
  habit: string;
  dislikedReason: string;
  aspiration: string;
  favoriteFood: string;
  favoriteColor: string;
  actionCue: string;
  melody: string;
  neutralizedFields: string[];
}

export interface Violation {
  code: string;
  message: string;
  detail?: string;
}

export interface Verdict {
  pass: boolean;
  violations: Violation[];
  reason?: string;
}

export interface DeterministicResult {
  pass: boolean;
  fails: Violation[];
}

export type SongRecordStatus = 'pending' | 'approved' | 'blocked';

export interface SongRecord {
  id: string;
  childId: string;
  lyrics: string | null;
  status: SongRecordStatus;
  createdAt: string;
}
