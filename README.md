# HabitBuddy / 동요 친구

`research.md`의 연구 질문에 맞춘 유아용 루틴 컴패니언 프로토타입입니다.

## 구성

- `apps/web` — React/Vite 기반 3D 루틴 클라이언트
- `apps/mobile` — 초기 2D 연구 프로토타입
- `apps/api` — NestJS API, OpenAI 가사 생성, Suno 동요 생성, PostgreSQL 저장
- `packages/shared` — 앱과 서버가 공유하는 타입/기본 콘텐츠
- `infra` — 로컬 개발용 PostgreSQL, Redis, SQL 스키마

## 현재 구현된 흐름

1. 연구 흐름과 데이터 모델 정리
2. 2D 프로토타입의 `cue → routine → reward` 기본 흐름
3. React 3D 클라이언트용 루틴 상태머신과 로컬 UI 캐시
4. OpenAI 가사 생성과 Suno reference-audio extend 동요 생성
5. 동요 생성 요청/생성곡의 PostgreSQL 영속 저장

## 로컬 실행

```bash
npm install
cp .env.example .env
docker compose -f infra/compose.yaml up -d
psql postgresql://habit_buddy:habit_buddy@localhost:5432/habit_buddy -f infra/schema.sql
npm run dev:api
npm run dev:web
```

Docker Desktop을 사용하지 않는 경우 로컬 PostgreSQL과 Redis를 직접 실행한 뒤 같은 schema 적용 명령을 실행합니다. 기본 API 접속값은 `.env.example`의 `POSTGRES_HOST/PORT/DB/USER/PASSWORD`, `REDIS_HOST/PORT`입니다. `DATABASE_URL`을 설정하면 PostgreSQL 개별 필드보다 우선합니다.

## 동요 생성 저장/복구

API의 동요 생성 요청과 생성곡은 PostgreSQL에 저장됩니다.

- `song_generation_requests`: OpenAI/Suno 요청 입력, provider, Suno task id, 상태, 에러 정보
- `generated_songs`: 생성된 곡의 가사, audio URL, stream URL, Suno 곡 id, reference audio 정보

웹의 `localStorage`는 빠른 렌더링과 오프라인 UI 캐시입니다. queued/generating 곡은 `requestId`를 기준으로 API의 `/songs/requests/:id/sync`를 호출해 서버 DB 상태를 다시 가져오며, 서버를 재시작해도 PostgreSQL에 남은 `external_task_id`로 Suno 상태를 이어서 확인할 수 있습니다.

저장 상태 확인 예시:

```bash
psql postgresql://habit_buddy:habit_buddy@localhost:5432/habit_buddy \
  -c "select id, status, external_task_id from song_generation_requests order by created_at desc limit 5;"

psql postgresql://habit_buddy:habit_buddy@localhost:5432/habit_buddy \
  -c "select id, request_id, status, audio_url is not null as has_audio from generated_songs order by created_at desc limit 5;"
```

Suno가 로컬 reference MP3와 callback URL에 접근하려면 `PUBLIC_API_BASE_URL` 또는 `VITE_PUBLIC_API_BASE_URL`이 localhost가 아닌 외부 접근 URL이어야 합니다. 로컬 E2E에서는 `ngrok`, `localhost.run`, `localtunnel` 같은 터널을 사용합니다.

## Google Cloud 배포

로컬 `npm run dev:api` 없이 Web/Android 앱에서 OpenAI/Suno를 쓰려면 API를 외부 HTTPS 서버로 배포해야 합니다. 기본 배포 대상은 Cloud Run이며, 자세한 단계는 `docs/google-cloud-deployment.md`에 있습니다.

배포 후 앱 빌드 전 아래 값을 Cloud Run URL로 맞춥니다.

```env
VITE_API_URL=https://<CLOUD_RUN_URL>
VITE_NATIVE_API_URL=https://<CLOUD_RUN_URL>
VITE_PUBLIC_API_BASE_URL=https://<CLOUD_RUN_URL>
PUBLIC_API_BASE_URL=https://<CLOUD_RUN_URL>
```

## 검증

```bash
npm --workspace apps/api run typecheck
npm --workspace apps/api run test
npm --workspace apps/web run typecheck
npm --workspace apps/web run test
npm --workspace apps/web run build
```

실제 OpenAI/Suno 요청까지 포함한 smoke 검증:

```bash
npm --workspace apps/api run smoke:live-song
```

실제 실행 전 `.env`에 유효한 `OPENAI_API_KEY`, `SUNO_API_KEY`, 외부 접근 가능한 `PUBLIC_API_BASE_URL`이 필요합니다.
