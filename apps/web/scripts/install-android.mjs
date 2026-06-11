import { spawnSync } from 'node:child_process';

const apkPath = 'android/app/build/outputs/apk/debug/app-debug.apk';
const install = spawnSync('adb', ['install', '-r', apkPath], { stdio: 'inherit' });

if (install.error) {
  console.error('adb 실행에 실패했습니다. Android SDK platform-tools가 설치되어 있고 PATH에 있는지 확인하세요.');
  process.exit(1);
}

process.exit(install.status ?? 0);
