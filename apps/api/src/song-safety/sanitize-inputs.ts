import rules from './safety-rules.json';
import type { ChildInputs, CleanInputs } from './types.js';

const fallbackInputs = {
  name: '친구',
  habit: '습관',
  dislikedReason: '조금 어려운 마음',
  aspiration: '멋진 친구',
  favoriteFood: '든든한 간식',
  favoriteColor: '반짝이는 색',
  actionCue: '천천히 같이 해',
  melody: '밝은 동요'
} as const;

const unsafeInputPatterns = rules.unsafeInputPatterns.map((pattern) => new RegExp(pattern, 'i'));

function cleanText(value: string | undefined, fallback: string, field: string, neutralizedFields: string[]) {
  const trimmed = value?.trim().replace(/\s+/g, ' ') ?? '';
  if (!trimmed || unsafeInputPatterns.some((pattern) => pattern.test(trimmed))) {
    neutralizedFields.push(field);
    return fallback;
  }
  return trimmed.slice(0, 32);
}

export function sanitizeInputs(inputs: ChildInputs): CleanInputs {
  const neutralizedFields: string[] = [];
  return {
    childId: cleanText(inputs.childId, 'anonymous-child', 'childId', neutralizedFields),
    name: cleanText(inputs.name, fallbackInputs.name, 'name', neutralizedFields),
    habit: cleanText(inputs.habit, fallbackInputs.habit, 'habit', neutralizedFields),
    dislikedReason: cleanText(inputs.dislikedReason, fallbackInputs.dislikedReason, 'dislikedReason', neutralizedFields),
    aspiration: cleanText(inputs.aspiration, fallbackInputs.aspiration, 'aspiration', neutralizedFields),
    favoriteFood: cleanText(inputs.favoriteFood, fallbackInputs.favoriteFood, 'favoriteFood', neutralizedFields),
    favoriteColor: cleanText(inputs.favoriteColor, fallbackInputs.favoriteColor, 'favoriteColor', neutralizedFields),
    actionCue: cleanText(inputs.actionCue, fallbackInputs.actionCue, 'actionCue', neutralizedFields),
    melody: cleanText(inputs.melody, fallbackInputs.melody, 'melody', neutralizedFields),
    neutralizedFields
  };
}
