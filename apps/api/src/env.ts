import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function unquote(value: string) {
  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

export function loadRootEnv() {
  const envPath = [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../../.env')].find((candidate) => existsSync(candidate));
  if (!envPath) return;

  for (const rawLine of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator < 1) continue;

    const key = line.slice(0, separator).trim();
    if (process.env[key]) continue;
    process.env[key] = unquote(line.slice(separator + 1));
  }
}

loadRootEnv();
