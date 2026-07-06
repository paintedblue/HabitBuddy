import type { HabitId } from '@habit-buddy/shared';

export type PrepAnimId =
  | 'anim.wave'
  | 'anim.reach_forward'
  | 'anim.look_around'
  | 'anim.point'
  | 'anim.thumbs_up'
  | 'anim.stretch'
  | 'anim.yawn'
  | 'anim.mouth_open_wide';

export type PrepConfirmMode = 'tap' | 'timer' | 'sensor';
export type PrepHabitId = HabitId | 'sleep_early';

export interface PrepStep {
  id: string;
  order: number;
  cognitiveLine: { text: string };
  behavioralPrompt: { text: string };
  animId: PrepAnimId;
  confirmMode: PrepConfirmMode;
  timerSec?: number;
  emotionalLine: { text: string };
  estDurationSec: number;
}

export interface HabitPrepConfig {
  habitId: PrepHabitId;
  introLine: { text: string };
  skippable: boolean;
  steps: PrepStep[];
}

const introLine = { text: '우리 노래를 만드는 중이야! 그동안 같이 준비해볼까?' };

export const habitPrepConfigs: Record<PrepHabitId, HabitPrepConfig> = {
  brush: {
    habitId: 'brush',
    introLine,
    skippable: true,
    steps: [
      {
        id: 'brush_teeth.step_1',
        order: 0,
        cognitiveLine: { text: '이를 닦으면 충치가 생기지 않아.' },
        behavioralPrompt: { text: '우리 입을 크게 벌려볼까?' },
        animId: 'anim.mouth_open_wide',
        confirmMode: 'tap',
        emotionalLine: { text: '좋아, 준비 완료!' },
        estDurationSec: 4
      },
      {
        id: 'brush_teeth.step_2',
        order: 1,
        cognitiveLine: { text: '칫솔질하는 흉내를 내보면 실제로 더 잘할 수 있어.' },
        behavioralPrompt: { text: '손을 얼굴 앞에서 살랑살랑 흔들어볼까?' },
        animId: 'anim.wave',
        confirmMode: 'tap',
        emotionalLine: { text: '노래가 거의 다 만들어졌어!' },
        estDurationSec: 4
      }
    ]
  },
  wash: {
    habitId: 'wash',
    introLine,
    skippable: true,
    steps: [
      {
        id: 'wash_hands.step_1',
        order: 0,
        cognitiveLine: { text: '손을 씻으면 건강하게 놀 수 있어.' },
        behavioralPrompt: { text: '손을 앞으로 내밀어볼까?' },
        animId: 'anim.reach_forward',
        confirmMode: 'tap',
        emotionalLine: { text: '준비가 거의 다 됐어!' },
        estDurationSec: 4
      },
      {
        id: 'wash_hands.step_2',
        order: 1,
        cognitiveLine: { text: '손을 흔들면 물기를 털어낼 수 있어.' },
        behavioralPrompt: { text: '손을 흔들어볼까?' },
        animId: 'anim.wave',
        confirmMode: 'tap',
        emotionalLine: { text: '완벽해! 이제 씻으러 가자!' },
        estDurationSec: 4
      }
    ]
  },
  tidy: {
    habitId: 'tidy',
    introLine,
    skippable: true,
    steps: [
      {
        id: 'tidy_up.step_1',
        order: 0,
        cognitiveLine: { text: '어디에 뭐가 있는지 둘러보면 정리가 쉬워져.' },
        behavioralPrompt: { text: '우리 방을 한번 둘러볼까?' },
        animId: 'anim.look_around',
        confirmMode: 'tap',
        emotionalLine: { text: '좋아, 어디부터 치울지 찾았어!' },
        estDurationSec: 4
      },
      {
        id: 'tidy_up.step_2',
        order: 1,
        cognitiveLine: { text: '장난감이 있는 곳을 손으로 가리키면 더 잘 찾을 수 있어.' },
        behavioralPrompt: { text: '장난감이 있는 곳을 가리켜볼까?' },
        animId: 'anim.point',
        confirmMode: 'tap',
        emotionalLine: { text: '노래가 거의 다 만들어졌어!' },
        estDurationSec: 4
      }
    ]
  },
  clothes: {
    habitId: 'clothes',
    introLine,
    skippable: true,
    steps: [
      {
        id: 'clothes.step_1',
        order: 0,
        cognitiveLine: { text: '옷이 어디에 있는지 보면 정리가 쉬워져.' },
        behavioralPrompt: { text: '우리 옷장을 한번 둘러볼까?' },
        animId: 'anim.look_around',
        confirmMode: 'tap',
        emotionalLine: { text: '좋아, 어디부터 정리할지 찾았어!' },
        estDurationSec: 4
      },
      {
        id: 'clothes.step_2',
        order: 1,
        cognitiveLine: { text: '정리할 곳을 손으로 가리키면 더 잘 찾을 수 있어.' },
        behavioralPrompt: { text: '옷을 둘 곳을 가리켜볼까?' },
        animId: 'anim.point',
        confirmMode: 'tap',
        emotionalLine: { text: '노래가 거의 다 만들어졌어!' },
        estDurationSec: 4
      }
    ]
  },
  veggie: {
    habitId: 'veggie',
    introLine,
    skippable: true,
    steps: [
      {
        id: 'eat_vegetables.step_1',
        order: 0,
        cognitiveLine: { text: '채소를 먹으면 튼튼하게 자랄 수 있어.' },
        behavioralPrompt: { text: '맛있게 냠냠 먹는 표정을 지어볼까?' },
        animId: 'anim.mouth_open_wide',
        confirmMode: 'tap',
        emotionalLine: { text: '잘했어, 맛있겠다!' },
        estDurationSec: 4
      },
      {
        id: 'eat_vegetables.step_2',
        order: 1,
        cognitiveLine: { text: '골고루 먹으면 몸이 좋아해.' },
        behavioralPrompt: { text: '엄지 척! 해볼까?' },
        animId: 'anim.thumbs_up',
        confirmMode: 'tap',
        emotionalLine: { text: '노래가 거의 다 만들어졌어!' },
        estDurationSec: 4
      }
    ]
  },
  sleep_early: {
    habitId: 'sleep_early',
    introLine,
    skippable: true,
    steps: [
      {
        id: 'sleep_early.step_1',
        order: 0,
        cognitiveLine: { text: '일찍 자면 키가 쑥쑥 자라.' },
        behavioralPrompt: { text: '하품을 한번 해볼까?' },
        animId: 'anim.yawn',
        confirmMode: 'tap',
        emotionalLine: { text: '졸음이 솔솔 오네!' },
        estDurationSec: 4
      },
      {
        id: 'sleep_early.step_2',
        order: 1,
        cognitiveLine: { text: '몸을 쭉 펴면 편안하게 잠들 수 있어.' },
        behavioralPrompt: { text: '기지개를 쭉 켜볼까?' },
        animId: 'anim.stretch',
        confirmMode: 'tap',
        emotionalLine: { text: '노래가 거의 다 만들어졌어. 이제 자러 가자!' },
        estDurationSec: 4
      }
    ]
  }
};

export function prepConfigForHabit(habitId: HabitId) {
  return habitPrepConfigs[habitId];
}
