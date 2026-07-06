import { habitTemplates, type HabitId, type RoutineSession } from '@habit-buddy/shared';
import type { LocalGeneratedSong } from './storage/db';

export type SessionExportFormat = 'json' | 'csv';

export const habitAnimationExpectations: Record<HabitId, {
  stage: 'main' | 'bathroom';
  mood: 'brush' | 'wash' | 'eat' | 'mop' | 'celebrate';
  asset: string;
}> = {
  brush: { stage: 'bathroom', mood: 'brush', asset: '/assets/characters/final_squirrel_brushing_teeth.glb' },
  wash: { stage: 'bathroom', mood: 'wash', asset: '/assets/characters/movement/fox_washing_hands.glb' },
  veggie: { stage: 'main', mood: 'eat', asset: '/assets/characters/squirrel/squirrel_eat_chew_v1.glb' },
  tidy: { stage: 'main', mood: 'mop', asset: '/assets/characters/char1_mopping_loop_fixed.fbx' },
  clothes: { stage: 'main', mood: 'mop', asset: '/assets/characters/char1_mopping_loop_fixed.fbx' }
};

const lyricSectionPattern = /^\[(?:verse|chorus|outro|bridge|intro|pre-chorus|post-chorus)[^\]]*\]$/i;

export function canStartSong(song: LocalGeneratedSong) {
  return song.status === 'approved';
}

export function songStatusLabel(song: LocalGeneratedSong) {
  if (song.status === 'queued') return '생성 대기 중';
  if (song.status === 'generating') return '동요 생성 중';
  if (song.status === 'failed') return song.errorMessage ?? '생성 실패';
  return '아직 시작할 수 없어요';
}

export function getRoutineLyricLines(lyrics: string) {
  return lyrics
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !lyricSectionPattern.test(line));
}

export function buildRoutineSessionExport(sessions: RoutineSession[], exportedAt = new Date()) {
  return {
    schemaVersion: 1,
    exportedAt: exportedAt.toISOString(),
    totalSessions: sessions.length,
    completedSessions: sessions.filter((session) => !!session.completedAt).length,
    sessions: sessions.map((session) => ({
      id: session.id,
      childId: session.childId,
      habitId: session.habitId,
      habitName: habitTemplates.find((habit) => habit.id === session.habitId)?.name ?? session.habitId,
      songId: session.songId ?? null,
      startedAt: session.startedAt,
      completedAt: session.completedAt ?? null,
      phase: session.phase,
      stars: session.stars,
      eventCount: session.events.length,
      events: session.events
    }))
  };
}

export function routineSessionsToCsv(sessions: RoutineSession[]) {
  const rows = [
    ['session_id', 'child_id', 'habit_id', 'habit_name', 'song_id', 'started_at', 'completed_at', 'phase', 'stars', 'event_count', 'events_json'],
    ...sessions.map((session) => [
      session.id,
      session.childId,
      session.habitId,
      habitTemplates.find((habit) => habit.id === session.habitId)?.name ?? session.habitId,
      session.songId ?? '',
      session.startedAt,
      session.completedAt ?? '',
      session.phase,
      String(session.stars),
      String(session.events.length),
      JSON.stringify(session.events)
    ])
  ];
  return rows.map((row) => row.map(csvCell).join(',')).join('\n');
}

export function sessionExportFileName(format: SessionExportFormat, date = new Date()) {
  const yyyy = date.getFullYear();
  const mm = `${date.getMonth() + 1}`.padStart(2, '0');
  const dd = `${date.getDate()}`.padStart(2, '0');
  return `habitbuddy-sessions-${yyyy}-${mm}-${dd}.${format}`;
}

export function sessionExportPayload(sessions: RoutineSession[], format: SessionExportFormat, exportedAt = new Date()) {
  if (format === 'json') {
    return {
      fileName: sessionExportFileName('json', exportedAt),
      mimeType: 'application/json',
      body: JSON.stringify(buildRoutineSessionExport(sessions, exportedAt), null, 2)
    };
  }
  return {
    fileName: sessionExportFileName('csv', exportedAt),
    mimeType: 'text/csv;charset=utf-8',
    body: routineSessionsToCsv(sessions)
  };
}

function csvCell(value: string) {
  if (!/[",\n\r]/.test(value)) return value;
  return `"${value.replaceAll('"', '""')}"`;
}
