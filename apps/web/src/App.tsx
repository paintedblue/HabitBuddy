import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import {
  characters,
  habitTemplates,
  melodyPresets,
  type Character,
  type ChildProfile,
  type HabitId,
  type HabitTemplate,
  type RoutineEventType,
  type MelodyPresetId,
  type RoutineSession
} from '@habit-buddy/shared';
import { colorChoices, defaultProfile, foodChoices, habitBarrierChoices, identityChoices } from './domain/defaults';
import { HabitScene } from './components/HabitScene';
import { useRoutineSession, type RoutineStatus } from './state/useRoutineSession';
import { habitBuddyDb, type LocalAuth, type LocalGeneratedSong } from './storage/db';
import { generateSongLyrics, referenceAudioForMelody, requestSunoSong, syncSongRequest } from './api/songs';
import { buildLyricsGenerationInputs, buildSongGenerationInputs, createLocalSong, createQueuedSunoSong, habitIdForProfile, mergeSyncedSong, type SongPreview } from './songPipeline';
import { canStartSong, getRoutineLyricLines, sessionExportPayload, songStatusLabel, type SessionExportFormat } from './productQuality';
import { prepConfigForHabit, type PrepAnimId } from './domain/prep';
import type { CharacterMood } from './state/useRoutineSession';

type Tab = 'profile' | 'routine' | 'stamps';
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

  useEffect(() => {
    const pendingSongs = songs.filter((song) => (song.status === 'queued' || song.status === 'generating') && song.requestId);
    if (pendingSongs.length === 0) return;

    let cancelled = false;
    async function syncPendingSongs() {
      const currentSongs = await habitBuddyDb.listSongs();
      let changed = false;
      const nextSongs = await Promise.all(currentSongs.map(async (song) => {
        if ((song.status !== 'queued' && song.status !== 'generating') || !song.requestId) return song;
        try {
          const synced = await syncSongRequest(song.requestId);
          const merged = mergeSyncedSong(song, synced);
          if (merged !== song) changed = true;
          return merged;
        } catch (error) {
          console.warn('Suno song sync failed.', error);
          return song;
        }
      }));
      if (!cancelled && changed) {
        await habitBuddyDb.replaceSongs(nextSongs);
        setSongs(nextSongs);
      }
    }

    void syncPendingSongs();
    const timer = window.setInterval(() => {
      void syncPendingSongs();
    }, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [songs]);

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
    const referenceAudio = referenceAudioForMelody(profile.melodyPresetId);
    if (referenceAudio) {
      try {
        const request = await requestSunoSong({
          childId: profile.id,
          habitId: habitIdForProfile(profile),
          lyrics: preview.lyrics,
          inputs: buildSongGenerationInputs(profile, {
            url: referenceAudio.url,
            fileName: referenceAudio.fileName,
            durationSeconds: referenceAudio.durationSeconds
          })
        });
        const song = createQueuedSunoSong(profile, preview, request);
        await habitBuddyDb.saveSong(song);
        setSongs(await habitBuddyDb.listSongs());
        return song;
      } catch (error) {
        console.warn('Suno song request failed; no fallback song was saved.', error);
        throw error;
      }
    }

    const song = createLocalSong(profile, preview);
    await habitBuddyDb.saveSong(song);
    setSongs(await habitBuddyDb.listSongs());
    return song;
  }

  async function generateLyricsFromProfile(targetProfile: ChildProfile): Promise<SongPreview> {
    const generated = await generateSongLyrics({
      childId: targetProfile.id,
      habitId: habitIdForProfile(targetProfile),
      inputs: buildLyricsGenerationInputs(targetProfile)
    });
    return { title: generated.title, lyrics: generated.lyrics };
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

  function closeLogin() {
    if (!auth) {
      setAuthMode('setup');
      return;
    }
    setParentCode('');
    setAuthMode('authenticated');
  }

  async function logout() {
    routine.returnHome();
    setActiveTab(null);
    setCharacterPickerOpen(false);
    setShowPauseConfirm(false);
    setParentCode('');
    await habitBuddyDb.clearAuth();
    setAuth(null);
    setProfile((current) => ({ ...current, name: '' }));
    setAuthMode('setup');
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
        onClose={authMode === 'locked' ? closeLogin : undefined}
        onLogin={login}
        onLogout={() => void logout()}
        onRegister={(childName, parentPinLast4) => void registerAuth(childName, parentPinLast4)}
      />
    );
  }

  return (
    <main className={routineActive ? 'app-shell routine-mode' : 'app-shell'}>
      <section className={panelOpen ? 'stage dimmed' : 'stage'} style={{ '--accent': character.accent } as CSSProperties}>
        <TopBar character={character} childName={profile.name} panelOpen={panelOpen} onLock={lockApp} onLogout={() => void logout()} />
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
          {tab === 'profile' ? <ProfilePanel character={character} profile={profile} onChange={setProfile} onClose={closePanel} onGenerateLyrics={generateLyricsFromProfile} onGoRoutine={() => setActiveTab('routine')} onSaveSong={saveSongFromProfile} /> : null}
          {tab === 'routine' ? <RoutinePicker selectedId={habitIdForProfile(profile)} songs={songs} onCreateSong={openSongMakerForHabit} onStart={(habit, song) => void routine.startHabit(habit, song)} /> : null}
          {tab === 'stamps' ? <StampsPanel defaultHabitId={habitIdForProfile(profile)} sessions={sessions} /> : null}
        </DrawerPanel>
      ) : null}

      {routine.status !== 'home' ? (
        <RoutineOverlay
          character={character}
          childName={profile.name}
          parentCode={parentCode}
          progress={progress}
          routine={{
            status: routine.status,
            selectedHabit: routine.selectedHabit,
            selectedSong: routine.selectedSong,
            secondsLeft: routine.secondsLeft,
            lyrics: routine.lyrics,
            feedback: routine.feedback,
            resumeExtra: routine.resumeExtra,
            startHabit: routine.startHabit,
            beginRoutine: routine.beginRoutine,
            recordEvent: routine.recordEvent,
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
  onClose,
  onLogin,
  onLogout,
  onRegister
}: {
  auth: LocalAuth | null;
  defaultChildName: string;
  mode: Exclude<AuthMode, 'loading' | 'authenticated'>;
  onClose?: () => void;
  onLogin: (childName: string, parentPinLast4: string) => boolean;
  onLogout: () => void;
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
        {onClose ? (
          <button className="auth-close-button" type="button" aria-label="로그인 창 닫기" onClick={onClose}>
            ×
          </button>
        ) : null}
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
        {isLogin ? (
          <button className="auth-logout-button" type="button" onClick={onLogout}>
            로그아웃
          </button>
        ) : null}
      </section>
    </main>
  );
}

function TopBar({
  character,
  childName,
  onLock,
  onLogout,
  panelOpen = false
}: {
  character: Character;
  childName?: string;
  onLock?: () => void;
  onLogout?: () => void;
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
        {onLogout ? (
          <button className="logout-button" type="button" onClick={onLogout}>
            로그아웃
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
        <HabitScene drawerOpen={false} mood="wave" rewardPulse={false} stage="main" variant="home" />
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
const princessPreviewAudioUrl = '/assets/audio/princess_bgm_cut.mp3';
const habitChoiceMeta: Record<string, { icon: string; tone: string }> = {
  '양치': { icon: '🪥', tone: '#FF8D86' },
  '손씻기': { icon: '🫧', tone: '#78D8C7' },
  '정리정돈': { icon: '🧹', tone: '#9DB9FF' },
  '옷 정리하기': { icon: '👕', tone: '#A99AEF' },
  '채소 먹기': { icon: '🥦', tone: '#7ACB7A' }
};

function ProfilePanel({
  character,
  profile,
  onChange,
  onClose,
  onGenerateLyrics,
  onGoRoutine,
  onSaveSong
}: {
  character: Character;
  profile: ChildProfile;
  onChange: (profile: ChildProfile) => void;
  onClose: () => void;
  onGenerateLyrics: (profile: ChildProfile) => Promise<SongPreview>;
  onGoRoutine: () => void;
  onSaveSong: (preview: SongPreview) => Promise<LocalGeneratedSong>;
}) {
  const [step, setStep] = useState<ProfileWizardStep>('habit');
  const [directTarget, setDirectTarget] = useState<DirectInputTarget>(null);
  const [directValue, setDirectValue] = useState('');
  const [lyricVariant, setLyricVariant] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [previewingMelodyId, setPreviewingMelodyId] = useState<MelodyPresetId | null>(null);
  const [playProgress, setPlayProgress] = useState(0);
  const [savingSong, setSavingSong] = useState(false);
  const [aiSongPreview, setAiSongPreview] = useState<SongPreview | null>(null);
  const [lyricsConfirmed, setLyricsConfirmed] = useState(false);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [lyricsError, setLyricsError] = useState('');
  const [generationError, setGenerationError] = useState('');
  const [completedSteps, setCompletedSteps] = useState<Set<ProfileWizardStep>>(() => new Set());
  const playTimer = useRef<number | null>(null);
  const previewAudio = useRef<HTMLAudioElement | null>(null);
  const stepIndex = profileWizardSteps.indexOf(step);
  const localSongPreview = useMemo(() => buildSongPreview(profile, lyricVariant), [lyricVariant, profile]);
  const songPreview = aiSongPreview ?? localSongPreview;

  useEffect(() => () => {
    if (playTimer.current) window.clearInterval(playTimer.current);
    if (previewAudio.current) {
      previewAudio.current.pause();
      previewAudio.current = null;
    }
  }, []);

  useEffect(() => {
    setCompletedSteps(completedWizardStepsForProfile(profile));
  }, [profile]);

  useEffect(() => {
    stopPreview();
    setDirectTarget(null);
    setDirectValue('');
  }, [step]);

  useEffect(() => {
    setAiSongPreview(null);
    setLyricsConfirmed(false);
    setLyricsError('');
  }, [profile]);

  useEffect(() => {
    if (step !== 'result') return;
    let cancelled = false;
    setLyricsLoading(true);
    setLyricsError('');
    setAiSongPreview(null);
    setLyricsConfirmed(false);
    onGenerateLyrics(profile)
      .then((preview) => {
        if (!cancelled) setAiSongPreview(preview);
      })
      .catch((error) => {
        console.warn('OpenAI lyrics generation failed; blocking song generation until AI lyrics are available.', error);
        if (!cancelled) {
          const code = error instanceof Error && 'code' in error ? String((error as Error & { code?: string }).code) : '';
          setLyricsError(code === 'missing_openai_api_key'
              ? 'API 서버에 AI 키가 없어 가사를 만들 수 없어요.'
            : code === 'lyrics_safety_failed'
              ? 'AI 가사가 안전 기준을 통과하지 못했어요. 다시 만들어 주세요.'
              : code === 'network_error'
                ? 'API 서버에 연결할 수 없어요. API 서버가 켜져 있는지 확인해 주세요.'
                : 'AI 가사를 만들 수 없어요. 잠시 후 다시 시도해 주세요.');
        }
      })
      .finally(() => {
        if (!cancelled) setLyricsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [lyricVariant, step]);

  function stopPreview() {
    if (playTimer.current) window.clearInterval(playTimer.current);
    playTimer.current = null;
    if (previewAudio.current) {
      previewAudio.current.pause();
      previewAudio.current = null;
    }
    setPlaying(false);
    setPreviewingMelodyId(null);
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
    const initialProgress = playProgress >= 100 ? 0 : playProgress;
    if (playProgress >= 100) setPlayProgress(0);
    if (profile.melodyPresetId === 'princess') {
      playPrincessPreview((initialProgress / 100) * previewDurationSeconds);
    } else {
      playPreviewTone(profile.melodyPresetId);
    }
    const started = Date.now() - (initialProgress / 100) * previewDurationSeconds * 1000;
    playTimer.current = window.setInterval(() => {
      const next = Math.min(100, ((Date.now() - started) / (previewDurationSeconds * 1000)) * 100);
      setPlayProgress(next);
      if (next >= 100) stopPreview();
    }, 120);
  }

  function previewMelody(melodyPresetId: MelodyPresetId) {
    if (previewingMelodyId === melodyPresetId) {
      stopPreview();
      return;
    }
    stopPreview();
    setPlayProgress(0);
    setPreviewingMelodyId(melodyPresetId);
    if (melodyPresetId === 'princess') {
      playPrincessPreview(0, () => {
        setPreviewingMelodyId(null);
      });
      const audio = previewAudio.current;
      playTimer.current = window.setTimeout(() => {
        if (audio && previewAudio.current === audio) stopPreview();
      }, previewDurationSeconds * 1000);
      return;
    }
    playPreviewTone(melodyPresetId);
    playTimer.current = window.setTimeout(() => {
      setPreviewingMelodyId(null);
      playTimer.current = null;
    }, 1200);
  }

  function playPrincessPreview(startSeconds: number, onFinished?: () => void) {
    const audio = new Audio(princessPreviewAudioUrl);
    previewAudio.current = audio;
    audio.currentTime = Math.max(0, Math.min(startSeconds, previewDurationSeconds - 0.1));
    audio.onended = () => {
      if (previewAudio.current === audio) {
        previewAudio.current = null;
        onFinished?.();
      }
    };
    void audio.play().catch(() => {
      if (previewAudio.current === audio) {
        previewAudio.current = null;
        onFinished?.();
      }
    });
  }

  function regenerate() {
    stopPreview();
    setPlayProgress(0);
    setAiSongPreview(null);
    setLyricsConfirmed(false);
    setLyricVariant((value) => value + 1);
  }

  function confirmLyrics() {
    if (!aiSongPreview) return;
    setGenerationError('');
    setLyricsConfirmed(true);
  }

  async function saveAndGoRoutine() {
    if (!aiSongPreview) {
      setGenerationError('가사가 만들어진 뒤에 동요를 만들 수 있어요.');
      return;
    }
    if (!lyricsConfirmed) {
      setGenerationError('가사를 확정한 뒤에 동요를 만들 수 있어요.');
      return;
    }
    setSavingSong(true);
    setGenerationError('');
    try {
      await onSaveSong(aiSongPreview);
      stopPreview();
      onGoRoutine();
    } catch {
      setGenerationError('동요 생성에 실패했어요. 네트워크와 API 설정을 확인해 주세요.');
    } finally {
      setSavingSong(false);
    }
  }

  async function saveAndMakeAnother() {
    if (!aiSongPreview) {
      setGenerationError('가사가 만들어진 뒤에 동요를 만들 수 있어요.');
      return;
    }
    if (!lyricsConfirmed) {
      setGenerationError('가사를 확정한 뒤에 동요를 만들 수 있어요.');
      return;
    }
    setSavingSong(true);
    setGenerationError('');
    try {
      await onSaveSong(aiSongPreview);
      stopPreview();
      setPlayProgress(0);
      setLyricVariant((value) => value + 1);
      setStep('melody');
    } catch {
      setGenerationError('동요 생성에 실패했어요. 네트워크와 API 설정을 확인해 주세요.');
    } finally {
      setSavingSong(false);
    }
  }

  return (
    <section className="panel-page profile-page song-wizard">
      <PanelTitle icon="★" title={`${profile.name || '친구'}의 동요 만들기`} />
      <Dots active={stepIndex} count={profileWizardSteps.length} color={character.accent} />
      {step !== 'result' ? <WizardStepContent profile={profile} selectedSteps={completedSteps} step={step} directTarget={directTarget} directValue={directValue} previewingMelodyId={previewingMelodyId} onApplyDirect={applyDirectValue} onChangeDirect={setDirectValue} onChangeProfile={updateProfile} onPreviewMelody={previewMelody} onSelectStep={markStepSelected} onSetDirectTarget={setDirectTarget} /> : (
        <SongResult
          preview={songPreview}
          playing={playing}
          progress={playProgress}
          saving={savingSong}
          lyricsLoading={lyricsLoading}
          lyricsError={lyricsError}
          lyricsReady={!!aiSongPreview}
          lyricsConfirmed={lyricsConfirmed}
          generationError={generationError}
          referenceAudio={referenceAudioForMelody(profile.melodyPresetId)}
          onConfirmLyrics={confirmLyrics}
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
  onPreviewMelody,
  onSelectStep,
  onSetDirectTarget,
  previewingMelodyId,
  profile,
  selectedSteps,
  step
}: {
  directTarget: DirectInputTarget;
  directValue: string;
  onApplyDirect: () => void;
  onChangeDirect: (value: string) => void;
  onChangeProfile: (profile: ChildProfile) => void;
  onPreviewMelody: (melodyPresetId: MelodyPresetId) => void;
  onSelectStep: (step?: ProfileWizardStep) => void;
  onSetDirectTarget: (target: DirectInputTarget) => void;
  previewingMelodyId: MelodyPresetId | null;
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
    const choices = habitBarrierChoices[profile.hardHabit] ?? habitBarrierChoices['양치'];
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
        {melodyPresets.map((preset) => {
          const isPreviewing = previewingMelodyId === preset.id;
          return (
            <div
              className={profile.melodyPresetId === preset.id ? 'melody-card selected' : 'melody-card'}
              key={preset.id}
            >
              <button className={isPreviewing ? 'melody-play-button playing' : 'melody-play-button'} type="button" aria-label={isPreviewing ? `${preset.label} 멈춤` : `${preset.label} 들어보기`} onClick={() => onPreviewMelody(preset.id)}>
                {isPreviewing ? 'Ⅱ' : '▶'}
              </button>
              <button
                className="melody-select-main"
                type="button"
                onClick={() => {
                  onSelectStep('melody');
                  onChangeProfile({ ...profile, melodyPresetId: preset.id });
                }}
              >
                <span className="melody-icon">{preset.icon}</span>
                <span>
                  <strong>{preset.label}</strong>
                  <small>{preset.description}</small>
                </span>
              </button>
              <em>{profile.melodyPresetId === preset.id ? '✓' : '+'}</em>
            </div>
          );
        })}
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
  onConfirmLyrics,
  onPlay,
  onRegenerate,
  onSaveAndGoRoutine,
  generationError,
  lyricsError,
  lyricsConfirmed,
  lyricsLoading,
  lyricsReady,
  playing,
  preview,
  progress,
  referenceAudio,
  saving,
}: {
  onConfirmLyrics: () => void;
  onPlay: () => void;
  onRegenerate: () => void;
  onSaveAndGoRoutine: () => void;
  generationError: string;
  lyricsError: string;
  lyricsConfirmed: boolean;
  lyricsLoading: boolean;
  lyricsReady: boolean;
  playing: boolean;
  preview: SongPreview;
  progress: number;
  referenceAudio?: { url: string; fileName: string; durationSeconds?: number };
  saving: boolean;
}) {
  const elapsedSeconds = Math.round((progress / 100) * previewDurationSeconds);
  const canCreateSong = !!referenceAudio && lyricsReady && lyricsConfirmed && !lyricsLoading && !saving;
  const canConfirmLyrics = lyricsReady && !lyricsConfirmed && !lyricsLoading && !saving;
  return (
    <div className="song-result">
      <div className="song-complete-header">
        <div className="song-complete-badge">{lyricsConfirmed ? '★ 가사 확정' : '♪ 가사 만들기'}</div>
        <h2>{lyricsConfirmed ? '이제 멜로디로 동요를 만들어요' : '가사를 확인해 주세요'}</h2>
        <p>{lyricsConfirmed ? '선택한 예시 멜로디 느낌으로 완성할게요' : '마음에 들면 가사를 확정해 주세요'}</p>
      </div>
      <section className="song-result-card">
        <p className="song-eyebrow">동요 제목</p>
        <h2>{lyricsReady ? preview.title : 'AI 가사를 기다리고 있어요'}</h2>
        {lyricsLoading ? <p className="song-generation-status">AI 가사를 만드는 중이에요...</p> : null}
        {lyricsError ? <p className="song-generation-status warning">{lyricsError}</p> : null}
        {lyricsConfirmed ? <p className="song-generation-status confirmed">가사가 확정됐어요. 이제 동요를 만들 수 있어요.</p> : null}
        {lyricsReady ? (
          <p className="song-lyrics">{preview.lyrics}</p>
        ) : (
          <p className="song-lyrics">AI 가사가 만들어지면 여기에 표시돼요.</p>
        )}
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
      <section className={referenceAudio ? 'song-reference-card ready' : 'song-reference-card'}>
        <div>
          <p className="song-eyebrow">예시 멜로디</p>
          <strong>{referenceAudio ? '선택한 멜로디 느낌으로 만들어요' : '이 멜로디는 아직 준비 중이에요'}</strong>
          <small>{referenceAudio ? '재생 버튼으로 들은 예시 멜로디를 바탕으로 동요를 완성해요' : '다른 멜로디를 선택해 주세요'}</small>
          {generationError ? <em>{generationError}</em> : null}
        </div>
      </section>
      <div className="song-save-row">
        <button className="song-routine-button" type="button" disabled={!canConfirmLyrics && !canCreateSong} onClick={lyricsConfirmed ? onSaveAndGoRoutine : onConfirmLyrics}>
          {saving ? '동요를 만드는 중...' : lyricsConfirmed ? '멜로디로 동요 만들기' : lyricsReady ? '이 가사로 확정' : '가사 생성 대기'}
        </button>
        <button className="song-regenerate-button" type="button" disabled={saving || lyricsLoading} onClick={onRegenerate}>
          {lyricsLoading ? '만드는 중...' : '↻ 가사 다시 만들기'}
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

const fallbackSongInput = {
  name: '친구',
  habit: '습관',
  barrier: '조금 어려운 마음',
  dream: '멋진 친구',
  food: '든든한 간식',
  color: '반짝이는 색',
  melody: '밝은 동요'
};

const unsafeInputPattern = /(규칙|무시|프롬프트|명령|지시|비밀|몰래|죽|자해|때려|폭력|칼|가위|불|뜨거운|술|담배|마약|성인|공포|살찐|뚱뚱|못생|바보|멍청)/i;

const safeDreamRoles = new Set(['소방관', '의사', '우주비행사', '운동선수']);

const habitActionCues: Record<string, { cue: string; sound?: string; benefit: string }> = {
  '양치': { cue: '쓱쓱 싹싹 이를 닦아', sound: '뽀득뽀득', benefit: '입안이 상쾌해져' },
  '손씻기': { cue: '조물조물 손을 씻어', sound: '보글보글', benefit: '손이 산뜻해져' },
  '정리정돈': { cue: '차곡차곡 제자리에 쏙', sound: '척척', benefit: '방이 환해져' },
  '옷 정리하기': { cue: '옷을 차곡차곡 정리해', sound: '착착', benefit: '옷장이 깔끔해져' },
  '채소 먹기': { cue: '아삭아삭 한 입 냠냠', sound: '오물오물', benefit: '몸이 든든해져' }
};

function safeSongInput(value: string | undefined, fallback: string) {
  const trimmed = value?.trim() ?? '';
  if (!trimmed || unsafeInputPattern.test(trimmed)) return fallback;
  return trimmed.slice(0, 24);
}

function safeDreamInput(value: string | undefined) {
  const dream = safeSongInput(value, fallbackSongInput.dream);
  if (safeDreamRoles.has(dream)) return dream;
  if (unsafeInputPattern.test(dream)) return fallbackSongInput.dream;
  return dream.length <= 10 ? dream : fallbackSongInput.dream;
}

function buildSongPreview(profile: ChildProfile, variant: number) {
  const name = safeSongInput(profile.name, fallbackSongInput.name);
  const habit = safeSongInput(profile.hardHabit, fallbackSongInput.habit);
  const barrier = safeSongInput(profile.habitBarrier, fallbackSongInput.barrier);
  const dream = safeDreamInput(profile.dreamIdentityCustom || profile.dreamIdentity);
  const food = safeSongInput(profile.favoriteFood, fallbackSongInput.food);
  const color = safeSongInput(colorChoices.find((item) => item.color === profile.favoriteColor)?.label, fallbackSongInput.color);
  const melody = safeSongInput(melodyPresets.find((item) => item.id === profile.melodyPresetId)?.label, fallbackSongInput.melody);
  const action = habitActionCues[habit] ?? { cue: `${habit} 천천히 해봐`, benefit: '마음이 반짝해져' };
  const chorusSound = action.sound ? `${action.sound} ` : '';
  const chorus = [
    `${action.cue}`,
    `${dream} 꿈에 한 걸음 가까워`,
    `${chorusSound}한 번 더 천천히`,
    `${name}야, 오늘도 반짝 해보자`
  ].join('\n');
  const verseOpeners = [
    `${name}야, ${barrier} 마음 알아`,
    `${name}야, ${barrier} 마음 괜찮아`,
    `${name}야, ${barrier} 마음 들었어`
  ];

  return {
    title: `${name}의 ${habit} ${melody}`,
    lyrics: [
      '[Verse 1]',
      verseOpeners[variant % verseOpeners.length],
      '그 마음 안아 주고',
      '우리 천천히 같이 해',
      '',
      '[Chorus]',
      chorus,
      '',
      '[Verse 2]',
      `${habit} 하면 ${action.benefit}`,
      `${color}처럼 반짝반짝`,
      `${food}처럼 든든하게`,
      '웃음이 톡톡 피어나',
      '',
      '[Chorus]',
      chorus,
      '',
      '[Outro]',
      `다 했어! 잘했어 ${name}!`,
      '반짝 웃음 짝짝짝'
    ].join('\n')
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
      calm: [392, 440, 523, 440],
      princess: [659, 784, 880, 784]
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
    const playableSongs = nextSongs.filter(canStartSong);
    setCandidateId(habit.id);
    setSelectedSongId(nextSongs[0]?.id ?? null);
    if (nextSongs.length === 1 && playableSongs.length === 1) {
      onStart(habit, playableSongs[0]);
      return;
    }
    if (nextSongs.length > 1) setStep('song');
    if (nextSongs.length === 1) setStep('song');
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
          <button className="next-button full" type="button" disabled={!selectedSong || !canStartSong(selectedSong)} onClick={() => selectedSong && canStartSong(selectedSong) ? onStart(selectedHabit, selectedSong) : undefined}>
            {selectedSong && !canStartSong(selectedSong) ? songStatusLabel(selectedSong) : '이 동요로 시작하기'}
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
  const playable = canStartSong(song);

  return (
    <button className={selected ? 'song-choice-card selected' : 'song-choice-card'} type="button" onClick={onClick}>
      <span className="song-choice-play">▶</span>
      <div className="song-choice-copy">
        <em>{melody}</em>
        <strong>{song.title}</strong>
        <small>“{preview}”</small>
        {!playable ? <small className={song.status === 'failed' ? 'song-status failed' : 'song-status'}>{songStatusLabel(song)}</small> : null}
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
  function exportSessions(format: SessionExportFormat) {
    const payload = sessionExportPayload(sessions, format);
    const blob = new Blob([payload.body], { type: payload.mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = payload.fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }

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
      <div className="session-export-card">
        <div>
          <strong>연구 세션 로그</strong>
          <small>{sessions.length}개 세션을 내보낼 수 있어요.</small>
        </div>
        <button type="button" disabled={sessions.length === 0} onClick={() => exportSessions('json')}>
          JSON
        </button>
        <button type="button" disabled={sessions.length === 0} onClick={() => exportSessions('csv')}>
          CSV
        </button>
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
  childName,
  parentCode,
  progress,
  routine,
  setParentCode,
  onConfirmParent,
  onPauseExit,
  onShowStamps
}: {
  character: Character;
  childName: string;
  parentCode: string;
  progress: number;
  routine: {
    status: RoutineStatus;
    selectedHabit: HabitTemplate;
    selectedSong: LocalGeneratedSong | null;
    secondsLeft: number;
    lyrics: { cue: string; routine: string; reward: string };
    feedback: string;
    resumeExtra: () => Promise<void>;
    startHabit: (habit: HabitTemplate, song?: LocalGeneratedSong) => Promise<void>;
    beginRoutine: (habit?: HabitTemplate, session?: RoutineSession | null) => Promise<void>;
    recordEvent: (type: RoutineEventType) => void;
    markRewardViewed: () => void;
  };
  setParentCode: (value: string) => void;
  onConfirmParent: () => void;
  onPauseExit: () => void;
  onShowStamps: () => void;
}) {
  if (routine.status === 'routine') {
    const lyricLines = getRoutineLyricLines(routine.lyrics.routine);
    const activeLyricIndex = lyricLines.length > 0
      ? Math.min(lyricLines.length - 1, Math.floor((progress / 100) * lyricLines.length))
      : 0;
    const songTitle = routine.selectedSong?.title ?? `${routine.selectedHabit.name} 동요`;

    return (
      <section className="routine-screen">
        <TopBar character={character} />
        <RoutineSceneLayer habit={routine.selectedHabit} status={routine.status} />
        <aside className="routine-card-panel song-playback-panel">
          <div className="routine-label song-title-label">
            <span aria-hidden="true">♪</span>
            {songTitle}
          </div>
          <div className="routine-lyrics song-lyrics-list" aria-label="동요 가사">
            {lyricLines.map((line, index) => (
              <span key={`${line}-${index}`} className={index === activeLyricIndex ? 'song-lyric-line active' : 'song-lyric-line'}>
                {line}
              </span>
            ))}
          </div>
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
      <PrepScreen
        character={character}
        childName={childName}
        habit={routine.selectedHabit}
        hasGeneratedSong={!!routine.selectedSong?.audioUrl || !!routine.selectedSong?.streamAudioUrl}
        onBeginRoutine={() => void routine.beginRoutine()}
        onRecordEvent={routine.recordEvent}
      />
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

type PrepSubState = 'intro' | 'action' | 'confirm' | 'hype' | 'done';

function PrepScreen({
  character,
  childName,
  habit,
  hasGeneratedSong,
  onBeginRoutine,
  onRecordEvent
}: {
  character: Character;
  childName: string;
  habit: HabitTemplate;
  hasGeneratedSong: boolean;
  onBeginRoutine: () => void;
  onRecordEvent: (type: RoutineEventType) => void;
}) {
  const config = prepConfigForHabit(habit.id);
  const [stepIndex, setStepIndex] = useState(0);
  const [subState, setSubState] = useState<PrepSubState>('intro');
  const startedRef = useRef(false);
  const completedRef = useRef(false);
  const currentStep = config.steps[stepIndex] ?? config.steps[0];
  const isLastStep = stepIndex >= config.steps.length - 1;
  const actionProgress = subState === 'intro' ? 18 : subState === 'action' ? 44 : subState === 'confirm' ? 68 : subState === 'hype' ? 86 : 100;
  const stepProgress = ((stepIndex + (subState === 'done' ? 1 : actionProgress / 100)) / config.steps.length) * 100;
  const contentProgress = hasGeneratedSong ? 100 : Math.min(96, Math.round(stepProgress));
  const characterMood = prepMoodForAnim(currentStep.animId, subState);
  const buddyName = childName.trim() || '친구';

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    onRecordEvent('prep_flow_started');
  }, [onRecordEvent]);

  useEffect(() => {
    if (subState === 'intro') {
      const timer = window.setTimeout(() => setSubState('action'), 1500);
      return () => window.clearTimeout(timer);
    }
    if (subState === 'confirm') {
      const timer = window.setTimeout(() => setSubState('hype'), 450);
      return () => window.clearTimeout(timer);
    }
    if (subState === 'hype') {
      const timer = window.setTimeout(() => {
        if (isLastStep) {
          setSubState('done');
          return;
        }
        setStepIndex((value) => value + 1);
        setSubState('intro');
      }, 1300);
      return () => window.clearTimeout(timer);
    }
    if (subState === 'done' && !completedRef.current) {
      completedRef.current = true;
      onRecordEvent('prep_flow_completed');
      const timer = window.setTimeout(onBeginRoutine, 700);
      return () => window.clearTimeout(timer);
    }
  }, [isLastStep, onBeginRoutine, onRecordEvent, subState]);

  function completeAction() {
    onRecordEvent('prep_step_completed');
    setSubState('confirm');
  }

  function skipPrep() {
    onRecordEvent('prep_step_skipped');
    onRecordEvent('prep_flow_completed');
    onBeginRoutine();
  }

  const line = subState === 'intro'
    ? currentStep.cognitiveLine.text
    : subState === 'action'
      ? currentStep.behavioralPrompt.text
      : subState === 'confirm'
        ? '좋아, 잘했어!'
        : subState === 'hype'
          ? currentStep.emotionalLine.text
          : hasGeneratedSong
            ? '노래가 준비됐어. 이제 같이 시작하자!'
            : '준비 완료! 기본 동요로 같이 시작하자!';

  return (
    <section className="routine-screen prep-screen">
      <TopBar character={character} />
      <RoutineSceneLayer habit={habit} status="cue" moodOverride={characterMood} />
      <aside className="prep-panel" aria-label="캐릭터와 함께 준비하기">
        <div className="prep-eyebrow">
          <span aria-hidden="true">♪</span>
          캐릭터와 함께 준비하기
        </div>
        <h1>{config.introLine.text}</h1>
        <p className="prep-child-line">{buddyName}야, {habit.name} 전에 짧게 연습해보자.</p>
        <div className="prep-step-dots" aria-label={`준비 ${stepIndex + 1}/${config.steps.length}`}>
          {config.steps.map((step, index) => (
            <span key={step.id} className={index <= stepIndex ? 'active' : ''} />
          ))}
        </div>
        <section className="prep-dialogue">
          <small>{subState === 'intro' ? '왜 할까요?' : subState === 'action' ? '같이 해봐요' : subState === 'hype' ? '응원' : '준비 완료'}</small>
          <strong>{line}</strong>
        </section>
        <div className="prep-progress-block">
          <div className="prep-progress-copy">
            <span>동요 준비</span>
            <b>{contentProgress}%</b>
          </div>
          <div className="prep-progress-bar" aria-label="콘텐츠 생성 진행률">
            <span style={{ width: `${contentProgress}%` }} />
          </div>
        </div>
        <div className="prep-actions">
          {config.skippable ? (
            <button className="prep-skip-button" type="button" onClick={skipPrep}>
              건너뛰기
            </button>
          ) : null}
          {subState === 'action' ? (
            <button className="prep-action-button" type="button" onClick={completeAction}>
              했어요!
            </button>
          ) : (
            <button className="prep-action-button" type="button" disabled>
              {subState === 'done' ? '시작 준비 중' : '준비 중'}
            </button>
          )}
        </div>
      </aside>
    </section>
  );
}

function prepMoodForAnim(animId: PrepAnimId, subState: PrepSubState): CharacterMood {
  if (subState === 'intro') return 'wave';
  if (subState === 'confirm' || subState === 'hype' || subState === 'done') return 'thumbs_up';
  if (animId === 'anim.reach_forward') return 'reach_forward';
  if (animId === 'anim.look_around') return 'look_around';
  if (animId === 'anim.point') return 'point';
  if (animId === 'anim.thumbs_up') return 'thumbs_up';
  if (animId === 'anim.stretch') return 'stretch';
  if (animId === 'anim.yawn') return 'yawn';
  if (animId === 'anim.mouth_open_wide') return 'mouth_open_wide';
  return 'wave';
}

function RoutineSceneLayer({
  habit,
  status,
  moodOverride,
  rewardPulse = false
}: {
  habit: HabitTemplate;
  status: RoutineStatus;
  moodOverride?: CharacterMood;
  rewardPulse?: boolean;
}) {
  const stage = habit.id === 'brush' || habit.id === 'wash' ? 'bathroom' : 'main';
  const mood = moodOverride ?? (status === 'routine'
    ? habit.id === 'brush'
      ? 'brush'
      : habit.id === 'wash'
        ? 'wash'
      : habit.id === 'veggie'
        ? 'eat'
        : habit.id === 'tidy' || habit.id === 'clothes'
          ? 'mop'
          : 'celebrate'
    : status === 'reward'
      ? 'reward'
      : status === 'cue'
        ? 'wave'
        : 'wave');

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
