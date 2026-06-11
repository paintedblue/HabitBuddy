import { useEffect, useMemo, useState } from 'react';
import { habitTemplates, renderPersonalizedLyrics, type ChildProfile, type HabitTemplate, type RoutineEventType, type RoutineSession } from '@habit-buddy/shared';
import { playCueSound, playRewardSound, startRoutineLoop, stopRoutineLoop } from '../audio/toneFactory';
import { habitBuddyDb, type LocalGeneratedSong } from '../storage/db';

export type RoutineStatus = 'home' | 'cue' | 'routine' | 'awaiting_parent' | 'reward';
export type CharacterMood = 'idle' | 'appear' | 'walk' | 'wave' | 'brush' | 'eat' | 'celebrate' | 'reward';

function event(type: RoutineEventType) {
  return { id: `event-${Date.now()}-${type}`, type, at: new Date().toISOString() };
}

function appendEvent(session: RoutineSession, type: RoutineEventType): RoutineSession {
  return { ...session, events: [...session.events, event(type)] };
}

function isBathroomHabit(habit: HabitTemplate | undefined) {
  return habit?.id === 'brush' || habit?.id === 'wash';
}

function routineMoodForHabit(habit: HabitTemplate): CharacterMood {
  if (habit.id === 'brush') return 'brush';
  if (habit.id === 'veggie') return 'eat';
  return 'celebrate';
}

export function useRoutineSession(profile: ChildProfile, parentPinLast4: string) {
  const [activeSession, setActiveSession] = useState<RoutineSession | null>(null);
  const [selectedHabit, setSelectedHabit] = useState<HabitTemplate>(habitTemplates[0]);
  const [selectedSong, setSelectedSong] = useState<LocalGeneratedSong | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [paused, setPaused] = useState(false);
  const [status, setStatus] = useState<RoutineStatus>('home');
  const [characterMood, setCharacterMood] = useState<CharacterMood>('idle');
  const [stage, setStage] = useState<'main' | 'bathroom'>('main');
  const [feedback, setFeedback] = useState('');

  const lyrics = useMemo(() => {
    const fallback = renderPersonalizedLyrics(profile, selectedHabit);
    if (!selectedSong) return fallback;
    const firstLine = selectedSong.lyrics.split('\n').find((line) => line.trim()) ?? selectedSong.title;
    return {
      cue: `${selectedSong.title}\n${firstLine}`,
      routine: selectedSong.lyrics,
      reward: `${selectedSong.title} 끝까지 해냈어요!\n반짝반짝 도장을 받아요.`
    };
  }, [profile, selectedHabit, selectedSong]);

  useEffect(() => {
    if (status !== 'routine' || paused || secondsLeft <= 0) return;
    const timer = window.setTimeout(() => setSecondsLeft((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [paused, secondsLeft, status]);

  useEffect(() => {
    if (status === 'routine' && secondsLeft === 0 && activeSession) {
      stopRoutineLoop();
      setPaused(true);
      setStatus('awaiting_parent');
      setFeedback('');
      setCharacterMood('wave');
    }
  }, [activeSession, secondsLeft, status]);

  async function startHabit(habit: HabitTemplate, song?: LocalGeneratedSong) {
    stopRoutineLoop();
    setSelectedHabit(habit);
    setSelectedSong(song ?? null);
    setStage('main');
    setStatus('cue');
    setPaused(false);
    setSecondsLeft(0);
    setCharacterMood('appear');
    playCueSound();
    const session: RoutineSession = {
      id: `routine-${Date.now()}`,
      childId: profile.id,
      habitId: habit.id,
      songId: song?.id,
      startedAt: new Date().toISOString(),
      phase: 'cue',
      stars: 0,
      events: [event('session_started'), event('cue_started')]
    };
    setActiveSession(session);
  }

  async function beginRoutine(habit = selectedHabit, session = activeSession) {
    if (!session) return;
    const routineSession = appendEvent(appendEvent({ ...session, phase: 'routine', habitId: habit.id }, 'cue_completed'), 'routine_started');
    setActiveSession(routineSession);
    setStatus('routine');
    setStage(isBathroomHabit(habit) ? 'bathroom' : 'main');
    setSecondsLeft(habit.durationSeconds);
    setPaused(false);
    setCharacterMood(routineMoodForHabit(habit));
    await startRoutineLoop();
  }

  function pause() {
    if (!activeSession || status !== 'routine') return;
    setPaused(true);
    stopRoutineLoop();
    setActiveSession(appendEvent(activeSession, 'routine_paused'));
  }

  async function resume() {
    if (!activeSession || status !== 'routine') return;
    setPaused(false);
    setActiveSession(appendEvent(activeSession, 'routine_resumed'));
    await startRoutineLoop();
  }

  async function resumeExtra() {
    if (!activeSession) return;
    setStatus('routine');
    setPaused(false);
    setSecondsLeft(30);
    setCharacterMood(routineMoodForHabit(selectedHabit));
    setActiveSession(appendEvent({ ...activeSession, phase: 'routine' }, 'routine_resumed'));
    await startRoutineLoop();
  }

  async function confirmParentPassword(value: string) {
    if (!activeSession) return false;
    if (value !== parentPinLast4) {
      setFeedback('비밀번호를 다시 확인해 주세요');
      return false;
    }
    const completed = appendEvent({
      ...activeSession,
      phase: 'reward',
      completedAt: new Date().toISOString(),
      stars: 2
    }, 'routine_completed');
    setActiveSession(completed);
    setStatus('reward');
    setPaused(false);
    setCharacterMood('reward');
    setFeedback('');
    stopRoutineLoop();
    playRewardSound();
    await habitBuddyDb.saveRoutineSession(completed);
    return true;
  }

  function markRewardViewed() {
    if (!activeSession || status !== 'reward') return;
    const viewed = appendEvent(activeSession, 'reward_viewed');
    setActiveSession(viewed);
    void habitBuddyDb.saveRoutineSession(viewed);
  }

  function returnHome() {
    stopRoutineLoop();
    setActiveSession(null);
    setStatus('home');
    setPaused(false);
    setSecondsLeft(0);
    setStage('main');
    setCharacterMood('idle');
    setFeedback('');
    setSelectedSong(null);
  }

  return {
    activeSession,
    selectedHabit,
    selectedSong,
    secondsLeft,
    paused,
    status,
    stage,
    characterMood,
    lyrics,
    feedback,
    setSelectedHabit,
    startHabit,
    beginRoutine,
    pause,
    resume,
    resumeExtra,
    confirmParentPassword,
    markRewardViewed,
    returnHome
  };
}
