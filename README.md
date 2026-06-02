# HabitBuddy / 동요 친구

`research.md`의 연구 질문에 맞춘 유아용 루틴 컴패니언 프로토타입입니다.

## 구성

- `apps/unity` — 앞으로의 메인 3D 태블릿 클라이언트
- `apps/mobile` — 초기 2D 연구 프로토타입
- `apps/api` — 이후 확장을 위한 NestJS API 골격
- `packages/shared` — 앱과 서버가 공유하는 타입/기본 콘텐츠
- `infra` — 로컬 개발용 PostgreSQL, Redis, MinIO, SQL 스키마

## 현재 구현된 흐름

1. 연구 흐름과 데이터 모델 정리
2. 2D 프로토타입의 `cue → routine → reward` 기본 흐름
3. Unity 3D 클라이언트용 상태머신/애니메이션 제어/연구 로그 코드 골격

## 로컬 실행

```bash
npm install
cp .env.example .env
docker compose -f infra/compose.yaml up -d
npm run dev:api
npm run dev:mobile
```

현재 연구 프로토타입의 핵심 흐름은 오프라인에서도 동작하도록 설계되어 있습니다.

## 3D 전환

3D가 핵심 경험이므로 앞으로는 `apps/unity`를 메인 클라이언트로 사용합니다.  
기존 React Native 앱은 연구 로직을 검증한 초기 프로토타입으로 유지합니다.

## 다음 단계

- 3D 캐릭터/배경 에셋 제작 및 Unity 씬 연결
- 캐릭터 이동/공동수행/축하 애니메이션 연결
- 루틴 오디오 자산 연결
- 연구 세션 내보내기 기능
- 이후 필요 시 서버 동기화와 확장 기능 재도입
