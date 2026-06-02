export type CharacterId = 'tori' | 'dali' | 'soopi' | 'bboyi';
export type HabitId = 'brush' | 'wash' | 'bed' | 'tidy';
export type SongStatus = 'draft' | 'queued' | 'generating' | 'pending_approval' | 'approved' | 'rejected' | 'failed';
export type RoutinePhase = 'cue' | 'routine' | 'reward';
export type RoutineEventType =
  | 'session_started'
  | 'cue_started'
  | 'cue_completed'
  | 'routine_started'
  | 'routine_paused'
  | 'routine_resumed'
  | 'routine_completed'
  | 'reward_viewed';

export interface Character {
  id: CharacterId;
  name: string;
  species: string;
  accent: string;
  background: string;
}

export interface ChildProfile {
  id: string;
  name: string;
  hardHabit: string;
  habitBarrier: string;
  dreamIdentity: string;
  dreamIdentityCustom: string;
  favoriteFood: string;
  favoriteColor: string;
  friendName: string;
  characterId: CharacterId;
}

export interface HabitTemplate {
  id: HabitId;
  emoji: string;
  name: string;
  durationSeconds: number;
  starterLyric: string;
  progressLyric: string;
}

export interface CustomHabit {
  id: string;
  name: string;
  emoji: string;
  durationSeconds: number;
  createdByParent: boolean;
}

export interface HabitSession {
  id: string;
  childId: string;
  habitId: string;
  completedAt: string;
  stars: number;
}

export interface RoutineEvent {
  id: string;
  type: RoutineEventType;
  at: string;
}

export interface RoutineSession {
  id: string;
  childId: string;
  habitId: string;
  startedAt: string;
  completedAt?: string;
  phase: RoutinePhase;
  stars: number;
  events: RoutineEvent[];
}

export interface ObserverNote {
  id: string;
  sessionId: string;
  parentPromptCount: number;
  engagement: 'low' | 'medium' | 'high';
  leftRoutine: boolean;
  note: string;
  createdAt: string;
}

export interface SongGenerationRequest {
  id: string;
  childId: string;
  habitId: string;
  prompt: string;
  status: SongStatus;
  createdAt: string;
}

export interface GeneratedSong {
  id: string;
  requestId: string;
  title: string;
  lyrics: string;
  audioUrl?: string;
  status: SongStatus;
}

export interface Approval {
  id: string;
  songId: string;
  approved: boolean;
  reviewedAt?: string;
}

export const characters: Character[] = [
  { id: 'tori', name: '토리', species: '곰', accent: '#F5962A', background: '#FFF4E2' },
  { id: 'dali', name: '달이', species: '토끼', accent: '#9279DF', background: '#F2EEFF' },
  { id: 'soopi', name: '숲이', species: '여우', accent: '#84CC3C', background: '#EFF9E2' },
  { id: 'bboyi', name: '뽀이', species: '병아리', accent: '#3ECFB2', background: '#E2FAF6' }
];

export const habitTemplates: HabitTemplate[] = [
  { id: 'brush', emoji: '🪥', name: '이 닦기', durationSeconds: 120, starterLyric: '이를 닦자 시작!', progressLyric: '위아래로 싹싹싹' },
  { id: 'wash', emoji: '🫧', name: '손 씻기', durationSeconds: 60, starterLyric: '손을 씻자 시작!', progressLyric: '거품거품 뽀글뽀글' },
  { id: 'bed', emoji: '🛏️', name: '이불 정리', durationSeconds: 90, starterLyric: '이불을 반듯반듯', progressLyric: '내 침대가 반짝반짝' },
  { id: 'tidy', emoji: '🧸', name: '장난감 정리', durationSeconds: 120, starterLyric: '정리하자 시작!', progressLyric: '제자리에 쏙쏙쏙' }
];

export function renderPersonalizedLyrics(profile: ChildProfile, habit: HabitTemplate) {
  const name = profile.name || '친구';
  const food = profile.favoriteFood || '좋아하는 간식';
  const friend = profile.friendName || '동요 친구';
  const dream = profile.dreamIdentity === '기타' ? profile.dreamIdentityCustom : profile.dreamIdentity;
  const barrier = profile.habitBarrier || '조금 어려워도';
  return {
    cue: `${name}야, ${habit.name} 하러 가볼까?`,
    routine: `${name}야, ${habit.progressLyric}\n${barrier} 괜찮아\n${dream || food}처럼 반짝반짝\n${friend}와 같이 해봐요`,
    reward: `${name}야, 오늘도 해냈어요!`
  };
}
