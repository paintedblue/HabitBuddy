# HabitBuddy Unity Client

3D 연구 프로토타입의 메인 클라이언트입니다.

## 목표

- `cue → routine → reward` 루틴 흐름을 3D 장면으로 표현
- 캐릭터의 등장, 이동, 공동수행, 축하 애니메이션 제어
- 연구 세션 로그와 관찰 메모 저장

## 권장 Unity 구성

- Unity 6 LTS
- Build targets: iPadOS, Android
- Scenes
  - `Home`
  - `Routine`
- Required Animator states
  - `Idle`
  - `Appear`
  - `Walk`
  - `Beckon`
  - `CoPerform`
  - `Celebrate`

## 폴더 구조

- `Assets/Scripts/Domain` — 세션/로그 모델
- `Assets/Scripts/Routine` — 루틴 상태머신
- `Assets/Scripts/Character` — 애니메이션 제어
- `Assets/Scripts/Research` — 관찰 메모 저장
- `Assets/Scripts/UI` — 화면 바인딩

## 필요한 에셋

1. 캐릭터 1종 리깅 모델
2. 방 배경 1종
3. 화장실 배경 1종
4. 애니메이션 클립
   - idle
   - appear
   - walk
   - beckon
   - brushing / co-perform
   - celebrate
5. 오디오
   - cue song
   - routine song
   - reward sound

## 현재 상태

- 외부 에셋 없이 실행 가능한 저폴리 3D 프로토타입을 코드로 생성합니다.
- `PrototypeBootstrap`을 빈 씬의 오브젝트에 붙이면
  - 방/화장실
  - 곰 캐릭터
  - 이동/손짓/양치/축하 애니메이션
  - 기본 UI
  가 런타임에 생성됩니다.
- cue/routine/reward 단계별로 조명 톤이 달라지고, 더 친근한 캐릭터 디테일이 포함됩니다.
- 추후 실제 모델과 애니메이션을 받으면 `CharacterAnimationController`의 Animator 경로로 교체할 수 있습니다.

## 실행 방법

1. Unity에서 `apps/unity` 폴더를 엽니다.
2. 메뉴에서 `HabitBuddy > Create Prototype Scene`을 누릅니다.
3. 생성된 `Assets/Scenes/Prototype.unity`를 열고 Play를 누릅니다.
4. 화면의 버튼으로
   - 같이 가요
   - 잠깐 쉬어요
   - 다시 시작
   - 보상 확인
   - 관찰 기록
   - CSV 내보내기  
   를 직접 시험할 수 있습니다.
- 왼쪽 프로필 폼에서 이름/좋아하는 음식/친구 이름을 입력하면 가사에 반영됩니다.
- 캐릭터 선택에 따라 색상 테마도 함께 바뀝니다.
- 양치와 손 씻기 중 루틴을 고를 수 있고, 완료 기록은 도장판에 누적됩니다.
- 루틴에 따라 카메라 초점이 달라지고, 도장판은 날짜별 아이콘을 보여줍니다.
- 완료 후에는 세션 요약이 갱신되고, 루틴별 소품도 달라집니다.

## 데이터 내보내기

- `CSV 내보내기` 버튼을 누르면 `Application.persistentDataPath` 아래에
  `habitbuddy-research-export.csv`가 생성됩니다.
- 완료 단계에서는 간단한 confetti 효과가 재생되고, 관찰 기록 버튼으로 세션 후 폼을 열 수 있습니다.

## 한글 표시

- Unity 기본 TextMeshPro 폰트는 한글 글리프가 부족할 수 있습니다.
- 화면의 한글이 네모로 보이면 Unity에서 한글 폰트 자산을 추가한 뒤 TextMeshPro 기본 폰트로 지정해야 합니다.
