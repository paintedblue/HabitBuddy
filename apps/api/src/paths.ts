import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

declare const __dirname: string;

function firstExistingPath(candidates: string[]) {
  return candidates.find((candidate) => existsSync(candidate)) ?? candidates[0];
}

export function apiStaticUploadsPath(folder: 'reference-melodies' | 'song-seeds') {
  return firstExistingPath([
    resolve(__dirname, '..', 'uploads', folder),
    resolve(__dirname, '..', '..', 'uploads', folder),
    resolve(process.cwd(), 'apps', 'api', 'uploads', folder),
    resolve(process.cwd(), 'uploads', folder)
  ]);
}

export function apiWritableUploadsPath(folder: 'song-seeds') {
  return process.env.UPLOADS_DIR ? join(process.env.UPLOADS_DIR, folder) : apiStaticUploadsPath(folder);
}
