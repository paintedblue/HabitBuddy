# HabitBuddy 개발 변경 설명

이 문서는 현재 코드베이스에 반영된 주요 개발 내용을 설명한다. 핵심 목표는 AI 가사 생성 안정화, Suno 기반 동요 생성 음원의 영구 저장, Android 로컬 실행 안정화, 캐릭터 애니메이션 복구, 동요 생성 UI 개선이다.

## 1. AI 가사 생성 안정화

웹 앱의 AI 가사 생성 단계에서 빈 화면이나 멈춤이 발생하지 않도록 클라이언트와 API 양쪽에 방어 로직을 추가했다.

- `apps/web/src/api/songs.ts`
  - API 요청에 timeout을 적용한다.
  - `/songs/lyrics` 응답이 `{ title, lyrics }` 형태인지 검증한다.
  - 네트워크 오류, timeout, invalid response를 `SongApiError`로 표준화한다.
- `apps/api/src/songs/openai-lyrics.client.ts`
  - OpenAI lyrics 요청에 서버 측 timeout을 적용한다.
  - 응답 실패 시 명확한 에러 코드로 변환한다.
- `apps/web/src/main.tsx`
  - React root error boundary를 추가해 런타임 오류가 전체 빈 화면으로 끝나지 않게 한다.
- `apps/web/src/App.tsx`
  - 가사 생성 상태를 `idle`, `loading`, `success`, `error`로 분리했다.
  - 요청 id를 추적해 오래된 비동기 응답이 최신 화면 상태를 덮어쓰지 않게 했다.
  - 실패 시 사용자에게 원인별 메시지를 보여준다.

## 2. Suno 동요 음원 생성과 GCS 저장

Suno에서 받은 임시 음원 URL을 그대로 쓰지 않고, API 서버가 Google Cloud Storage로 복사한 뒤 앱에는 GCS 공개 URL을 저장하도록 바꿨다. 이렇게 해야 원본 임시 URL 만료나 접근 실패와 관계없이 생성된 동요를 계속 재생할 수 있다.

- `apps/api/src/songs/audio-storage.service.ts`
  - Suno 음원 URL을 다운로드한다.
  - `AUDIO_BUCKET_NAME` 버킷의 `generated-songs/{requestId}/{songId}.mp3` 경로에 업로드한다.
  - `AUDIO_PUBLIC_BASE_URL`이 있으면 해당 base URL을 사용하고, 없으면 `https://storage.googleapis.com/{bucket}/{object}` 형태로 공개 URL을 만든다.
- `apps/api/src/songs/songs.service.ts`
  - Suno 생성 완료 시 GCS 업로드를 먼저 수행한다.
  - `audioUrl`에는 GCS URL을 저장한다.
  - `sourceAudioUrl`에는 Suno 원본 URL을 보존한다.
  - 업로드 실패 시 요청을 실패 상태로 처리해 잘못된 fallback 음원이 재생되지 않게 한다.
- `apps/web/src/state/useRoutineSession.ts`
  - 재생 우선순위를 `audioUrl`, `streamAudioUrl`, `sourceAudioUrl` 순서로 정리했다.
- `apps/web/src/productQuality.ts`
  - 승인된 동요라도 `audioUrl`이 없으면 실제 루틴 시작 대상으로 보지 않는다.

필요한 환경변수:

```env
AUDIO_BUCKET_NAME=habitbuddy-generated-songs-habitbuddy-young
AUDIO_PUBLIC_BASE_URL=https://storage.googleapis.com/habitbuddy-generated-songs-habitbuddy-young
```

로컬 개발에서는 Google ADC 인증이 필요하다.

```sh
gcloud auth application-default login
gcloud auth application-default set-quota-project habitbuddy-young
```

## 3. 동요 생성 UI 개선

동요가 생성되는 동안 기존 대기 화면 대신 `songmakingprocess_ui.png` 기준의 생성 진행 UI를 적용했다.

- `apps/web/src/App.tsx`
  - 동요 생성 단계에서 진행률 카드와 상태 문구를 보여준다.
  - 아래 문구 중 하나가 10초마다 랜덤으로 바뀐다.
    - 동요에 예쁜 반주를 넣고 있어요
    - 목소리가 동요랑 잘 어울리게 만들고 있어요
    - 음표들이 통통 뛰며 동요를 만들고 있어요
    - 따라 부르기 쉽게 동요를 다듬고 있어요
    - 조금만 기다리면 신나는 동요가 나와요
- `apps/web/src/styles.css`
  - 생성 대기 화면, 진행률 바, 모바일 반응형 스타일을 추가했다.

## 4. Android 로컬 실행 안정화

Android 에뮬레이터와 Mac host의 API 주소 차이 때문에 진단이 실패하던 문제를 수정했다.

- `apps/web/scripts/diagnose-android-api.mjs`
  - Android 앱 번들에는 `VITE_NATIVE_API_URL=http://10.0.2.2:3000`이 들어가는지 확인한다.
  - Mac에서 API reachable 검사를 할 때는 `http://127.0.0.1:3000`으로 변환해 확인한다.
- `apps/web/scripts/install-android.mjs`
  - Android 설치는 streaming install을 사용한다.
  - 저장공간 부족 시 자동으로 앱을 삭제하지 않는다.
  - 로컬 데이터 삭제 재설치가 필요할 때만 `ALLOW_ANDROID_DATA_RESET=1`을 명시해야 한다.
- `apps/web/vite.config.ts`, `apps/web/package.json`
  - Android sync 시 PWA service worker 생성을 비활성화해 Capacitor 빌드 충돌 가능성을 줄였다.

## 5. 캐릭터 애니메이션 복구

Android APK에 대용량 캐릭터 모델을 모두 포함하면 APK가 커져 설치 실패가 발생했다. 이미 설정된 GCS 캐릭터 에셋 URL을 활용해 Android에서는 원격 로드하도록 정리했다.

- `apps/web/src/components/HabitScene.tsx`
  - `VITE_CHARACTER_ASSET_BASE_URL`이 있으면 캐릭터 FBX/GLB/texture를 원격 URL에서 로드한다.
  - 없으면 기존처럼 `/assets/characters/...` 로컬 파일을 사용한다.
- `apps/web/scripts/prune-android-assets.mjs`
  - 원격 캐릭터 URL이 설정된 경우 Android dist에서 `assets/characters/**`를 제거한다.
  - 이 변경으로 debug APK 크기가 약 `138M`에서 `17M` 수준으로 줄었다.

캐릭터 원격 에셋 설정:

```env
VITE_CHARACTER_ASSET_BASE_URL=https://storage.googleapis.com/habit-buddy-character-assets/characters
```

## 6. 배포 설정

Cloud Run 배포와 GCS 음원 저장에 필요한 설정을 보강했다.

- `cloudbuild.yaml`
  - `AUDIO_BUCKET_NAME`, `AUDIO_PUBLIC_BASE_URL` substitutions를 추가했다.
- `docs/google-cloud-deployment.md`
  - 음원 저장용 GCS 버킷 생성, 공개 읽기 권한, Cloud Run 서비스 계정 업로드 권한 설정 절차를 문서화했다.
- `.gcloudignore`, `.dockerignore`, `.gitignore`
  - 빌드와 배포에 불필요한 대용량 파일, 임시 업로드, 로컬 환경 파일이 포함되지 않도록 정리했다.

## 7. 검증 기준

주요 변경 후 아래 검증을 통과해야 한다.

```sh
npm run typecheck --workspace apps/web
npm run test --workspace apps/web
npm run build --workspace apps/web
npm run typecheck --workspace apps/api
npm run test --workspace apps/api
npm run build --workspace apps/api
npm run android:diagnose:api --workspace apps/web
```

Android 앱 설치까지 확인하려면 다음 명령을 사용한다.

```sh
npm run android:install --workspace apps/web
```

저장공간 부족으로 앱 삭제 재설치가 필요한 경우에만 아래 명령을 사용한다. 이 경우 Android 앱 안의 로컬 프로필, 동요, 세션 데이터가 삭제된다.

```sh
ALLOW_ANDROID_DATA_RESET=1 npm run android:install --workspace apps/web
```
