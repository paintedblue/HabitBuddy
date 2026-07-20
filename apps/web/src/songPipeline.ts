import { habitTemplates, type ChildProfile, type GeneratedSong, type HabitId, type SongGenerationInputs, type SongGenerationRequest } from '@habit-buddy/shared';
import { colorChoices } from './domain/defaults';
import type { LocalGeneratedSong } from './storage/db';
import type { ReferenceAudio } from './api/songs';

export type SongPreview = { title: string; lyrics: string };

export function habitIdForProfile(profile: ChildProfile): HabitId {
  return habitTemplates.find((habit) => habit.name === profile.hardHabit)?.id ?? habitTemplates[0].id;
}

export function createLocalSong(profile: ChildProfile, preview: SongPreview): LocalGeneratedSong {
  const now = new Date().toISOString();
  return {
    id: `song-${Date.now()}-${Math.round(Math.random() * 10000)}`,
    childId: profile.id,
    habitId: habitIdForProfile(profile),
    title: preview.title,
    lyrics: preview.lyrics,
    melodyPresetId: profile.melodyPresetId,
    status: 'approved',
    createdAt: now,
    inputs: localSongInputs(profile)
  };
}

export function buildLyricsGenerationInputs(profile: ChildProfile): SongGenerationInputs {
  return {
    childName: profile.name,
    selectedHabits: profile.hardHabit,
    dislikedHabit: profile.hardHabit,
    dislikedReason: profile.habitBarrier,
    aspiration: profile.dreamIdentityCustom || profile.dreamIdentity,
    foodKeyword: profile.favoriteFood,
    colorKeyword: colorChoices.find((item) => item.color === profile.favoriteColor)?.label ?? profile.favoriteColor,
    melodyPresetId: profile.melodyPresetId,
    rhythmPresetId: profile.rhythmPresetId,
    instrumentPresetId: profile.instrumentPresetId,
    generationMode: 'text'
  };
}

export function buildSongGenerationInputs(profile: ChildProfile, referenceAudio: ReferenceAudio): SongGenerationInputs {
  return {
    childName: profile.name,
    selectedHabits: profile.hardHabit,
    dislikedHabit: profile.hardHabit,
    dislikedReason: profile.habitBarrier,
    aspiration: profile.dreamIdentityCustom || profile.dreamIdentity,
    foodKeyword: profile.favoriteFood,
    colorKeyword: colorChoices.find((item) => item.color === profile.favoriteColor)?.label ?? profile.favoriteColor,
    melodyPresetId: profile.melodyPresetId,
    rhythmPresetId: profile.rhythmPresetId,
    instrumentPresetId: profile.instrumentPresetId,
    generationMode: 'reference_audio',
    referenceAudioUrl: referenceAudio.url,
    referenceAudioFileName: referenceAudio.fileName,
    referenceAudioDurationSeconds: referenceAudio.durationSeconds,
    sunoContinueAtSeconds: referenceAudio.durationSeconds
  };
}

export function createQueuedSunoSong(profile: ChildProfile, preview: SongPreview, request: SongGenerationRequest): LocalGeneratedSong {
  const now = new Date().toISOString();
  return {
    id: `song-${request.id}`,
    requestId: request.id,
    childId: profile.id,
    habitId: habitIdForProfile(profile),
    title: preview.title,
    lyrics: preview.lyrics,
    externalTaskId: request.externalTaskId,
    provider: 'sunoapi',
    melodyPresetId: profile.melodyPresetId,
    referenceAudioUrl: request.inputs?.referenceAudioUrl,
    referenceAudioFileName: request.inputs?.referenceAudioFileName,
    referenceAudioDurationSeconds: request.inputs?.referenceAudioDurationSeconds,
    errorCode: request.errorCode,
    errorMessage: request.errorMessage,
    status: request.status === 'failed'
      ? 'failed'
      : request.status === 'generating'
        ? 'generating'
        : 'queued',
    createdAt: now,
    inputs: localSongInputs(profile)
  };
}

export function mergeSyncedSong(localSong: LocalGeneratedSong, synced: SongGenerationRequest | GeneratedSong): LocalGeneratedSong {
  if (isGeneratedSong(synced)) {
    return {
      ...localSong,
      title: synced.title || localSong.title,
      lyrics: synced.lyrics || localSong.lyrics,
      audioUrl: synced.audioUrl,
      streamAudioUrl: synced.streamAudioUrl,
      sourceAudioUrl: synced.sourceAudioUrl,
      imageUrl: synced.imageUrl,
      externalSongId: synced.externalSongId,
      durationSeconds: synced.durationSeconds,
      modelName: synced.modelName,
      melodyPresetId: synced.melodyPresetId ?? localSong.melodyPresetId,
      referenceAudioUrl: synced.referenceAudioUrl ?? localSong.referenceAudioUrl,
      referenceAudioFileName: synced.referenceAudioFileName ?? localSong.referenceAudioFileName,
      referenceAudioDurationSeconds: synced.referenceAudioDurationSeconds ?? localSong.referenceAudioDurationSeconds,
      errorCode: undefined,
      errorMessage: undefined,
      status: synced.status === 'approved' ? 'approved' : localSong.status
    };
  }

  if (synced.status === localSong.status && synced.externalTaskId === localSong.externalTaskId && synced.errorCode === localSong.errorCode) {
    return localSong;
  }

  return {
    ...localSong,
    externalTaskId: synced.externalTaskId ?? localSong.externalTaskId,
    errorCode: synced.errorCode,
    errorMessage: synced.errorMessage,
    status: synced.status === 'failed'
      ? 'failed'
      : synced.status === 'generating'
        ? 'generating'
        : synced.status === 'queued'
          ? 'queued'
          : localSong.status
  };
}

function localSongInputs(profile: ChildProfile) {
  return {
    childName: profile.name,
    hardHabit: profile.hardHabit,
    habitBarrier: profile.habitBarrier,
    dreamIdentity: profile.dreamIdentityCustom || profile.dreamIdentity,
    favoriteFood: profile.favoriteFood,
    favoriteColor: profile.favoriteColor
  };
}

function isGeneratedSong(value: SongGenerationRequest | GeneratedSong): value is GeneratedSong {
  return 'requestId' in value && ('audioUrl' in value || 'streamAudioUrl' in value || value.status === 'approved');
}
