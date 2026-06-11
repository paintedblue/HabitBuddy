import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import {
  characters,
  habitTemplates,
  melodyPresets,
  type Character,
  type ChildProfile,
  type HabitId,
  type HabitTemplate,
  type MelodyPresetId,
  type RoutineSession
} from '@habit-buddy/shared';
import { colorChoices, defaultProfile, foodChoices, habitBarrierChoices, identityChoices } from './domain/defaults';
import { HabitScene } from './components/HabitScene';
import { useRoutineSession, type RoutineStatus } from './state/useRoutineSession';
import { habitBuddyDb, type LocalAuth, type LocalGeneratedSong } from './storage/db';

type Tab = 'profile' | 'routine' | 'stamps';
type SongPreview = { title: string; lyrics: string };
type AuthMode = 'loading' | 'setup' | 'locked' | 'authenticated';

const weekdays = ['일', '월', '화', '수', '목', '금', '토'];

export function App() {
  const [tab, setActiveTab] = useState<Tab | null>(null);
  const [profile, setProfile] = useState<ChildProfile>(defaultProfile);
  const [auth, setAuth] = useState<LocalAuth | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('loading');
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [sessions, setSessions] = useState<RoutineSession[]>([]);
  const [songs, setSongs] = useState<LocalGeneratedSong[]>([]);
  const [parentCode, setParentCode] = useState('');
  const [characterPickerOpen, setCharacterPickerOpen] = useState(false);
  const [showPauseConfirm, setShowPauseConfirm] = useState(false);
  const routine = useRoutineSession(profile, auth?.parentPinLast4 ?? '');
  const character = characters.find((item) => item.id === profile.characterId) ?? characters[0];
  const totalSeconds = routine.selectedHabit.durationSeconds;
  const elapsedSeconds = Math.max(0, totalSeconds - routine.secondsLeft);
  const progress = totalSeconds > 0 ? Math.min(100, Math.round((elapsedSeconds / totalSeconds) * 100)) : 0;
  const panelOpen = routine.status === 'home' && tab !== null;
  const routineActive = routine.status !== 'home';

  const message = useMemo(() => {
    if (routine.status === 'cue') return routine.lyrics.cue;
    if (routine.status === 'routine') return '노래 들으며 같이 해봐요';
    if (routine.status === 'awaiting_parent') return '루틴을 마쳤나요?';
    if (routine.status === 'reward') return routine.lyrics.reward;
    return '오늘은 어떤 습관을 같이 해볼까요?';
  }, [routine.lyrics.cue, routine.lyrics.reward, routine.status]);

  useEffect(() => {
    void Promise.all([
      habitBuddyDb.getAuth(),
      habitBuddyDb.getProfile(),
      habitBuddyDb.listRoutineSessions(),
      habitBuddyDb.listSongs()
    ]).then(([savedAuth, savedProfile, savedSessions, savedSongs]) => {
      const nextProfile = savedProfile ? { ...defaultProfile, ...savedProfile } : defaultProfile;
      setProfile(nextProfile);
      setAuth(savedAuth);
      setSessions(savedSessions);
      setSongs(savedSongs);
      setProfileLoaded(true);
      setAuthMode(savedAuth?.autoLoginEnabled ? 'authenticated' : 'setup');
    });
  }, []);

  useEffect(() => {
    if (!profileLoaded || authMode !== 'authenticated') return;
    void habitBuddyDb.saveProfile(profile);
  }, [authMode, profile, profileLoaded]);

  useEffect(() => {
    if (routine.status !== 'routine') setShowPauseConfirm(false);
  }, [routine.status]);

  async function confirmParent() {
    const ok = await routine.confirmParentPassword(parentCode);
    if (ok) {
      setParentCode('');
      setSessions(await habitBuddyDb.listRoutineSessions());
    }
  }

  function closePanel() {
    setActiveTab(null);
  }

  function changeTab(nextTab: Tab) {
    if (routine.status !== 'home') return;
    setCharacterPickerOpen(false);
    setActiveTab((current) => (current === nextTab ? null : nextTab));
  }

  function openSongMakerForHabit(habit: HabitTemplate) {
    setProfile((current) => ({
      ...current,
      hardHabit: habit.name,
      habitBarrier: habitBarrierChoices[habit.name]?.[0] ?? current.habitBarrier
    }));
    setActiveTab('profile');
  }

  async function saveSongFromProfile(preview: SongPreview) {
    const song = createLocalSong(profile, preview);
    await habitBuddyDb.saveSong(song);
    setSongs(await habitBuddyDb.listSongs());
    return song;
  }

  function requestPauseExit() {
    routine.pause();
    setShowPauseConfirm(true);
  }

  async function keepGoing() {
    setShowPauseConfirm(false);
    await routine.resume();
  }

  function returnHomeFromPause() {
    setShowPauseConfirm(false);
    routine.returnHome();
  }

  async function registerAuth(childName: string, parentPinLast4: string) {
    const normalizedName = childName.trim();
    const nextAuth: LocalAuth = {
      childName: normalizedName,
      parentPinLast4,
      autoLoginEnabled: true
    };
    const nextProfile = { ...profile, name: normalizedName };
    setAuth(nextAuth);
    setProfile(nextProfile);
    await habitBuddyDb.saveAuth(nextAuth);
    await habitBuddyDb.saveProfile(nextProfile);
    setAuthMode('authenticated');
  }

  function login(childName: string, parentPinLast4: string) {
    if (!auth) return false;
    const sameName = childName.trim() === auth.childName.trim();
    const samePin = parentPinLast4 === auth.parentPinLast4;
    if (!sameName || !samePin) return false;
    setProfile((current) => ({ ...current, name: auth.childName }));
    setAuthMode('authenticated');
    return true;
  }

  function lockApp() {
    routine.returnHome();
    setActiveTab(null);
    setCharacterPickerOpen(false);
    setShowPauseConfirm(false);
    setParentCode('');
    setAuthMode('locked');
  }

  function selectCharacter(nextCharacter: Character) {
    setProfile((current) => ({
      ...current,
      characterId: nextCharacter.id,
      friendName: nextCharacter.name
    }));
    setCharacterPickerOpen(false);
  }

  if (authMode === 'loading') {
    return <LoadingScreen />;
  }

  if (authMode !== 'authenticated') {
    return (
      <AuthScreen
        auth={auth}
        defaultChildName={auth?.childName ?? profile.name}
        mode={authMode}
        onLogin={login}
        onRegister={(childName, parentPinLast4) => void registerAuth(childName, parentPinLast4)}
      />
    );
  }

  return (
    <main className={routineActive ? 'app-shell routine-mode' : 'app-shell'}>
      <section className={panelOpen ? 'stage dimmed' : 'stage'} style={{ '--accent': character.accent } as CSSProperties}>
        <TopBar character={character} childName={profile.name} panelOpen={panelOpen} onLock={lockApp} />
        {routine.status === 'home' && characterPickerOpen ? (
          <CharacterPicker selected={character} onSelect={selectCharacter} />
        ) : null}
        <HomeScene
          character={character}
          message={message}
          routineActive={routineActive}
          onOpenCharacterPicker={() => setCharacterPickerOpen((open) => !open)}
        />
        {!routineActive ? <BottomTabs activeTab={tab} character={character} onChange={changeTab} /> : null}
      </section>

      {routine.status === 'home' && tab ? (
        <DrawerPanel onClose={closePanel}>
          {tab === 'profile' ? <ProfilePanel character={character} profile={profile} onChange={setProfile} onClose={closePanel} onGoRoutine={() => setActiveTab('routine')} onSaveSong={saveSongFromProfile} /> : null}
          {tab === 'routine' ? <RoutinePicker selectedId={habitIdForProfile(profile)} songs={songs} onCreateSong={openSongMakerForHabit} onStart={(habit, song) => void routine.startHabit(habit, song)} /> : null}
          {tab === 'stamps' ? <StampsPanel defaultHabitId={habitIdForProfile(profile)} sessions={sessions} /> : null}
        </DrawerPanel>
      ) : null}

      {routine.status !== 'home' ? (
        <RoutineOverlay
          character={character}
          parentCode={parentCode}
          progress={progress}
          routine={{
            status: routine.status,
            selectedHabit: routine.selectedHabit,
            secondsLeft: routine.secondsLeft,
            lyrics: routine.lyrics,
            feedback: routine.feedback,
            resumeExtra: routine.resumeExtra,
            startHabit: routine.startHabit,
            beginRoutine: routine.beginRoutine,
            markRewardViewed: routine.markRewardViewed
          }}
          setParentCode={setParentCode}
          onConfirmParent={() => void confirmParent()}
          onPauseExit={requestPauseExit}
          onShowStamps={() => {
            routine.markRewardViewed();
            routine.returnHome();
            setActiveTab('stamps');
          }}
        />
      ) : null}

      {showPauseConfirm ? <PauseConfirmModal onContinue={() => void keepGoing()} onReturnHome={returnHomeFromPause} /> : null}
    </main>
  );
}

function LoadingScreen() {
  return (
    <main className="app-shell auth-shell">
      <section className="auth-card" aria-label="로딩">
        <div className="auth-brand">♪ 동요 친구</div>
        <p className="auth-copy">불러오는 중이에요</p>
      </section>
    </main>
  );
}

function AuthScreen({
  auth,
  defaultChildName,
  mode,
  onLogin,
  onRegister
}: {
  auth: LocalAuth | null;
  defaultChildName: string;
  mode: Exclude<AuthMode, 'loading' | 'authenticated'>;
  onLogin: (childName: string, parentPinLast4: string) => boolean;
  onRegister: (childName: string, parentPinLast4: string) => void;
}) {
  const isLogin = mode === 'locked' && !!auth;
  const [childName, setChildName] = useState(defaultChildName);
  const [parentPinLast4, setParentPinLast4] = useState('');
  const [feedback, setFeedback] = useState('');
  const title = isLogin ? '다시 로그인해요' : defaultChildName ? '보호자 번호를 등록해요' : '처음 만나는 아이를 등록해요';
  const description = isLogin
    ? '아이 이름과 보호자 휴대폰 뒷 4자리를 입력해 주세요.'
    : '앞으로 동요에는 이 이름이 자동으로 들어가요.';
  const canSubmit = childName.trim().length > 0 && parentPinLast4.length === 4;

  function submit() {
    if (!canSubmit) return;
    if (isLogin) {
      const ok = onLogin(childName, parentPinLast4);
      setFeedback(ok ? '' : '이름 또는 보호자 번호를 다시 확인해 주세요');
      return;
    }
    onRegister(childName, parentPinLast4);
  }

  function updatePin(value: string) {
    setParentPinLast4(value.replace(/\D/g, '').slice(0, 4));
    setFeedback('');
  }

  return (
    <main className="app-shell auth-shell">
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="auth-brand">♪ 동요 친구</div>
        <h1 id="auth-title">{title}</h1>
        <p className="auth-copy">{description}</p>
        <label className="auth-field">
          <span>아이 이름</span>
          <input
            autoFocus
            value={childName}
            placeholder="예: 영이"
            onChange={(event) => {
              setChildName(event.target.value);
              setFeedback('');
            }}
          />
        </label>
        <label className="auth-field">
          <span>보호자 휴대폰 뒷 4자리</span>
          <input
            value={parentPinLast4}
            type="password"
            inputMode="numeric"
            maxLength={4}
            placeholder="4자리"
            onChange={(event) => updatePin(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') submit();
            }}
          />
        </label>
        {feedback ? <p className="auth-feedback">{feedback}</p> : null}
        <button className="auth-submit" type="button" disabled={!canSubmit} onClick={submit}>
          {isLogin ? '로그인하기' : '등록하고 시작하기'}
        </button>
      </section>
    </main>
  );
}

function TopBar({
  character,
  childName,
  onLock,
  panelOpen = false
}: {
  character: Character;
  childName?: string;
  onLock?: () => void;
  panelOpen?: boolean;
}) {
  const initial = (childName?.trim()[0] ?? 'Y').toUpperCase();
  return (
    <header className={panelOpen ? 'top-bar panel-open' : 'top-bar'}>
      <div className="brand-pill">
        <span>♪</span>
        <strong>동요 친구</strong>
      </div>
      <div className="top-user-group">
        {childName ? (
          <div className="child-pill" aria-label={`현재 아이 ${childName}`}>
            <span>{initial}</span>
            <strong>{childName}</strong>
          </div>
        ) : null}
        {!onLock ? (
          <div className="character-pill static" aria-label={`현재 친구 ${character.name}`}>
            {character.name}
          </div>
        ) : null}
        {onLock ? (
          <button className="lock-button" type="button" aria-label="로그인 잠금" onClick={onLock}>
            🔒
          </button>
        ) : null}
      </div>
    </header>
  );
}

function CharacterPicker({ onSelect, selected }: { onSelect: (character: Character) => void; selected: Character }) {
  return (
    <section className="character-picker" aria-label="캐릭터 선택">
      <div className="character-picker-title">
        <strong>친구 고르기</strong>
        <span>{selected.name}와 함께하고 있어요</span>
      </div>
      <div className="character-picker-grid">
        {characters.map((item) => {
          const isSelected = item.id === selected.id;
          return (
            <button
              className={isSelected ? 'character-option selected' : 'character-option'}
              key={item.id}
              style={{ '--character-accent': item.accent, backgroundColor: item.background } as CSSProperties}
              type="button"
              onClick={() => onSelect(item)}
            >
              <span className="character-dot" />
              <strong>{item.name}</strong>
              <small>{item.species}</small>
              <em>{isSelected ? '✓' : '+'}</em>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function HomeScene({
  character,
  message,
  onOpenCharacterPicker,
  routineActive
}: {
  character: Character;
  message: string;
  onOpenCharacterPicker: () => void;
  routineActive: boolean;
}) {
  if (routineActive) return null;

  return (
    <>
      <div className="home-3d-scene">
        <HabitScene drawerOpen={false} mood="idle" rewardPulse={false} stage="main" variant="home" />
      </div>
      <div className="home-prompt">
        <button className="home-character-link" type="button" onClick={onOpenCharacterPicker}>
          <span>♪</span>
          {character.name}
        </button>
        <p>{message}</p>
        <span />
      </div>
    </>
  );
}

function BottomTabs({ activeTab, character, onChange }: { activeTab: Tab | null; character: Character; onChange: (tab: Tab) => void }) {
  const tabs: Array<{ id: Tab; icon: string; label: string; description: string; color: string; tone: string }> = [
    { id: 'profile', icon: '♪', label: '내 동요 만들기', description: '아이 이름으로 새 동요를 만들어요', color: '#DDEBFF', tone: '#2C83E6' },
    { id: 'routine', icon: '▶', label: '같이 해봐요!', description: '고른 동요로 습관을 시작해요', color: '#DDF8E7', tone: '#06A956' },
    { id: 'stamps', icon: '✪', label: '내 도장판', description: '완료한 습관 도장을 확인해요', color: '#FFF0D9', tone: '#D66C00' }
  ];

  return (
    <nav className="bottom-tabs">
      {tabs.map((item) => (
        <button
          className={activeTab === item.id ? 'home-action active' : 'home-action'}
          key={item.id}
          style={{
            backgroundColor: item.color,
            borderColor: activeTab === item.id ? character.accent : 'transparent',
            color: item.tone
          }}
          type="button"
          onClick={() => onChange(item.id)}
        >
          <span>{item.icon}</span>
          <strong>{item.label}</strong>
          <small>{item.description}</small>
        </button>
      ))}
    </nav>
  );
}

function DrawerPanel({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <aside className="drawer-panel" aria-label="선택 패널">
      <button className="close-button" type="button" aria-label="닫기" onClick={onClose}>
        ×
      </button>
      {children}
    </aside>
  );
}

type ProfileWizardStep = 'habit' | 'barrier' | 'identity' | 'food' | 'color' | 'melody' | 'result';
type DirectInputTarget = 'barrier' | 'identity' | 'food' | null;

const profileWizardSteps: ProfileWizardStep[] = ['habit', 'barrier', 'identity', 'food', 'color', 'melody', 'result'];
const previewDurationSeconds = 20;
const habitChoiceMeta: Record<string, { icon: string; tone: string }> = {
  '양치하기': { icon: '🪥', tone: '#FF8D86' },
  '손 씻기': { icon: '🫧', tone: '#78D8C7' },
  '방 정리하기': { icon: '🧹', tone: '#9DB9FF' },
  '일찍자기': { icon: '🌙', tone: '#A99AEF' },
  '채소먹기': { icon: '🥦', tone: '#7ACB7A' },
  '책 읽기': { icon: '📚', tone: '#F3AA4A' }
};

function ProfilePanel({
  character,
  profile,
  onChange,
  onClose,
  onGoRoutine,
  onSaveSong
}: {
  character: Character;
  profile: ChildProfile;
  onChange: (profile: ChildProfile) => void;
  onClose: () => void;
  onGoRoutine: () => void;
  onSaveSong: (preview: SongPreview) => Promise<LocalGeneratedSong>;
}) {
  const [step, setStep] = useState<ProfileWizardStep>('habit');
  const [directTarget, setDirectTarget] = useState<DirectInputTarget>(null);
  const [directValue, setDirectValue] = useState('');
  const [lyricVariant, setLyricVariant] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [playProgress, setPlayProgress] = useState(0);
  const [savingSong, setSavingSong] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<ProfileWizardStep>>(() => new Set());
  const playTimer = useRef<number | null>(null);
  const stepIndex = profileWizardSteps.indexOf(step);
  const songPreview = useMemo(() => buildSongPreview(profile, lyricVariant), [lyricVariant, profile]);

  useEffect(() => () => {
    if (playTimer.current) window.clearInterval(playTimer.current);
  }, []);

  useEffect(() => {
    setCompletedSteps(completedWizardStepsForProfile(profile));
  }, [profile]);

  useEffect(() => {
    stopPreview();
    setDirectTarget(null);
    setDirectValue('');
  }, [step]);

  function stopPreview() {
    if (playTimer.current) window.clearInterval(playTimer.current);
    playTimer.current = null;
    setPlaying(false);
  }

  function updateProfile(next: ChildProfile) {
    onChange(next);
  }

  function markStepSelected(targetStep: ProfileWizardStep = step) {
    setCompletedSteps((current) => new Set(current).add(targetStep));
  }

  function advanceFrom(targetStep: ProfileWizardStep) {
    const targetIndex = profileWizardSteps.indexOf(targetStep);
    if (targetIndex >= 0 && targetStep !== 'result') setStep(profileWizardSteps[targetIndex + 1]);
  }

  function goBack() {
    if (stepIndex <= 0) {
      onClose();
      return;
    }
    setStep(profileWizardSteps[stepIndex - 1]);
  }

  function goNext() {
    if (!canContinue()) return;
    if (step === 'result') return;
    markStepSelected();
    setStep(profileWizardSteps[stepIndex + 1]);
  }

  function canContinue() {
    if (step === 'habit') return profile.hardHabit.trim().length > 0;
    if (step === 'barrier') return profile.habitBarrier.trim().length > 0;
    if (step === 'identity') return profile.dreamIdentity.trim().length > 0;
    if (step === 'food') return profile.favoriteFood.trim().length > 0;
    if (step === 'color') return profile.favoriteColor.trim().length > 0;
    if (step === 'melody') return !!profile.melodyPresetId;
    return true;
  }

  function applyDirectValue() {
    const value = directValue.trim();
    if (!value || !directTarget) return;
    if (directTarget === 'barrier') updateProfile({ ...profile, habitBarrier: value });
    if (directTarget === 'identity') updateProfile({ ...profile, dreamIdentity: value, dreamIdentityCustom: value });
    if (directTarget === 'food') updateProfile({ ...profile, favoriteFood: value });
    markStepSelected(directTarget);
    setDirectTarget(null);
    setDirectValue('');
  }

  function togglePreview() {
    if (playing) {
      stopPreview();
      return;
    }
    setPlaying(true);
    if (playProgress >= 100) setPlayProgress(0);
    playPreviewTone(profile.melodyPresetId);
    const started = Date.now() - (playProgress / 100) * previewDurationSeconds * 1000;
    playTimer.current = window.setInterval(() => {
      const next = Math.min(100, ((Date.now() - started) / (previewDurationSeconds * 1000)) * 100);
      setPlayProgress(next);
      if (next >= 100) stopPreview();
    }, 120);
  }

  function regenerate() {
    stopPreview();
    setPlayProgress(0);
    setLyricVariant((value) => value + 1);
  }

  async function saveAndGoRoutine() {
    setSavingSong(true);
    try {
      await onSaveSong(songPreview);
      stopPreview();
      onGoRoutine();
    } finally {
      setSavingSong(false);
    }
  }

  async function saveAndMakeAnother() {
    setSavingSong(true);
    try {
      await onSaveSong(songPreview);
      stopPreview();
      setPlayProgress(0);
      setLyricVariant((value) => value + 1);
      setStep('melody');
    } finally {
      setSavingSong(false);
    }
  }

  return (
    <section className="panel-page profile-page song-wizard">
      <PanelTitle icon="★" title={`${profile.name || '친구'}의 동요 만들기`} />
      <Dots active={stepIndex} count={profileWizardSteps.length} color={character.accent} />
      {step !== 'result' ? <WizardStepContent profile={profile} selectedSteps={completedSteps} step={step} directTarget={directTarget} directValue={directValue} onApplyDirect={applyDirectValue} onChangeDirect={setDirectValue} onChangeProfile={updateProfile} onSelectStep={markStepSelected} onSetDirectTarget={setDirectTarget} /> : (
        <SongResult
          preview={songPreview}
          playing={playing}
          progress={playProgress}
          saving={savingSong}
          onPlay={togglePreview}
          onRegenerate={regenerate}
          onSaveAndGoRoutine={() => void saveAndGoRoutine()}
        />
      )}
      <div className={step === 'result' ? 'wizard-footer result-footer' : 'wizard-footer'}>
        <button className="wizard-back-button" type="button" onClick={goBack}>
          ← 뒤로
        </button>
        {step !== 'result' ? (
          <button className="wizard-next-button" type="button" disabled={!canContinue()} onClick={goNext}>
            다음 →
          </button>
        ) : null}
      </div>
    </section>
  );
}

function completedWizardStepsForProfile(profile: ChildProfile) {
  const completed = new Set<ProfileWizardStep>();
  if (profile.hardHabit.trim()) completed.add('habit');
  if (profile.habitBarrier.trim()) completed.add('barrier');
  if (profile.dreamIdentity.trim()) completed.add('identity');
  if (profile.favoriteFood.trim()) completed.add('food');
  if (profile.favoriteColor.trim()) completed.add('color');
  if (profile.melodyPresetId) completed.add('melody');
  return completed;
}

function WizardStepContent({
  directTarget,
  directValue,
  onApplyDirect,
  onChangeDirect,
  onChangeProfile,
  onSelectStep,
  onSetDirectTarget,
  profile,
  selectedSteps,
  step
}: {
  directTarget: DirectInputTarget;
  directValue: string;
  onApplyDirect: () => void;
  onChangeDirect: (value: string) => void;
  onChangeProfile: (profile: ChildProfile) => void;
  onSelectStep: (step?: ProfileWizardStep) => void;
  onSetDirectTarget: (target: DirectInputTarget) => void;
  profile: ChildProfile;
  selectedSteps: Set<ProfileWizardStep>;
  step: ProfileWizardStep;
}) {
  if (step === 'habit') {
    return (
      <div className="wizard-body">
        <WizardQuestion title="어떤 습관을 해볼까요?" subtitle="동요로 응원할 습관을 골라요" />
        <div className="wizard-choice-grid">
          {habitTemplates.map((habit) => (
            <WizardChoiceCard
              key={habit.id}
              icon={habit.emoji}
              label={habit.name}
              selected={profile.hardHabit === habit.name}
              tone={habitChoiceMeta[habit.name]?.tone}
              onClick={() => {
                onSelectStep('habit');
                onChangeProfile({ ...profile, hardHabit: habit.name, habitBarrier: '' });
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (step === 'barrier') {
    const choices = habitBarrierChoices[profile.hardHabit] ?? habitBarrierChoices['양치하기'];
    return (
      <div className="wizard-body">
        <WizardQuestion title="왜 하기 어려울까요?" />
        <div className="wizard-pill-list">
          {choices.map((label, index) => (
            <WizardPillCard
              key={label}
              icon={['😖', '🥱', '😬'][index] ?? '💬'}
              label={label}
              selected={profile.habitBarrier === label}
              tone={['#FF8D86', '#F3AA4A', '#9DB9FF'][index]}
              onClick={() => {
                onSelectStep('barrier');
                onChangeProfile({ ...profile, habitBarrier: label });
              }}
            />
          ))}
          <DirectInputCard active={directTarget === 'barrier'} value={directValue} onApply={onApplyDirect} onChange={onChangeDirect} onOpen={() => onSetDirectTarget('barrier')} />
        </div>
      </div>
    );
  }

  if (step === 'identity') {
    return (
      <div className="wizard-body">
        <WizardQuestion title="커서 어떤 모습이 되고 싶어?" />
        <div className="wizard-choice-grid">
          {identityChoices.map((item, index) => (
            <WizardChoiceCard
              key={item.label}
              icon={item.icon}
              label={item.label}
              selected={profile.dreamIdentity === item.label}
              tone={['#FF8D86', '#78D8C7', '#F3AA4A', '#9DB9FF'][index]}
              onClick={() => {
                onSelectStep('identity');
                onChangeProfile({ ...profile, dreamIdentity: item.label, dreamIdentityCustom: '' });
              }}
            />
          ))}
          <DirectInputCard active={directTarget === 'identity'} value={directValue} onApply={onApplyDirect} onChange={onChangeDirect} onOpen={() => onSetDirectTarget('identity')} />
        </div>
      </div>
    );
  }

  if (step === 'food') {
    return (
      <div className="wizard-body">
        <WizardQuestion title="제일 좋아하는 음식은?" subtitle="마음에 드는 음식을 골라요" />
        <div className="wizard-choice-grid">
          {foodChoices.map((item, index) => (
            <WizardChoiceCard
              key={item.label}
              icon={item.icon}
              label={item.label}
              selected={profile.favoriteFood === item.label}
              tone={['#FF8D86', '#F3AA4A', '#FF8D86', '#7ACB7A', '#F3AA4A', '#9DB9FF'][index]}
              onClick={() => {
                onSelectStep('food');
                onChangeProfile({ ...profile, favoriteFood: item.label });
              }}
            />
          ))}
          <DirectInputCard active={directTarget === 'food'} value={directValue} onApply={onApplyDirect} onChange={onChangeDirect} onOpen={() => onSetDirectTarget('food')} />
        </div>
      </div>
    );
  }

  if (step === 'color') {
    return (
      <div className="wizard-body">
        <WizardQuestion title="좋아하는 색깔은?" subtitle="동요 분위기에 색을 넣어요" />
        <div className="wizard-color-grid">
          {colorChoices.map((item) => (
            <button
              className={profile.favoriteColor === item.color ? 'wizard-color-card selected' : 'wizard-color-card'}
              key={item.label}
              style={{ backgroundColor: item.color }}
              type="button"
              onClick={() => {
                onSelectStep('color');
                onChangeProfile({ ...profile, favoriteColor: item.color });
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="wizard-body">
      <WizardQuestion title="어떤 노래로 만들까?" subtitle="버튼을 눌러 들어보고, 마음에 드는 걸 골라요" />
      <div className="melody-list">
        {melodyPresets.map((preset, index) => (
          <button
            className={profile.melodyPresetId === preset.id ? 'melody-card selected' : 'melody-card'}
            key={preset.id}
            type="button"
            onClick={() => {
              onSelectStep('melody');
              onChangeProfile({ ...profile, melodyPresetId: preset.id });
            }}
          >
            <span className="melody-icon">{['☀️', '☁️', '🎤', '🌙'][index]}</span>
            <span>
              <strong>{preset.label}</strong>
              <small>{preset.description}</small>
            </span>
            <em>{profile.melodyPresetId === preset.id ? '✓' : '+'}</em>
          </button>
        ))}
      </div>
    </div>
  );
}

function WizardQuestion({ subtitle, title }: { subtitle?: string; title: string }) {
  return (
    <div className="wizard-question">
      <h2>{title}</h2>
      {subtitle ? <p>{subtitle}</p> : null}
    </div>
  );
}

function WizardChoiceCard({ icon, label, onClick, selected, tone = '#F5962A' }: { icon: string; label: string; onClick: () => void; selected: boolean; tone?: string }) {
  return (
    <button className={selected ? 'wizard-choice-card selected' : 'wizard-choice-card'} style={{ borderColor: tone }} type="button" onClick={onClick}>
      <span>{icon}</span>
      <strong>{label}</strong>
    </button>
  );
}

function WizardPillCard({ icon, label, onClick, selected, tone = '#F5962A' }: { icon: string; label: string; onClick: () => void; selected: boolean; tone?: string }) {
  return (
    <button className={selected ? 'wizard-pill-card selected' : 'wizard-pill-card'} style={{ borderColor: tone }} type="button" onClick={onClick}>
      <span>{icon}</span>
      <strong>{label}</strong>
    </button>
  );
}

function DirectInputCard({ active, onApply, onChange, onOpen, value }: { active: boolean; onApply: () => void; onChange: (value: string) => void; onOpen: () => void; value: string }) {
  if (!active) {
    return (
      <button className="wizard-direct-card" type="button" onClick={onOpen}>
        <span>＋</span>
        <strong>직접 입력하기</strong>
      </button>
    );
  }

  return (
    <div className="wizard-direct-input-card">
      <input value={value} placeholder="직접 입력해 주세요" onChange={(event) => onChange(event.target.value)} />
      <button type="button" disabled={!value.trim()} onClick={onApply}>입력</button>
    </div>
  );
}

function SongResult({
  onPlay,
  onRegenerate,
  onSaveAndGoRoutine,
  playing,
  preview,
  progress,
  saving
}: {
  onPlay: () => void;
  onRegenerate: () => void;
  onSaveAndGoRoutine: () => void;
  playing: boolean;
  preview: SongPreview;
  progress: number;
  saving: boolean;
}) {
  const elapsedSeconds = Math.round((progress / 100) * previewDurationSeconds);
  return (
    <div className="song-result">
      <div className="song-complete-header">
        <div className="song-complete-badge">★ 완성!</div>
        <h2>나만의 동요가 완성됐어요</h2>
        <p>재생 버튼을 눌러 들어봐요</p>
      </div>
      <section className="song-result-card">
        <p className="song-eyebrow">동요 제목</p>
        <h2>{preview.title}</h2>
        <p className="song-lyrics">{preview.lyrics}</p>
      </section>
      <section className="song-player-card" aria-label="동요 재생">
        <button className="song-play-button" type="button" aria-label={playing ? '잠깐 멈춤' : '재생하기'} onClick={onPlay}>
          {playing ? 'Ⅱ' : '▶'}
        </button>
        <div className="song-player-main">
          <div className="song-progress" aria-label="재생 진행률">
            <span style={{ width: `${progress}%` }} />
          </div>
          <div className="song-time-row">
            <span>{formatPreviewTime(elapsedSeconds)}</span>
            <span>{formatPreviewTime(previewDurationSeconds)}</span>
          </div>
        </div>
      </section>
      <div className="song-save-row">
        <button className="song-routine-button" type="button" disabled={saving} onClick={onSaveAndGoRoutine}>
          {saving ? '저장 중...' : '이 동요로 같이 해보기'}
        </button>
        <button className="song-regenerate-button" type="button" disabled={saving} onClick={onRegenerate}>
          ↻ 다시 만들기
        </button>
      </div>
    </div>
  );
}

function formatPreviewTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = (seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${rest}`;
}

function buildSongPreview(profile: ChildProfile, variant: number) {
  const name = profile.name.trim() || '친구';
  const habit = profile.hardHabit || '습관';
  const barrier = profile.habitBarrier || '조금 어려워도';
  const dream = profile.dreamIdentityCustom || profile.dreamIdentity || '멋진 모습';
  const food = profile.favoriteFood || '맛있는 간식';
  const color = colorChoices.find((item) => item.color === profile.favoriteColor)?.label ?? '반짝이는 색';
  const melody = melodyPresets.find((item) => item.id === profile.melodyPresetId)?.label ?? '밝은 동요';
  const endings = [
    `${name}야 ${habit} 같이 해봐요\n${barrier} 괜찮아 천천히 해요\n${food}처럼 기분 좋게 웃고\n${dream}처럼 반짝반짝 자라나요`,
    `${name}의 ${color} 마음 톡톡\n${habit} 한 번 더 할 수 있어\n${barrier} 마음도 노래에 싣고\n${dream} 꿈까지 씩씩하게 가요`,
    `${name}야 룰루랄라 ${habit}\n작은 용기 하나씩 모아요\n${food}처럼 좋아지는 오늘\n${dream}처럼 환하게 빛날 거야`
  ];

  return {
    title: `${name}의 ${habit} ${melody}`,
    lyrics: endings[variant % endings.length]
  };
}

function habitIdForProfile(profile: ChildProfile): HabitId {
  return habitTemplates.find((habit) => habit.name === profile.hardHabit)?.id ?? habitTemplates[0].id;
}

function createLocalSong(profile: ChildProfile, preview: SongPreview): LocalGeneratedSong {
  const now = new Date().toISOString();
  return {
    id: `song-${Date.now()}-${Math.round(Math.random() * 10000)}`,
    childId: profile.id,
    habitId: habitIdForProfile(profile),
    title: preview.title,
    lyrics: preview.lyrics,
    melodyPresetId: profile.melodyPresetId,
    status: 'approved',
    createdAt: now,
    inputs: {
      childName: profile.name,
      hardHabit: profile.hardHabit,
      habitBarrier: profile.habitBarrier,
      dreamIdentity: profile.dreamIdentityCustom || profile.dreamIdentity,
      favoriteFood: profile.favoriteFood,
      favoriteColor: profile.favoriteColor
    }
  };
}

function playPreviewTone(melodyPresetId: MelodyPresetId | undefined) {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const audio = new AudioContextClass();
    const notesByPreset: Record<MelodyPresetId, number[]> = {
      energetic: [523, 659, 784, 659],
      story: [440, 523, 587, 523],
      follow: [587, 587, 659, 784],
      calm: [392, 440, 523, 440]
    };
    const notes = notesByPreset[melodyPresetId ?? 'energetic'];

    notes.forEach((frequency, index) => {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      const start = audio.currentTime + index * 0.16;
      osc.type = melodyPresetId === 'calm' ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.12, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.15);
      osc.connect(gain).connect(audio.destination);
      osc.start(start);
      osc.stop(start + 0.18);
    });
  } catch {
    // Audio is optional for the preview UI.
  }
}

function RoutinePicker({
  onCreateSong,
  onStart,
  selectedId,
  songs
}: {
  selectedId: string;
  songs: LocalGeneratedSong[];
  onCreateSong: (habit: HabitTemplate) => void;
  onStart: (habit: HabitTemplate, song: LocalGeneratedSong) => void;
}) {
  const [step, setStep] = useState<'habit' | 'song'>('habit');
  const [candidateId, setCandidateId] = useState(selectedId);
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null);
  const selectedHabit = habitTemplates.find((habit) => habit.id === candidateId) ?? habitTemplates[0];
  const habitSongs = useMemo(
    () => songs
      .filter((song) => song.habitId === selectedHabit.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [selectedHabit.id, songs]
  );
  const selectedSong = habitSongs.find((song) => song.id === selectedSongId) ?? habitSongs[0] ?? null;

  useEffect(() => {
    setSelectedSongId(habitSongs[0]?.id ?? null);
  }, [candidateId, habitSongs]);

  function chooseHabit(habit: HabitTemplate) {
    const nextSongs = songs
      .filter((song) => song.habitId === habit.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setCandidateId(habit.id);
    setSelectedSongId(nextSongs[0]?.id ?? null);
    if (nextSongs.length === 1) {
      onStart(habit, nextSongs[0]);
      return;
    }
    if (nextSongs.length > 1) setStep('song');
  }

  if (step === 'song') {
    return (
      <section className="panel-page routine-picker-page song-pick-page">
        <div className="song-pick-title">
          <span>▶</span>
          <h1>동요를 골라요</h1>
        </div>
        <Dots active={2} count={3} color="#F5962A" />
        <div className="routine-step-header">
          <button className="routine-step-back" type="button" onClick={() => setStep('habit')}>
            ← 습관 다시 고르기
          </button>
          <div className="song-pick-habit">
            <span>{selectedHabit.emoji}</span>
            <strong>{selectedHabit.name} 동요</strong>
          </div>
        </div>
        <div className="song-choice-list expanded song-pick-list">
          {habitSongs.map((song) => (
            <SongChoiceCard key={song.id} selected={selectedSong?.id === song.id} song={song} onClick={() => setSelectedSongId(song.id)} />
          ))}
        </div>
        <div className="song-pick-footer">
          <span>{selectedHabit.emoji}</span>
          <div>
            <small>선택한 동요</small>
            <strong>{selectedSong?.title ?? selectedHabit.name}</strong>
          </div>
          <button className="next-button full" type="button" disabled={!selectedSong} onClick={() => selectedSong ? onStart(selectedHabit, selectedSong) : undefined}>
            이 동요로 시작하기
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="panel-page routine-picker-page">
      <PanelTitle icon="▶" title="같이 해봐요!" />
      <Dots active={1} count={3} color="#F5962A" />
      <h2 className="panel-question">오늘 같이 할 습관을 골라요</h2>
      <div className="routine-grid">
        {habitTemplates.map((habit) => (
          <button className={candidateId === habit.id ? 'routine-card selected' : 'routine-card'} key={habit.id} type="button" onClick={() => chooseHabit(habit)}>
            <span>{habit.emoji}</span>
            <strong>{habit.name}</strong>
            <small>{Math.max(1, Math.round(habit.durationSeconds / 60))}분</small>
          </button>
        ))}
      </div>
      {habitSongs.length === 0 ? (
        <div className="song-empty-card">
          <span>{selectedHabit.emoji}</span>
          <strong>아직 만든 동요가 없어요</strong>
          <p>{selectedHabit.name} 동요를 먼저 만들고 같이 해봐요.</p>
          <button className="next-button full" type="button" onClick={() => onCreateSong(selectedHabit)}>
            동요 만들러 가기
          </button>
        </div>
      ) : null}
    </section>
  );
}

function SongChoiceCard({ onClick, selected, song }: { onClick: () => void; selected: boolean; song: LocalGeneratedSong }) {
  const melody = melodyPresets.find((preset) => preset.id === song.melodyPresetId)?.label ?? '동요';
  const preview = song.lyrics.split('\n').slice(0, 2).join(' ');

  return (
    <button className={selected ? 'song-choice-card selected' : 'song-choice-card'} type="button" onClick={onClick}>
      <span className="song-choice-play">▶</span>
      <div className="song-choice-copy">
        <em>{melody}</em>
        <strong>{song.title}</strong>
        <small>“{preview}”</small>
      </div>
      <b>{selected ? '✓' : ''}</b>
    </button>
  );
}

function StampsPanel({ defaultHabitId, sessions }: { defaultHabitId: HabitId; sessions: RoutineSession[] }) {
  const [selectedHabitId, setSelectedHabitId] = useState<HabitId>(defaultHabitId);
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()));
  const selectedHabit = habitTemplates.find((habit) => habit.id === selectedHabitId) ?? habitTemplates[0];
  const month = useMemo(() => buildMonthView(visibleMonth, sessions, selectedHabitId), [selectedHabitId, sessions, visibleMonth]);
  const habitCounts = useMemo(() => buildHabitMonthCounts(visibleMonth, sessions), [sessions, visibleMonth]);

  return (
    <section className="panel-page stamp-page">
      <PanelTitle title="내 도장판" />
      <div className="stamp-habit-grid" aria-label="도장판 습관 선택">
        {habitTemplates.map((habit) => {
          const count = habitCounts[habit.id] ?? 0;
          return (
            <button
              className={selectedHabitId === habit.id ? 'stamp-habit-card selected' : 'stamp-habit-card'}
              key={habit.id}
              type="button"
              onClick={() => setSelectedHabitId(habit.id)}
            >
              <span>{habit.emoji}</span>
              <strong>{habit.name}</strong>
              <small>{count}개</small>
            </button>
          );
        })}
      </div>
      <div className="month-row">
        <button type="button" aria-label="이전 달" onClick={() => setVisibleMonth(addMonths(visibleMonth, -1))}>‹</button>
        <strong>{month.label}</strong>
        <button type="button" aria-label="다음 달" onClick={() => setVisibleMonth(addMonths(visibleMonth, 1))}>›</button>
      </div>
      <div className="calendar-grid weekdays">
        {weekdays.map((day) => <span key={day}>{day}</span>)}
      </div>
      <div className="calendar-grid">
        {Array.from({ length: month.firstWeekday }, (_, index) => <span aria-hidden="true" key={`blank-${index}`} />)}
        {month.days.map(({ day, done }) => {
          return (
            <span className={done ? 'calendar-day done' : 'calendar-day'} key={day}>
              <small>{day}</small>
              {done ? <b>{selectedHabit.emoji}</b> : null}
            </span>
          );
        })}
      </div>
      <div className="streak-card">
        {month.completedCount > 0
          ? `${selectedHabit.name} 도장 ${month.completedCount}개를 모았어요.`
          : `${selectedHabit.name}을 완료하면 도장이 찍혀요.`}
      </div>
    </section>
  );
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, offset: number) {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1);
}

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildHabitMonthCounts(monthDate: Date, sessions: RoutineSession[]) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const keysByHabit = sessions.reduce<Record<HabitId, Set<string>>>((counts, session) => {
    if (!session.completedAt) return counts;
    const completedAt = new Date(session.completedAt);
    if (Number.isNaN(completedAt.getTime())) return counts;
    if (completedAt.getFullYear() !== year || completedAt.getMonth() !== month) return counts;
    const habit = habitTemplates.find((item) => item.id === session.habitId);
    if (!habit) return counts;
    counts[habit.id] = counts[habit.id] ?? new Set<string>();
    counts[habit.id].add(dateKey(completedAt));
    return counts;
  }, {} as Record<HabitId, Set<string>>);
  return habitTemplates.reduce<Record<HabitId, number>>((counts, habit) => {
    counts[habit.id] = keysByHabit[habit.id]?.size ?? 0;
    return counts;
  }, {} as Record<HabitId, number>);
}

function buildMonthView(monthDate: Date, sessions: RoutineSession[], habitId: HabitId) {
  const completedKeys = new Set<string>();
  sessions.forEach((session) => {
    if (session.habitId !== habitId) return;
    if (!session.completedAt) return;
    const completedAt = new Date(session.completedAt);
    if (!Number.isNaN(completedAt.getTime())) completedKeys.add(dateKey(completedAt));
  });

  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  let streak = 0;
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  while (completedKeys.has(dateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return {
    label: `${year}년 ${month + 1}월`,
    completedCount: Array.from(completedKeys).filter((key) => key.startsWith(`${year}-${`${month + 1}`.padStart(2, '0')}`)).length,
    firstWeekday: new Date(year, month, 1).getDay(),
    streak,
    days: Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      return {
        day,
        done: completedKeys.has(dateKey(new Date(year, month, day)))
      };
    })
  };
}

function RoutineOverlay({
  character,
  parentCode,
  progress,
  routine,
  setParentCode,
  onConfirmParent,
  onPauseExit,
  onShowStamps
}: {
  character: Character;
  parentCode: string;
  progress: number;
  routine: {
    status: RoutineStatus;
    selectedHabit: HabitTemplate;
    secondsLeft: number;
    lyrics: { cue: string; routine: string; reward: string };
    feedback: string;
    resumeExtra: () => Promise<void>;
    startHabit: (habit: HabitTemplate, song?: LocalGeneratedSong) => Promise<void>;
    beginRoutine: (habit?: HabitTemplate, session?: RoutineSession | null) => Promise<void>;
    markRewardViewed: () => void;
  };
  setParentCode: (value: string) => void;
  onConfirmParent: () => void;
  onPauseExit: () => void;
  onShowStamps: () => void;
}) {
  if (routine.status === 'routine') {
    return (
      <section className="routine-screen">
        <TopBar character={character} />
        <RoutineSceneLayer habit={routine.selectedHabit} status={routine.status} />
        <aside className="routine-card-panel">
          <div className="routine-label">노래 들으며 같이 해봐요</div>
          <p className="routine-lyrics">{routine.lyrics.routine}</p>
          <TimerRing seconds={routine.secondsLeft} progress={progress} accent={character.accent} />
        </aside>
        <button className="pause-fab" type="button" aria-label="멈춤" onClick={onPauseExit}>
          Ⅱ
        </button>
      </section>
    );
  }

  if (routine.status === 'cue') {
    return (
      <section className="routine-screen">
        <TopBar character={character} />
        <RoutineSceneLayer habit={routine.selectedHabit} status={routine.status} />
        <aside className="routine-card-panel compact">
          <div className="routine-label">{routine.selectedHabit.name} 시간이에요!</div>
          <p className="routine-lyrics short">{routine.lyrics.cue}</p>
          <button className="next-button full" style={{ backgroundColor: character.accent }} type="button" onClick={() => void routine.beginRoutine()}>
            시작하기
          </button>
        </aside>
      </section>
    );
  }

  if (routine.status === 'awaiting_parent') {
    return (
      <section className="routine-screen">
        <TopBar character={character} />
        <RoutineSceneLayer habit={routine.selectedHabit} status={routine.status} />
        <div className="parent-check-layer">
          <section className="parent-check-modal" role="dialog" aria-modal="true" aria-labelledby="parent-check-title">
            <h2 id="parent-check-title">오늘 습관을 완료했나요?</h2>
            <p>끝났어요. 부모님을 불러서 확인해 주세요.</p>
            <p className="parent-hint">보호자 휴대폰 뒷 4자리를 입력해 주세요.</p>
            <input
              aria-label="부모 PIN"
              autoFocus
              className="large-input"
              value={parentCode}
              type="password"
              inputMode="numeric"
              maxLength={4}
              placeholder="4자리 PIN"
              onChange={(event) => setParentCode(event.target.value.replace(/\D/g, '').slice(0, 4))}
            />
            {routine.feedback ? <p className="feedback">{routine.feedback}</p> : null}
            <div className="parent-check-actions">
              <button className="back-button full" type="button" onClick={() => void routine.resumeExtra()}>
                아직 덜 했어요
              </button>
              <button className="next-button full" style={{ backgroundColor: character.accent }} type="button" onClick={onConfirmParent}>
                도장 받기
              </button>
            </div>
          </section>
        </div>
      </section>
    );
  }

  return (
    <section className="routine-screen">
      <TopBar character={character} />
      <RoutineSceneLayer habit={routine.selectedHabit} status={routine.status} rewardPulse />
      <aside className="routine-card-panel compact">
        <div className="complete-icon">★</div>
        <p className="routine-lyrics short">{routine.lyrics.reward}</p>
        <div className="streak-card">도장 1개를 받았어요.</div>
        <button className="next-button full" style={{ backgroundColor: character.accent }} type="button" onClick={onShowStamps}>
          도장판 보기
        </button>
      </aside>
    </section>
  );
}

function RoutineSceneLayer({ habit, status, rewardPulse = false }: { habit: HabitTemplate; status: RoutineStatus; rewardPulse?: boolean }) {
  const stage = habit.id === 'brush' || habit.id === 'wash' ? 'bathroom' : 'main';
  const mood = status === 'routine'
    ? habit.id === 'brush'
      ? 'brush'
      : habit.id === 'veggie'
        ? 'eat'
        : 'celebrate'
    : status === 'reward'
      ? 'reward'
      : status === 'cue'
        ? 'walk'
        : 'wave';

  return (
    <div className="routine-3d-scene">
      <HabitScene drawerOpen={false} mood={mood} rewardPulse={rewardPulse} stage={stage} variant="routine" />
    </div>
  );
}

function TimerRing({ seconds, progress, accent }: { seconds: number; progress: number; accent: string }) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const rest = (seconds % 60).toString().padStart(2, '0');
  return (
    <div className="timer-wrap">
      <div
        className="timer-ring"
        style={{
          background: `conic-gradient(${accent} ${progress * 3.6}deg, #F3EFE7 0deg)`
        }}
      >
        <div>
          {minutes}:{rest}
        </div>
      </div>
      <strong>남은 시간</strong>
    </div>
  );
}

function PauseConfirmModal({ onContinue, onReturnHome }: { onContinue: () => void; onReturnHome: () => void }) {
  return (
    <div className="pause-modal-layer" role="presentation">
      <section className="pause-modal" role="dialog" aria-modal="true" aria-labelledby="pause-modal-title">
        <h2 id="pause-modal-title">잠깐 멈췄어요</h2>
        <div className="pause-actions">
          <button className="pause-return-button" type="button" onClick={onReturnHome}>
            그만하기
          </button>
          <button className="pause-continue-button" type="button" onClick={onContinue}>
            계속하기
          </button>
        </div>
      </section>
    </div>
  );
}

function PanelTitle({ icon, title }: { icon?: string; title: string }) {
  return (
    <div className="panel-title">
      {icon ? <span>{icon}</span> : null}
      <h1>{title}</h1>
    </div>
  );
}

function SelectCard({ emoji, label, selected, accent, onClick }: { emoji: string; label: string; selected: boolean; accent: string; onClick: () => void }) {
  return (
    <button className={selected ? 'select-card selected' : 'select-card'} style={{ borderColor: selected ? accent : '#CFE0FF' }} type="button" onClick={onClick}>
      <span>{emoji}</span>
      <strong>{label}</strong>
      {selected ? <em>✓</em> : null}
    </button>
  );
}

function Dots({ active, count, color }: { active: number; count: number; color: string }) {
  return (
    <div className="dots">
      {Array.from({ length: count }, (_, index) => (
        <span key={index} style={{ width: index <= active ? 36 : 16, backgroundColor: index <= active ? color : '#DADBD6' }} />
      ))}
    </div>
  );
}
