import { describe, expect, it } from 'vitest';
import type { HabitId, RoutineSession } from '@habit-buddy/shared';
import type { LocalGeneratedSong } from './storage/db';
import { habitPrepConfigs, prepConfigForHabit, type PrepAnimId } from './domain/prep';
import { buildRoutineSessionExport, canStartSong, getRoutineLyricLines, habitAnimationExpectations, routineSessionsToCsv, sessionExportPayload, songStatusLabel } from './productQuality';

const baseSong: LocalGeneratedSong = {
  id: 'song-1',
  childId: 'child-1',
  habitId: 'brush',
  title: '토리의 양치 노래',
  lyrics: '토리야 양치하자',
  status: 'approved',
  createdAt: '2026-07-01T00:00:00.000Z',
  inputs: {
    childName: '토리',
    hardHabit: '양치',
    habitBarrier: '민트 맛이 싫어요',
    dreamIdentity: '우주비행사',
    favoriteFood: '김밥',
    favoriteColor: '#FFCC2E'
  }
};

const sessions: RoutineSession[] = [{
  id: 'routine-1',
  childId: 'child-1',
  habitId: 'brush',
  songId: 'song-1',
  startedAt: '2026-07-01T00:00:00.000Z',
  completedAt: '2026-07-01T00:02:00.000Z',
  phase: 'reward',
  stars: 2,
  events: [
    { id: 'event-1', type: 'session_started', at: '2026-07-01T00:00:00.000Z' },
    { id: 'event-2', type: 'routine_completed', at: '2026-07-01T00:02:00.000Z' }
  ]
}];

describe('product quality helpers', () => {
  it('allows only approved songs to start a routine and labels blocked states', () => {
    expect(canStartSong(baseSong)).toBe(true);
    expect(canStartSong({ ...baseSong, status: 'generating' })).toBe(false);
    expect(songStatusLabel({ ...baseSong, status: 'queued' })).toBe('생성 대기 중');
    expect(songStatusLabel({ ...baseSong, status: 'generating' })).toBe('동요 생성 중');
    expect(songStatusLabel({ ...baseSong, status: 'failed', errorMessage: 'Suno timeout' })).toBe('Suno timeout');
  });

  it('removes section tags from routine lyric playback lines', () => {
    expect(getRoutineLyricLines('[Intro]\n[Verse 1]\n토리야 양치하자\n\n[Chorus]\n쓱쓱 싹싹')).toEqual([
      '토리야 양치하자',
      '쓱쓱 싹싹'
    ]);
  });

  it('exports research session logs as JSON and CSV without losing event timelines', () => {
    const exportedAt = new Date('2026-07-01T12:00:00.000Z');
    const json = buildRoutineSessionExport(sessions, exportedAt);
    const payload = sessionExportPayload(sessions, 'json', exportedAt);
    const csv = routineSessionsToCsv(sessions);

    expect(json).toMatchObject({
      schemaVersion: 1,
      exportedAt: '2026-07-01T12:00:00.000Z',
      totalSessions: 1,
      completedSessions: 1
    });
    expect(json.sessions[0]).toMatchObject({
      id: 'routine-1',
      habitName: '양치',
      eventCount: 2
    });
    expect(payload.fileName).toBe('habitbuddy-sessions-2026-07-01.json');
    expect(payload.body).toContain('"routine_completed"');
    expect(csv).toContain('session_id,child_id,habit_id');
    expect(csv).toContain('routine_completed');
  });

  it('declares a concrete 3D asset expectation for every habit', () => {
    expect(Object.keys(habitAnimationExpectations).sort()).toEqual(['brush', 'clothes', 'tidy', 'veggie', 'wash']);
    expect(habitAnimationExpectations.brush).toMatchObject({
      stage: 'bathroom',
      mood: 'brush',
      asset: '/assets/characters/final_squirrel_brushing_teeth.glb'
    });
    expect(habitAnimationExpectations.tidy.mood).toBe('mop');
  });

  it('defines prep flows for current habits using only reusable animation clips', () => {
    const reusableClips: PrepAnimId[] = [
      'anim.wave',
      'anim.reach_forward',
      'anim.look_around',
      'anim.point',
      'anim.thumbs_up',
      'anim.stretch',
      'anim.yawn',
      'anim.mouth_open_wide'
    ];

    expect(['brush', 'wash', 'tidy', 'clothes', 'veggie'].map((habitId) => prepConfigForHabit(habitId as HabitId).steps.length)).toEqual([2, 2, 2, 2, 2]);
    expect(habitPrepConfigs.sleep_early.steps).toHaveLength(2);

    Object.values(habitPrepConfigs).forEach((config) => {
      expect(config.introLine.text).toContain('준비해볼까');
      expect(config.skippable).toBe(true);
      config.steps.forEach((step, index) => {
        expect(step.order).toBe(index);
        expect(reusableClips).toContain(step.animId);
        expect(step.confirmMode).toBe('tap');
      });
    });
  });
});
