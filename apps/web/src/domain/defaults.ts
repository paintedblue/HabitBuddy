import type { ChildProfile } from '@habit-buddy/shared';

export const defaultProfile: ChildProfile = {
  id: 'local-child',
  name: '',
  hardHabit: '양치하기',
  habitBarrier: '귀찮아요',
  dreamIdentity: '우주비행사',
  dreamIdentityCustom: '',
  favoriteFood: '',
  favoriteColor: '#83D13B',
  friendName: '동요 친구',
  characterId: 'tori',
  melodyPresetId: 'energetic',
  rhythmPresetId: 'clapClap',
  instrumentPresetId: 'piano'
};

export const habitBarrierChoices: Record<string, string[]> = {
  '양치하기': ['맛이 싫어요', '귀찮아요', '입에 넣는 느낌이 싫어요'],
  '손 씻기': ['물이 차가워요', '비누 느낌이 싫어요', '빨리 놀고 싶어요'],
  '방 정리하기': ['어디에 둘지 몰라요', '귀찮아요', '너무 많아요'],
  '일찍자기': ['어두운 게 무서워요', '더 놀고 싶어요', '잠이 안 와요'],
  '채소먹기': ['맛이 낯설어요', '씹기 힘들어요', '먹기 싫어요'],
  '책 읽기': ['글자가 어려워요', '가만히 있기 힘들어요', '다른 걸 하고 싶어요']
};

export const identityChoices = [
  { icon: '🚒', label: '소방관' },
  { icon: '🩺', label: '의사' },
  { icon: '🚀', label: '우주비행사' },
  { icon: '⚽', label: '운동선수' }
];

export const foodChoices = [
  { icon: '🍕', label: '피자' },
  { icon: '🍜', label: '라면' },
  { icon: '🌶️', label: '떡볶이' },
  { icon: '🍙', label: '김밥' },
  { icon: '🍗', label: '치킨' },
  { icon: '🍦', label: '아이스크림' }
];

export const colorChoices = [
  { label: '주황', color: '#F5962A' },
  { label: '노랑', color: '#FFCC2E' },
  { label: '연두', color: '#B8D21E' },
  { label: '연초록', color: '#83D13B' },
  { label: '민트', color: '#43CDB6' },
  { label: '하늘', color: '#77C2E4' },
  { label: '파랑', color: '#5DA4DC' },
  { label: '남색', color: '#3F73F2' },
  { label: '보라', color: '#8D73D9' },
  { label: '분홍', color: '#F57EA6' },
  { label: '초록', color: '#35CC00' }
];
