import { existsSync, readFileSync } from 'node:fs';

function readEnvFile() {
  if (!existsSync('.env')) return {};
  return Object.fromEntries(
    readFileSync('.env', 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const index = line.indexOf('=');
        return [line.slice(0, index), line.slice(index + 1)];
      })
  );
}

const envFile = readEnvFile();
const apiUrl = (process.env.VITE_API_URL || process.env.API_URL || envFile.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');
const publicApiUrl = (process.env.VITE_PUBLIC_API_BASE_URL || process.env.PUBLIC_API_BASE_URL || envFile.VITE_PUBLIC_API_BASE_URL || envFile.PUBLIC_API_BASE_URL || apiUrl).replace(/\/$/, '');
const maxWaitMs = Number(process.env.SUNO_MAX_WAIT_MS || envFile.SUNO_MAX_WAIT_MS || 180000);
const pollIntervalMs = Number(process.env.SUNO_POLL_INTERVAL_MS || envFile.SUNO_POLL_INTERVAL_MS || 5000);

async function postJson(path, body) {
  const response = await fetch(`${apiUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const json = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`${path} failed with ${response.status}: ${JSON.stringify(json)}`);
  }
  return json;
}

async function verifyReferenceAudio(url) {
  const response = await fetch(url, { method: 'HEAD' });
  if (!response.ok) throw new Error(`Reference audio is not reachable: ${response.status} ${url}`);
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('audio')) throw new Error(`Reference URL did not return audio content-type: ${contentType}`);
}

async function main() {
  const referenceAudioUrl = `${publicApiUrl}/reference-melodies/princess_bgm_cut.mp3`;
  console.log(`API: ${apiUrl}`);
  console.log(`Reference: ${referenceAudioUrl}`);
  await verifyReferenceAudio(referenceAudioUrl);

  const profileInputs = {
    childName: '토리',
    selectedHabits: '양치',
    dislikedHabit: '양치',
    dislikedReason: '민트 맛이 싫어요',
    aspiration: '우주비행사',
    foodKeyword: '김밥',
    colorKeyword: '노랑',
    melodyPresetId: 'princess'
  };

  const lyrics = await postJson('/songs/lyrics', {
    childId: 'smoke-child',
    habitId: 'brush',
    inputs: {
      ...profileInputs,
      generationMode: 'text'
    }
  });
  console.log(`Lyrics generated: ${lyrics.title} (${lyrics.modelName})`);

  const request = await postJson('/songs/requests', {
    childId: 'smoke-child',
    habitId: 'brush',
    prompt: lyrics.lyrics,
    inputs: {
      ...profileInputs,
      generationMode: 'reference_audio',
      referenceAudioUrl,
      referenceAudioFileName: 'princess_bgm_cut.mp3',
      referenceAudioDurationSeconds: 20,
      sunoContinueAtSeconds: 20
    }
  });
  console.log(`Suno request queued: ${request.id}`);

  const started = Date.now();
  let latest = request;
  while (Date.now() - started < maxWaitMs) {
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    latest = await postJson(`/songs/requests/${request.id}/sync`, {});
    console.log(`Status: ${latest.status}${latest.externalTaskId ? ` task=${latest.externalTaskId}` : ''}`);
    if (latest.status === 'approved' && (latest.audioUrl || latest.streamAudioUrl)) {
      console.log(`Completed: ${latest.streamAudioUrl || latest.audioUrl}`);
      return;
    }
    if (latest.status === 'failed') {
      throw new Error(`Suno generation failed: ${latest.errorCode || 'unknown'} ${latest.errorMessage || ''}`.trim());
    }
  }
  throw new Error(`Timed out after ${maxWaitMs}ms waiting for Suno completion`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
