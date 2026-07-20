import { melodyPresetById, type SongGenerationRequest } from '@habit-buddy/shared';

export function buildSunoExtendInput(request: SongGenerationRequest) {
  const referenceAudioUrl = request.inputs?.referenceAudioUrl;
  if (!referenceAudioUrl) return null;

  const melody = melodyPresetById(request.inputs?.melodyPresetId);
  return {
    uploadUrl: referenceAudioUrl,
    prompt: request.prompt,
    style: melody.prompt,
    title: `${request.inputs?.childName || '친구'}의 ${request.inputs?.dislikedHabit || request.habitId} ${melody.label}`.slice(0, 80),
    continueAt: safeSunoContinueAt(request.inputs?.sunoContinueAtSeconds ?? request.inputs?.referenceAudioDurationSeconds)
  };
}

export function safeSunoContinueAt(value: unknown) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return defaultSunoContinueAt();
  if (seconds > 10) return defaultSunoContinueAt();
  return seconds;
}

function defaultSunoContinueAt() {
  const value = Number(process.env.SUNO_CONTINUE_AT_SECONDS ?? 5);
  return Number.isFinite(value) && value > 0 ? value : 5;
}
