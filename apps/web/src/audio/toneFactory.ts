let routineOscillator: OscillatorNode | null = null;
let routineGain: GainNode | null = null;

function getAudioContext() {
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  return new AudioContextCtor();
}

function playTone(frequency: number, duration = 0.16, type: OscillatorType = 'sine') {
  try {
    const audio = getAudioContext();
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, audio.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + duration);
    osc.connect(gain).connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + duration + 0.02);
  } catch {
    // Audio is optional in restricted browser contexts.
  }
}

export function playCueSound() {
  playTone(660, 0.12, 'triangle');
  window.setTimeout(() => playTone(880, 0.16, 'triangle'), 120);
}

export function playRewardSound() {
  [523, 659, 784, 1046].forEach((frequency, index) => {
    window.setTimeout(() => playTone(frequency, 0.16, 'sine'), index * 95);
  });
}

export async function startRoutineLoop() {
  if (routineOscillator) return;
  try {
    const audio = getAudioContext();
    routineOscillator = audio.createOscillator();
    routineGain = audio.createGain();
    routineOscillator.type = 'triangle';
    routineOscillator.frequency.value = 220;
    routineGain.gain.value = 0.018;
    routineOscillator.connect(routineGain).connect(audio.destination);
    routineOscillator.start();
  } catch {
    routineOscillator = null;
    routineGain = null;
  }
}

export function stopRoutineLoop() {
  routineOscillator?.stop();
  routineOscillator = null;
  routineGain = null;
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
