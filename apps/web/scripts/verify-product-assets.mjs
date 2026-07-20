import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const requiredAssets = [
  'public/assets/audio/princess_bgm_cut.mp3',
  'public/assets/backgrounds/main_room.png',
  'public/assets/backgrounds/bathroom.png',
  'public/assets/characters/FoxStopped.fbx',
  'public/assets/characters/Waving.fbx',
  'public/assets/characters/RumbaDancing.fbx',
  'public/assets/characters/texture_0.png',
  'public/assets/characters/final_squirrel_brushing_teeth.glb',
  'public/assets/characters/movement/fox_washing_hands.glb',
  'public/assets/characters/squirrel/squirrel_eat_chew_v1.glb',
  'public/assets/characters/char1_mopping_loop_fixed.fbx'
];

const results = requiredAssets.map((asset) => {
  const path = join(root, asset);
  if (!existsSync(path)) return { asset, ok: false, size: 0 };
  return { asset, ok: true, size: statSync(path).size };
});

for (const result of results) {
  const status = result.ok && result.size > 0 ? 'ok' : 'missing';
  console.log(`${status}\t${result.asset}\t${result.size}`);
}

const failed = results.filter((result) => !result.ok || result.size <= 0);
if (failed.length > 0) {
  console.error(`Missing or empty product assets: ${failed.map((result) => result.asset).join(', ')}`);
  process.exit(1);
}
