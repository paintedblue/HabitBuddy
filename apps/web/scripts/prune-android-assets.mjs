import { existsSync, readFileSync } from 'node:fs';
import { readdir, rm } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';

const distRoot = join(process.cwd(), 'dist');
const envFiles = [resolve(process.cwd(), '../../.env'), resolve(process.cwd(), '.env')];
const characterAssetBaseUrl = process.env.VITE_CHARACTER_ASSET_BASE_URL || envFiles
  .filter(existsSync)
  .map((path) => readFileSync(path, 'utf8').match(/^VITE_CHARACTER_ASSET_BASE_URL=(.+)$/m)?.[1]?.trim() ?? '')
  .find(Boolean) || '';
const pruneBundledCharacters = characterAssetBaseUrl.length > 0;

const allowedAssetFiles = new Set([
  'assets/audio/princess_bgm_cut.mp3',
  'assets/backgrounds/bathroom.png',
  'assets/backgrounds/main_room.png',
  'assets/characters/FoxStopped.fbx',
  'assets/characters/RumbaDancing.fbx',
  'assets/characters/Waving.fbx',
  'assets/characters/char1_mopping_loop_fixed.fbx',
  'assets/characters/final_squirrel_brushing_teeth.glb',
  'assets/characters/fox_brushing_teeth_v4.glb',
  'assets/characters/movement/fox_washing_hands.glb',
  'assets/characters/squirrel/squirrel_eat_chew_v1.glb',
  'assets/characters/texture_0.png',
  'assets/figures/bathroom.png',
  'assets/figures/brushing_teeth.png',
  'assets/figures/main_room.png',
  'assets/fonts/Pretendard-Regular.otf'
]);

async function listFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = join(dir, entry.name);
      return entry.isDirectory() ? listFiles(path) : [path];
    })
  );

  return files.flat();
}

const assetRoot = join(distRoot, 'assets');
const assetFiles = await listFiles(assetRoot);
let pruned = 0;

await Promise.all(
  assetFiles.map(async (file) => {
    const assetPath = relative(distRoot, file);
    if (!assetPath.match(/^assets\/(audio|backgrounds|characters|figures|fonts)\//)) return;
    if (pruneBundledCharacters && assetPath.startsWith('assets/characters/')) {
      await rm(file, { force: true });
      pruned += 1;
      return;
    }
    if (allowedAssetFiles.has(assetPath)) return;

    await rm(file, { force: true });
    pruned += 1;
  })
);

console.log(`Pruned ${pruned} non-allowlisted Android asset files from dist.`);
