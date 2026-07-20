import { spawnSync } from 'node:child_process';

const apkPath = 'android/app/build/outputs/apk/debug/app-debug.apk';
const packageName = 'com.habitbuddy.web';
const cacheTrimTarget = '2G';
const allowDataReset = process.env.ALLOW_ANDROID_DATA_RESET === '1';
const installArgs = ['install', '-r', apkPath];

function runAdb(args, options = {}) {
  const result = spawnSync('adb', args, {
    encoding: 'utf8',
    stdio: options.inherit ? 'inherit' : 'pipe'
  });
  if (result.error) {
    console.error('adb 실행에 실패했습니다. Android SDK platform-tools가 설치되어 있고 PATH에 있는지 확인하세요.');
    process.exit(1);
  }
  return result;
}

function printResult(result) {
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
}

function outputOf(result) {
  return `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
}

function printDataSpace(label) {
  const result = runAdb(['shell', 'df', '-h', '/data']);
  if (result.status !== 0) return;
  console.error(`\n${label}`);
  printResult(result);
}

function trimEmulatorCaches() {
  console.error(`\nAndroid 캐시 정리를 시도합니다: adb shell pm trim-caches ${cacheTrimTarget}`);
  const trim = runAdb(['shell', 'pm', 'trim-caches', cacheTrimTarget]);
  printResult(trim);
  printDataSpace('캐시 정리 후 /data 여유 공간:');
}

printDataSpace('설치 전 /data 여유 공간:');
const install = runAdb(installArgs);
printResult(install);

if (install.status === 0) process.exit(0);

const installOutput = outputOf(install);
const insufficientStorage = installOutput.includes('INSTALL_FAILED_INSUFFICIENT_STORAGE')
  || installOutput.includes('not enough space')
  || installOutput.includes('Requested internal only');

if (insufficientStorage) {
  trimEmulatorCaches();

  console.error('\n캐시 정리 후 덮어쓰기 설치를 다시 시도합니다.\n');
  const retryInstall = runAdb(installArgs);
  printResult(retryInstall);
  if (retryInstall.status === 0) process.exit(0);

  if (!allowDataReset) {
    console.error(`\nAndroid 저장공간이 부족해서 덮어쓰기 설치에 실패했습니다.`);
    console.error(`기존 ${packageName} 앱을 삭제하면 프로필, 동요, 세션 같은 로컬 데이터가 삭제되므로 자동 삭제는 중단합니다.`);
    console.error('데이터 삭제를 감수하고 재설치하려면 아래처럼 명시적으로 실행하세요:');
    console.error('ALLOW_ANDROID_DATA_RESET=1 npm run android:install --workspace apps/web\n');
    process.exit(retryInstall.status ?? 1);
  }

  console.error(`\nAndroid 저장공간이 부족해서 덮어쓰기 설치에 실패했습니다. ALLOW_ANDROID_DATA_RESET=1이 설정되어 기존 ${packageName} debug 앱을 삭제한 뒤 다시 설치합니다.`);
  console.error('주의: 에뮬레이터/기기의 이 앱 로컬 데이터가 삭제됩니다.\n');
  const uninstall = runAdb(['uninstall', packageName]);
  printResult(uninstall);
  if (uninstall.status !== 0 && !outputOf(uninstall).includes('Unknown package')) {
    process.exit(uninstall.status ?? 1);
  }

  trimEmulatorCaches();
  const reinstall = runAdb(['install', apkPath], { inherit: true });
  if (reinstall.status !== 0) {
    printDataSpace('설치 실패 후 /data 여유 공간:');
    console.error('\nAPK가 커서 에뮬레이터 내부 저장공간이 부족합니다. Android Studio Device Manager에서 이 에뮬레이터의 Wipe Data를 실행하거나, Internal Storage가 더 큰 AVD를 사용하세요.');
  }
  process.exit(reinstall.status ?? 1);
}

if (installOutput.includes('no devices/emulators found')) {
  console.error('\n연결된 Android 기기나 실행 중인 에뮬레이터가 없습니다. USB 디버깅을 켜거나 에뮬레이터를 실행한 뒤 다시 시도하세요.');
}

if (install.error) {
  console.error('adb 실행에 실패했습니다. Android SDK platform-tools가 설치되어 있고 PATH에 있는지 확인하세요.');
}

process.exit(install.status ?? 1);
