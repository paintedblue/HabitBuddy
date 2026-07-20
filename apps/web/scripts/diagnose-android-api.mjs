import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

function readEnvFile(path) {
  if (!existsSync(path)) return {};
  return Object.fromEntries(
    readFileSync(path, 'utf8')
      .split(/\r?\n/)
      .map((rawLine) => rawLine.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const separator = line.indexOf('=');
        const key = line.slice(0, separator).trim();
        const value = line.slice(separator + 1).trim().replace(/^["']|["']$/g, '');
        return [key, value];
      })
  );
}

function trimTrailingSlash(value) {
  return value.replace(/\/$/, '');
}

function listJsFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return listJsFiles(path);
    return entry.isFile() && entry.name.endsWith('.js') ? [path] : [];
  });
}

async function assertApiReachable(apiUrl) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const health = await fetch(`${apiUrl}/health`, { signal: controller.signal });
    if (health.ok) return;

    const response = await fetch(`${apiUrl}/songs/pending`, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`API returned HTTP ${response.status}`);
    }
  } finally {
    clearTimeout(timeout);
  }
}

function hostReachabilityUrl(nativeApiUrl, hostApiUrl) {
  try {
    const url = new URL(nativeApiUrl);
    if (url.hostname === '10.0.2.2') {
      const hostUrl = new URL(hostApiUrl);
      hostUrl.protocol = url.protocol;
      hostUrl.port = url.port;
      if (hostUrl.hostname === 'localhost') hostUrl.hostname = '127.0.0.1';
      return trimTrailingSlash(hostUrl.toString());
    }
  } catch {
    // Fall through to the host URL. A malformed native URL will still be caught
    // by the bundle assertion below because it must appear exactly in the build.
  }
  const reachableUrl = nativeApiUrl.startsWith('http') ? nativeApiUrl : hostApiUrl;
  try {
    const url = new URL(reachableUrl);
    if (url.hostname === 'localhost') url.hostname = '127.0.0.1';
    return trimTrailingSlash(url.toString());
  } catch {
    return reachableUrl;
  }
}

function assertAndroidBundleUsesNativeUrl(nativeApiUrl) {
  const publicAssetsDir = resolve(process.cwd(), 'android/app/src/main/assets/public/assets');
  const jsFiles = listJsFiles(publicAssetsDir);
  const matched = jsFiles.some((file) => readFileSync(file, 'utf8').includes(nativeApiUrl));
  if (!matched) {
    throw new Error(`Android bundle does not contain ${nativeApiUrl}. Rebuild with VITE_NATIVE_API_URL set.`);
  }
}

const rootEnv = readEnvFile(resolve(process.cwd(), '../../.env'));
const packageEnv = readEnvFile(resolve(process.cwd(), '.env'));
const env = { ...rootEnv, ...packageEnv, ...process.env };
const hostApiUrl = trimTrailingSlash(env.VITE_API_URL || 'http://localhost:3000');
const nativeApiUrl = trimTrailingSlash(env.VITE_NATIVE_API_URL || env.VITE_PUBLIC_API_BASE_URL || 'http://10.0.2.2:3000');
const reachableApiUrl = hostReachabilityUrl(nativeApiUrl, hostApiUrl);

console.log(`Android API diagnostic: host=${hostApiUrl}, emulator=${nativeApiUrl}, check=${reachableApiUrl}`);

try {
  await assertApiReachable(reachableApiUrl);
  assertAndroidBundleUsesNativeUrl(nativeApiUrl);
  console.log('Android API diagnostic passed.');
} catch (error) {
  console.error('\nAndroid API diagnostic failed.');
  console.error(error instanceof Error ? error.message : String(error));
  console.error('\n확인할 것:');
  console.error('- 배포 API를 쓰는 경우 VITE_NATIVE_API_URL=https://<Cloud Run URL> 이어야 합니다.');
  console.error('- 로컬 API를 쓰는 경우 API 서버를 먼저 실행하세요: npm run dev:api');
  console.error('- Android 에뮬레이터 로컬 테스트에서는 VITE_NATIVE_API_URL=http://10.0.2.2:3000 이어야 합니다.');
  console.error('- 실제 Android 기기 로컬 테스트에서는 Mac LAN IP 또는 HTTPS 터널 URL을 VITE_NATIVE_API_URL에 넣어야 합니다.\n');
  process.exit(1);
}
