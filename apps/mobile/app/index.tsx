import { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  characters,
  habitTemplates,
  renderPersonalizedLyrics,
  type Character,
  type ChildProfile,
  type HabitId,
  type HabitSession,
  type ObserverNote,
  type RoutineEventType,
  type RoutineSession
} from '@habit-buddy/shared';
import { storage } from '../src/storage';

type Tab = 'profile' | 'routine' | 'stamps' | 'observer';
type ProfileStep = 'name' | 'habit' | 'barrier' | 'identity' | 'food' | 'color' | 'friend' | 'done';

const defaultProfile: ChildProfile = {
  id: 'local-child',
  name: '',
  hardHabit: '이 닦기',
  habitBarrier: '귀찮아요',
  dreamIdentity: '우주비행사',
  dreamIdentityCustom: '',
  favoriteFood: '떡볶이',
  favoriteColor: '#83D13B',
  friendName: '동요 친구',
  characterId: 'tori'
};

const profileSteps: ProfileStep[] = ['name', 'habit', 'barrier', 'identity', 'food', 'color', 'friend'];

const habitChoices = [
  { id: 'brush' as HabitId, emoji: '🪥', label: '이 닦기' },
  { id: 'wash' as HabitId, emoji: '🫧', label: '손 씻기' },
  { id: 'bed' as HabitId, emoji: '🛏️', label: '이불 정리' },
  { id: 'tidy' as HabitId, emoji: '🧸', label: '장난감 정리' },
  { id: 'brush' as HabitId, emoji: '😴', label: '일찍 자기' },
  { id: 'wash' as HabitId, emoji: '🍽️', label: '밥 잘 먹기' }
];

const foodChoices = [
  { emoji: '🍕', label: '피자' },
  { emoji: '🍜', label: '라면' },
  { emoji: '🌶️', label: '떡볶이' },
  { emoji: '🍙', label: '김밥' },
  { emoji: '🍗', label: '치킨' },
  { emoji: '🍦', label: '아이스크림' }
];

const identityChoices = [
  { emoji: '🚒', label: '소방관' },
  { emoji: '🩺', label: '의사' },
  { emoji: '🚀', label: '우주비행사' },
  { emoji: '👑', label: '공주' },
  { emoji: '🐾', label: '동물친구' },
  { emoji: '🎥', label: '유튜버' },
  { emoji: '⚽', label: '운동선수' },
  { emoji: '✨', label: '기타' }
];

const habitBarrierChoices: Record<string, string[]> = {
  '이 닦기': ['맛이 싫어요', '귀찮아요', '입에 넣는 느낌이 싫어요'],
  '손 씻기': ['물이 차가워요', '비누 느낌이 싫어요', '빨리 놀고 싶어요'],
  '이불 정리': ['어떻게 해야 할지 몰라요', '귀찮아요', '혼자 하기 싫어요'],
  '장난감 정리': ['아직 더 놀고 싶어요', '어디에 둘지 몰라요', '너무 많아요'],
  '일찍 자기': ['어두운 게 무서워요', '더 놀고 싶어요', '잠이 안 와요'],
  '밥 잘 먹기': ['맛이 낯설어요', '씹기 힘들어요', '배가 안 고파요']
};

const colorChoices = [
  { label: '주황', color: '#F5962A' },
  { label: '노랑', color: '#FFCC2E' },
  { label: '연두', color: '#B8D21E' },
  { label: '연초록', color: '#83D13B' },
  { label: '민트', color: '#43CDB6' },
  { label: '하늘', color: '#77C2E4' },
  { label: '파랑', color: '#5DA4DC' },
  { label: '남색', color: '#3F73F2' },
  { label: '보라', color: '#8D73D9' },
  { label: '분홍', color: '#F57EA6' },
  { label: '초록', color: '#35CC00' }
];

export default function Home() {
  const [tab, setTab] = useState<Tab | null>(null);
  const [profileStep, setProfileStep] = useState<ProfileStep>('name');
  const [profile, setProfile] = useState(defaultProfile);
  const [sessions, setSessions] = useState<HabitSession[]>([]);
  const [routineSessions, setRoutineSessions] = useState<RoutineSession[]>([]);
  const [observerNotes, setObserverNotes] = useState<ObserverNote[]>([]);
  const [activeSession, setActiveSession] = useState<RoutineSession | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [paused, setPaused] = useState(false);
  const [message, setMessage] = useState('안녕 친구! 오늘은 뭘 해볼까요? 😊');
  const [parentPromptCount, setParentPromptCount] = useState('0');
  const [engagement, setEngagement] = useState<ObserverNote['engagement']>('medium');
  const [leftRoutine, setLeftRoutine] = useState(false);
  const [freeNote, setFreeNote] = useState('');

  const character = characters.find((item) => item.id === profile.characterId) ?? characters[0];
  const defaultHabit = habitTemplates.find((habit) => habit.name === profile.hardHabit) ?? habitTemplates[0];
  const currentHabit = activeSession ? habitTemplates.find((habit) => habit.id === activeSession.habitId) : defaultHabit;
  const lyrics = renderPersonalizedLyrics(profile, currentHabit ?? defaultHabit);
  const stars = sessions.reduce((sum, session) => sum + session.stars, 0);
  const showRoutineFullScreen = tab === 'routine' && !!activeSession;

  useEffect(() => {
    Promise.all([
      storage.getProfile(),
      storage.getSessions(),
      storage.getRoutineSessions(),
      storage.getObserverNotes()
    ]).then(([savedProfile, savedSessions, savedRoutineSessions, savedObserverNotes]) => {
      if (savedProfile) setProfile({ ...defaultProfile, ...savedProfile });
      setSessions(savedSessions);
      setRoutineSessions(savedRoutineSessions);
      setObserverNotes(savedObserverNotes);
    });
  }, []);

  useEffect(() => {
    if (!activeSession || activeSession.phase !== 'routine' || paused || secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [activeSession, paused, secondsLeft]);

  useEffect(() => {
    if (!activeSession || activeSession.phase !== 'routine' || secondsLeft !== 0) return;
    const completed = withEvent({ ...activeSession, phase: 'reward', completedAt: new Date().toISOString(), stars: 2 }, 'routine_completed');
    persistRoutineSession(completed);
    setActiveSession(completed);
    const nextSessions = [...sessions, {
      id: `habit-${Date.now()}`,
      childId: profile.id,
      habitId: completed.habitId,
      completedAt: completed.completedAt!,
      stars: 2
    }];
    setSessions(nextSessions);
    void storage.setSessions(nextSessions);
    setMessage(`${profile.name || '친구'}야, 정말 잘했어요! 🌟`);
  }, [activeSession, profile.id, profile.name, secondsLeft, sessions]);

  async function saveProfile(nextProfile = profile) {
    await storage.setProfile(nextProfile);
    setMessage(`${nextProfile.name || '친구'}야, 나만의 동요가 준비됐어요!`);
  }

  function moveProfileStep(offset: 1 | -1) {
    const index = profileSteps.indexOf(profileStep);
    const next = profileSteps[index + offset];
    setProfileStep(next ?? profileStep);
  }

  async function completeProfile() {
    await saveProfile();
    setProfileStep('done');
  }

  function changeTab(nextTab: Tab | null) {
    setTab(nextTab);
    if (nextTab === 'profile') setMessage('너에 대해 알려줘! 👋');
    if (nextTab === 'routine') setMessage('오늘 어떤 습관을 해볼까요? 💪');
    if (nextTab === 'stamps') setMessage('오늘 모은 도장을 볼까요? ⭐');
    if (!nextTab) setMessage('안녕 친구! 오늘은 뭘 해볼까요? 😊');
  }

  function appendEvent(session: RoutineSession, type: RoutineEventType) {
    const next = withEvent(session, type);
    persistRoutineSession(next);
    setActiveSession(next);
    return next;
  }

  function withEvent(session: RoutineSession, type: RoutineEventType): RoutineSession {
    return {
      ...session,
      events: [...session.events, { id: `event-${Date.now()}-${type}`, type, at: new Date().toISOString() }]
    };
  }

  function persistRoutineSession(session: RoutineSession) {
    const exists = routineSessions.some((item) => item.id === session.id);
    const next = exists ? routineSessions.map((item) => (item.id === session.id ? session : item)) : [...routineSessions, session];
    setRoutineSessions(next);
    void storage.setRoutineSessions(next);
  }

  function startCue(habitId: HabitId = defaultHabit.id) {
    const habit = habitTemplates.find((item) => item.id === habitId) ?? defaultHabit;
    const base: RoutineSession = {
      id: `routine-${Date.now()}`,
      childId: profile.id,
      habitId,
      startedAt: new Date().toISOString(),
      phase: 'cue',
      stars: 0,
      events: []
    };
    const session = withEvent(withEvent(base, 'session_started'), 'cue_started');
    persistRoutineSession(session);
    setActiveSession(session);
    setTab('routine');
    setPaused(false);
    setMessage(renderPersonalizedLyrics(profile, habit).cue);
  }

  function beginRoutine() {
    if (!activeSession) return;
    const next = withEvent(withEvent({ ...activeSession, phase: 'routine' }, 'cue_completed'), 'routine_started');
    persistRoutineSession(next);
    setActiveSession(next);
    setSecondsLeft(Math.min((currentHabit ?? defaultHabit).durationSeconds, 15));
    setMessage(`${profile.name || '친구'}야, 같이 해봐요!`);
  }

  function pauseRoutine() {
    if (!activeSession) return;
    setPaused(true);
    appendEvent(activeSession, 'routine_paused');
  }

  function resumeRoutine() {
    if (!activeSession) return;
    setPaused(false);
    appendEvent(activeSession, 'routine_resumed');
  }

  function viewReward() {
    if (!activeSession) return;
    appendEvent(activeSession, 'reward_viewed');
    setTab('observer');
  }

  async function saveObserverNote() {
    if (!activeSession) return;
    const note: ObserverNote = {
      id: `note-${Date.now()}`,
      sessionId: activeSession.id,
      parentPromptCount: Number(parentPromptCount || 0),
      engagement,
      leftRoutine,
      note: freeNote.trim(),
      createdAt: new Date().toISOString()
    };
    const next = [...observerNotes, note];
    setObserverNotes(next);
    await storage.setObserverNotes(next);
    setParentPromptCount('0');
    setEngagement('medium');
    setLeftRoutine(false);
    setFreeNote('');
    setActiveSession(null);
    changeTab('stamps');
    setMessage('오늘의 관찰 기록을 저장했어요.');
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.appShell}>
        {showRoutineFullScreen && activeSession?.phase === 'cue' && (
          <RoutineTravelScene
            character={character}
            habit={currentHabit ?? defaultHabit}
            lyrics={lyrics.cue}
            name={profile.name || '친구'}
            onExit={() => {
              setActiveSession(null);
              changeTab(null);
            }}
            onStart={beginRoutine}
          />
        )}

        {showRoutineFullScreen && activeSession?.phase === 'routine' && (
          <RoutinePlayScene
            character={character}
            habit={currentHabit ?? defaultHabit}
            lyrics={lyrics.routine}
            paused={paused}
            secondsLeft={secondsLeft}
            onExit={() => {
              setActiveSession(null);
              changeTab(null);
            }}
            onPause={pauseRoutine}
            onResume={resumeRoutine}
          />
        )}

        {showRoutineFullScreen && activeSession?.phase === 'reward' && (
          <RewardPanel character={character} lyrics={lyrics.reward} onReview={viewReward} />
        )}

        {!showRoutineFullScreen && (
          <>
            <MainStage character={character} message={message} profile={profile} stars={stars} />
            <BottomTabs
              activeTab={tab}
              character={character}
              onChange={changeTab}
              panelOpen={!!tab}
              stars={stars}
            />
          </>
        )}

        {!!tab && !showRoutineFullScreen && (
          <View style={styles.sidePanel}>
          {tab === 'profile' && (
            <ProfileWizard
              character={character}
              profile={profile}
              profileStep={profileStep}
              onBack={() => moveProfileStep(-1)}
              onChangeProfile={setProfile}
              onComplete={completeProfile}
              onNext={() => moveProfileStep(1)}
              onRestart={() => setProfileStep('name')}
            />
          )}

          {tab === 'routine' && !activeSession && (
            <RoutinePicker
              character={character}
              selectedHabitLabel={profile.hardHabit}
              onSelect={(habit) => startCue(habit.id)}
            />
          )}

          {tab === 'stamps' && (
            <View style={styles.panelContent}>
              <Text style={styles.panelTitle}>내 도장판</Text>
              <View style={styles.stampBoard}>
                {Array.from({ length: 12 }).map((_, index) => (
                  <View key={index} style={[styles.stampCell, index < sessions.length && styles.stampCellDone]}>
                    <Text style={styles.stampText}>{index < sessions.length ? '⭐' : index + 1}</Text>
                  </View>
                ))}
              </View>
              <Text style={styles.muted}>완료한 습관 {sessions.length}개 · 별 {stars}개</Text>
              <Text style={styles.muted}>기록된 연구 세션 {routineSessions.length}개</Text>
            </View>
          )}

          {tab === 'observer' && activeSession?.phase === 'reward' && (
            <View style={styles.panelContent}>
              <Text style={styles.panelTitle}>세션 후 관찰 기록</Text>
              <TextInput value={parentPromptCount} onChangeText={setParentPromptCount} keyboardType="number-pad" placeholder="부모의 언어 지시 횟수" style={styles.input} />
              <View style={styles.segmentRow}>
                {(['low', 'medium', 'high'] as const).map((value) => (
                  <ChoiceChip key={value} label={value} selected={engagement === value} onPress={() => setEngagement(value)} color={character.accent} />
                ))}
              </View>
              <ActionButton label={leftRoutine ? '이탈함' : '이탈 없음'} color={leftRoutine ? '#D94A4A' : '#2EAD66'} onPress={() => setLeftRoutine((value) => !value)} />
              <TextInput value={freeNote} onChangeText={setFreeNote} placeholder="자유 메모" multiline style={[styles.input, styles.memoInput]} />
              <ActionButton label="관찰 기록 저장" color={character.accent} onPress={saveObserverNote} />
            </View>
          )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

function MainStage({ character, message, profile, stars }: { character: Character; message: string; profile: ChildProfile; stars: number }) {
  return (
    <View style={[styles.mainStage, { backgroundColor: character.background }]}>
      <View style={styles.circleOne} />
      <View style={styles.circleTwo} />
      <View style={styles.stageHeader}>
        <Text style={styles.logo}>♫ 동요 친구</Text>
        <View style={styles.headerPills}>
          <View style={styles.smallPill}><Text style={styles.pillText}>{character.name}⌄</Text></View>
          <View style={styles.smallPill}><Text style={styles.pillText}>⭐ {stars}</Text></View>
        </View>
      </View>
      <View style={styles.speechBubble}>
        <Text style={styles.speechText}>{message}</Text>
        <View style={styles.speechTail} />
      </View>
      <Mascot character={character} size={180} label={profile.name} />
    </View>
  );
}

function BottomTabs({
  activeTab,
  character,
  onChange,
  panelOpen
}: {
  activeTab: Tab | null;
  character: Character;
  panelOpen: boolean;
  stars: number;
  onChange: (tab: Tab | null) => void;
}) {
  const tabs: Array<{ id: Tab; icon: string; label: string; color: string }> = [
    { id: 'profile', icon: '♙', label: '나에 대해\n알려줘', color: '#DDF2FF' },
    { id: 'routine', icon: '🚀', label: '같이\n해봐요!', color: '#DDF8E7' },
    { id: 'stamps', icon: '▣', label: '내\n도장판', color: '#FFF0D9' }
  ];
  return (
    <View style={[styles.bottomNav, !panelOpen && styles.bottomNavClosed]}>
      {tabs.map((item) => (
        <TouchableOpacity
          key={item.id}
          onPress={() => onChange(activeTab === item.id ? null : item.id)}
          style={[
            styles.navButton,
            { backgroundColor: item.color },
            activeTab === item.id && { borderColor: item.id === 'routine' ? '#0E8348' : '#0D6EB8', borderWidth: 4 }
          ]}
        >
          <Text style={[styles.navIcon, { color: activeTab === item.id ? character.accent : '#116BA7' }]}>{item.icon}</Text>
          <Text style={[styles.navLabel, activeTab === item.id && { color: item.id === 'routine' ? '#087B43' : '#0D6EB8' }]}>{item.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function ProfileWizard({
  character,
  profile,
  profileStep,
  onBack,
  onChangeProfile,
  onComplete,
  onNext,
  onRestart
}: {
  character: Character;
  profile: ChildProfile;
  profileStep: ProfileStep;
  onBack: () => void;
  onChangeProfile: (profile: ChildProfile) => void;
  onComplete: () => void;
  onNext: () => void;
  onRestart: () => void;
}) {
  const stepIndex = Math.max(profileSteps.indexOf(profileStep), 0);
  const isDone = profileStep === 'done';

  return (
    <ScrollView contentContainerStyle={styles.panelContent}>
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>☀ 나에 대해 알려줘</Text>
        {!isDone && <Text style={styles.closeText}>×</Text>}
      </View>
      {!isDone && <ProgressDots active={stepIndex} count={profileSteps.length} color={character.accent} />}

      {profileStep === 'name' && (
        <>
          <Text style={styles.questionText}>너의 이름이 뭐야?</Text>
          <TextInput value={profile.name} onChangeText={(name) => onChangeProfile({ ...profile, name })} placeholder="이름을 알려줘!" style={[styles.input, styles.nameInput]} />
          <ActionButton label="확인! →" color={character.accent} onPress={onNext} />
        </>
      )}

      {profileStep === 'habit' && (
        <>
          <Text style={styles.questionText}>어떤 게 제일 어려워?</Text>
          <View style={styles.choiceGrid}>
            {habitChoices.map((item) => (
              <SelectCard
                key={`${item.label}-${item.id}`}
                emoji={item.emoji}
                label={item.label}
                selected={profile.hardHabit === item.label}
                onPress={() => onChangeProfile({ ...profile, hardHabit: item.label, habitBarrier: habitBarrierChoices[item.label]?.[0] ?? '' })}
                accent={character.accent}
              />
            ))}
          </View>
          <BackNextRow onBack={onBack} onNext={onNext} color={character.accent} />
        </>
      )}

      {profileStep === 'barrier' && (
        <>
          <Text style={styles.questionText}>왜 제일 어려울까요?</Text>
          <View style={styles.choiceGrid}>
            {(habitBarrierChoices[profile.hardHabit] ?? habitBarrierChoices['이 닦기']).map((label) => (
              <SelectCard
                key={label}
                emoji="💬"
                label={label}
                selected={profile.habitBarrier === label}
                onPress={() => onChangeProfile({ ...profile, habitBarrier: label })}
                accent={character.accent}
              />
            ))}
          </View>
          <BackNextRow onBack={onBack} onNext={onNext} color={character.accent} />
        </>
      )}

      {profileStep === 'identity' && (
        <>
          <Text style={styles.questionText}>커서 어떤 모습이 되고 싶어?</Text>
          <View style={styles.choiceGrid}>
            {identityChoices.map((item) => (
              <SelectCard
                key={item.label}
                emoji={item.emoji}
                label={item.label}
                selected={profile.dreamIdentity === item.label}
                onPress={() => onChangeProfile({ ...profile, dreamIdentity: item.label })}
                accent={character.accent}
              />
            ))}
          </View>
          {profile.dreamIdentity === '기타' && (
            <TextInput
              value={profile.dreamIdentityCustom}
              onChangeText={(dreamIdentityCustom) => onChangeProfile({ ...profile, dreamIdentityCustom })}
              placeholder="어떤 모습인지 알려줘!"
              style={[styles.input, styles.nameInput]}
            />
          )}
          <BackNextRow onBack={onBack} onNext={onNext} color={character.accent} />
        </>
      )}

      {profileStep === 'food' && (
        <>
          <Text style={styles.questionText}>제일 좋아하는 음식은?</Text>
          <View style={styles.choiceGrid}>
            {foodChoices.map((item) => (
              <SelectCard
                key={item.label}
                emoji={item.emoji}
                label={item.label}
                selected={profile.favoriteFood === item.label}
                onPress={() => onChangeProfile({ ...profile, favoriteFood: item.label })}
                accent={character.accent}
              />
            ))}
          </View>
          <BackNextRow onBack={onBack} onNext={onNext} color={character.accent} />
        </>
      )}

      {profileStep === 'color' && (
        <>
          <Text style={styles.questionText}>제일 좋아하는 색깔은?</Text>
          <View style={styles.colorGrid}>
            {colorChoices.map((item) => (
              <TouchableOpacity
                key={item.label}
                onPress={() => onChangeProfile({ ...profile, favoriteColor: item.color })}
                style={[styles.colorCard, { backgroundColor: item.color }, profile.favoriteColor === item.color && styles.selectedColorCard]}
              >
                <Text style={styles.colorLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <BackNextRow onBack={onBack} onNext={onNext} color={character.accent} />
        </>
      )}

      {profileStep === 'friend' && (
        <>
          <Text style={styles.questionText}>누구랑 같이 부를까?</Text>
          <View style={styles.characterGrid}>
            {characters.map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => onChangeProfile({ ...profile, characterId: item.id, friendName: item.name })}
                style={[styles.characterChoice, profile.characterId === item.id && { borderColor: item.accent, backgroundColor: item.background }]}
              >
                <Mascot character={item} size={78} />
                <Text style={styles.choiceLabel}>{item.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <BackNextRow onBack={onBack} onNext={onComplete} color={character.accent} nextLabel="완성!" />
        </>
      )}

      {isDone && (
        <View style={styles.completeBox}>
          <Text style={styles.completeIcon}>🎉</Text>
          <Text style={styles.doneTitle}>{profile.name || '친구'}야, 완성됐어!</Text>
          <Text style={styles.muted}>나만의 동요가 준비됐어요!</Text>
          <View style={styles.lyricPreview}>
            <Text style={styles.lyricPreviewText}>♫ "{profile.name || '친구'}야, {selectedHabitLabel(profile)} 같이 해봐요~"</Text>
            <Text style={[styles.lyricPreviewText, { color: character.accent }]}>{profileDreamLabel(profile)}처럼 멋진 {profile.name || '친구'}의 동요!</Text>
            <Text style={styles.lyricPreviewText}>{profile.habitBarrier || '조금 어려워도'} 같이 해봐요.</Text>
          </View>
          <ActionButton label="다시 고르기" color={character.accent} onPress={onRestart} />
        </View>
      )}
    </ScrollView>
  );
}

function RoutinePicker({ character, selectedHabitLabel, onSelect }: { character: Character; selectedHabitLabel: string; onSelect: (habit: { id: HabitId; label: string }) => void }) {
  return (
    <View style={styles.panelContent}>
      <Text style={styles.panelTitle}>🚀 같이 해봐요!</Text>
      <Text style={styles.questionText}>같이 해볼 습관을 골라봐요!</Text>
      <View style={styles.routineGrid}>
        {habitTemplates.map((habit, index) => (
          <TouchableOpacity
            key={habit.id}
            onPress={() => onSelect({ id: habit.id, label: habit.name })}
            style={[styles.routineCard, { backgroundColor: routineColors[index] }, selectedHabitLabel === habit.name && { borderColor: character.accent, borderWidth: 4 }]}
          >
            <Text style={styles.routineEmoji}>{habit.emoji}</Text>
            <Text style={styles.routineTitle}>{habit.name}</Text>
            <Text style={styles.routineTime}>약 {Math.round(habit.durationSeconds / 60)}분</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function RoutineTravelScene({
  character,
  habit,
  lyrics,
  name,
  onExit,
  onStart
}: {
  character: Character;
  habit: { emoji: string; name: string };
  lyrics: string;
  name: string;
  onExit: () => void;
  onStart: () => void;
}) {
  return (
    <View style={styles.travelScene}>
      <View style={styles.sceneTop}>
        <View style={styles.sceneTitleRow}>
          <Text style={styles.sceneSongIcon}>🎵</Text>
          <Text style={styles.sceneLabel}>{habit.name} 시간이에요!</Text>
        </View>
        <ProgressDots active={3} count={5} color={character.accent} />
        <TouchableOpacity onPress={onExit} style={styles.exitButton}><Text style={styles.exitText}>× 나가기</Text></TouchableOpacity>
      </View>
      <View style={styles.houseScene}>
        <View style={styles.livingRoom}>
          <View style={styles.curtainRod} />
          <View style={styles.windowFrame}>
            <Text style={styles.windowSky}>☁️ ☀️</Text>
          </View>
          <View style={styles.pictureFrame}><Text style={styles.pictureText}>⛰️ ☀️</Text></View>
          <View style={styles.sofa} />
          <View style={styles.sideTable} />
          <View style={styles.smallToy} />
          <View style={styles.floorLines} />
          <View style={styles.footprintsLeft}>
            {Array.from({ length: 6 }).map((_, index) => <Text key={index} style={styles.footprint}>◖</Text>)}
          </View>
        </View>
        <View style={styles.doorFrame} />
        <View style={styles.bathRoom}>
          <View style={styles.tileWall} />
          <View style={styles.showerArea} />
          <View style={styles.mirror} />
          <View style={styles.sink} />
          <View style={styles.sceneSpeech}>
            <Text style={styles.sceneSpeechText}>"{name}야, 같이 {habit.name}할 시간이야! 🎵"</Text>
          </View>
          <Text style={styles.musicNotes}>♫ ♪</Text>
          <View style={styles.characterAtBathroom}>
            <Mascot character={character} size={145} />
            <Text style={styles.handEmoji}>👋</Text>
          </View>
          <View style={styles.habitCueCard}>
            <Text style={styles.routineEmoji}>{habit.emoji}</Text>
            <Text style={styles.choiceLabel}>여기서 같이 해요!</Text>
          </View>
          <View style={styles.footprintsRight}>
            {Array.from({ length: 5 }).map((_, index) => <Text key={index} style={styles.footprint}>◖</Text>)}
          </View>
        </View>
      </View>
      <ActionButton label="같이 가요! 🚶" color={character.accent} onPress={onStart} />
      <Text style={styles.sceneHint}>{lyrics}</Text>
    </View>
  );
}

function RoutinePlayScene({
  character,
  habit,
  lyrics,
  paused,
  secondsLeft,
  onExit,
  onPause,
  onResume
}: {
  character: Character;
  habit: { emoji: string; name: string; durationSeconds: number };
  lyrics: string;
  paused: boolean;
  secondsLeft: number;
  onExit: () => void;
  onPause: () => void;
  onResume: () => void;
}) {
  return (
    <View style={styles.playScene}>
      <View style={styles.playTopBar}>
        <ProgressDots active={0} count={3} color="#9A958B" />
        <TouchableOpacity onPress={onExit} style={styles.exitButton}><Text style={styles.exitText}>× 나가기</Text></TouchableOpacity>
      </View>
      <View style={styles.playBody}>
        <Text style={styles.playEmoji}>{habit.emoji}</Text>
        <Text style={styles.playTitle}>{habit.name} 시간!</Text>
        <Text style={styles.muted}>약 {Math.round(habit.durationSeconds / 60)}분 동안 같이 해봐요!</Text>
      <View style={styles.songCard}>
        <Text style={styles.songStatus}>● 시작 동요 재생 중 🎵🎶</Text>
          <Text style={styles.songLine}>"{lyrics}"</Text>
          <Text style={styles.songHint}>↓ 시작 버튼을 누르면 이행 동요로 바뀌어요 · 남은 시간 {secondsLeft}s</Text>
      </View>
        <Mascot character={character} size={150} />
      </View>
      <View style={styles.playBottomButton}>
        <ActionButton label={paused ? '▶ 지금 시작해볼까요!' : '잠깐 쉬어요'} color={paused ? character.accent : '#8B8B8B'} onPress={paused ? onResume : onPause} />
      </View>
    </View>
  );
}

function RewardPanel({ character, lyrics, onReview }: { character: Character; lyrics: string; onReview: () => void }) {
  return (
    <View style={styles.panelContent}>
      <Text style={styles.completeIcon}>🎉</Text>
      <Text style={styles.doneTitle}>{lyrics}</Text>
      <View style={styles.lyricPreview}>
        <Text style={styles.lyricPreviewText}>도장 1개와 별 2개를 받았어요.</Text>
        <Text style={[styles.lyricPreviewText, { color: character.accent }]}>오늘의 동요도 완료!</Text>
      </View>
      <ActionButton label="관찰 기록 남기기" color={character.accent} onPress={onReview} />
    </View>
  );
}

function ProgressDots({ active, count, color }: { active: number; count: number; color: string }) {
  return (
    <View style={styles.dots}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={[styles.dot, index === active && { width: 40, backgroundColor: color }, index < active && { backgroundColor: color }]} />
      ))}
    </View>
  );
}

function SelectCard({ emoji, label, selected, onPress, accent }: { emoji: string; label: string; selected: boolean; onPress: () => void; accent: string }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.selectCard, selected && { borderColor: accent, backgroundColor: '#FFF4E2' }]}>
      <Text style={styles.choiceEmoji}>{emoji}</Text>
      <Text style={styles.choiceLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function ChoiceChip({ label, selected, onPress, color }: { label: string; selected: boolean; onPress: () => void; color: string }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.choiceChip, selected && { backgroundColor: color }]}>
      <Text style={[styles.chipText, selected && { color: '#fff' }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function BackNextRow({ onBack, onNext, color, nextLabel = '다음 →' }: { onBack: () => void; onNext: () => void; color: string; nextLabel?: string }) {
  return (
    <View style={styles.buttonRow}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}><Text style={styles.backText}>← 뒤로</Text></TouchableOpacity>
      <ActionButton label={nextLabel} color={color} onPress={onNext} />
    </View>
  );
}

function Mascot({ character, size, label }: { character: Character; size: number; label?: string }) {
  const face = character.id === 'tori' ? '🐻' : character.id === 'dali' ? '🐰' : character.id === 'soopi' ? '🦊' : '🐤';
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={[styles.mascotShadow, { width: size * 0.65 }]} />
      <Text style={{ fontSize: size * 0.72, lineHeight: size * 0.78 }}>{face}</Text>
      {!!label && <Text style={styles.mascotLabel}>{label}</Text>}
    </View>
  );
}

function ActionButton({ label, color, onPress }: { label: string; color: string; onPress: () => void | Promise<void> }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.actionButton, { backgroundColor: color }]}>
      <Text style={styles.actionText}>{label}</Text>
    </TouchableOpacity>
  );
}

function selectedHabitLabel(profile: ChildProfile) {
  return profile.hardHabit || '습관';
}

function profileDreamLabel(profile: ChildProfile) {
  return profile.dreamIdentity === '기타'
    ? profile.dreamIdentityCustom || '멋진 모습'
    : profile.dreamIdentity || '멋진 모습';
}

const routineColors = ['#DDF2FF', '#DDF8E7', '#F0EAFB', '#FFF0D9'];

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#D7F2E7'
  },
  appShell: {
    flex: 1,
    margin: 18,
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: '#fff',
    flexDirection: 'row'
  },
  mainStage: {
    flex: 1.45,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden'
  },
  sidePanel: {
    flex: 0.95,
    backgroundColor: '#fff',
    borderLeftWidth: 1,
    borderLeftColor: '#E5E5E5'
  },
  stageHeader: {
    position: 'absolute',
    top: 24,
    left: 28,
    right: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  logo: {
    fontSize: 24,
    fontWeight: '900',
    color: '#222'
  },
  headerPills: {
    flexDirection: 'row',
    gap: 12
  },
  smallPill: {
    backgroundColor: '#fff',
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E1E1E1'
  },
  pillText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#222'
  },
  circleOne: {
    position: 'absolute',
    top: -120,
    left: -90,
    width: 330,
    height: 330,
    borderRadius: 165,
    backgroundColor: '#FFE7C4'
  },
  circleTwo: {
    position: 'absolute',
    bottom: -90,
    left: 25,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: '#FFE7C4'
  },
  speechBubble: {
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingHorizontal: 28,
    paddingVertical: 16,
    marginBottom: 120,
    borderWidth: 1,
    borderColor: '#E1E1E1'
  },
  speechText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#222',
    textAlign: 'center'
  },
  speechTail: {
    position: 'absolute',
    bottom: -20,
    alignSelf: 'center',
    width: 0,
    height: 0,
    borderLeftWidth: 20,
    borderRightWidth: 20,
    borderTopWidth: 22,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#fff'
  },
  bottomNav: {
    position: 'absolute',
    left: 0,
    right: '40%',
    bottom: 0,
    height: 165,
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 18,
    padding: 18
  },
  bottomNavClosed: {
    right: 0
  },
  navButton: {
    width: 150,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0
  },
  navIcon: {
    fontSize: 34,
    fontWeight: '900'
  },
  navLabel: {
    fontSize: 19,
    lineHeight: 25,
    color: '#0D6EB8',
    fontWeight: '900',
    textAlign: 'center'
  },
  panelContent: {
    padding: 28,
    gap: 18
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  panelTitle: {
    fontSize: 25,
    fontWeight: '900',
    color: '#222'
  },
  closeText: {
    fontSize: 38,
    color: '#858585',
    fontWeight: '500'
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#D9D9D9'
  },
  questionText: {
    fontSize: 25,
    fontWeight: '900',
    color: '#666',
    lineHeight: 34
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 18,
    fontSize: 22,
    borderWidth: 3,
    borderColor: '#E1E1E1',
    fontWeight: '800'
  },
  nameInput: {
    height: 86,
    textAlign: 'center',
    borderColor: '#36B31C'
  },
  choiceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14
  },
  selectCard: {
    width: '47%',
    aspectRatio: 1.2,
    borderRadius: 20,
    borderWidth: 4,
    borderColor: '#E5E5E5',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff'
  },
  choiceEmoji: {
    fontSize: 34,
    marginBottom: 12
  },
  choiceLabel: {
    fontSize: 22,
    fontWeight: '900',
    color: '#222',
    textAlign: 'center'
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14
  },
  colorCard: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center'
  },
  selectedColorCard: {
    borderWidth: 6,
    borderColor: '#222'
  },
  colorLabel: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowRadius: 4
  },
  characterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14
  },
  characterChoice: {
    width: '47%',
    borderRadius: 20,
    borderWidth: 4,
    borderColor: '#E5E5E5',
    paddingVertical: 18,
    alignItems: 'center'
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12
  },
  backButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 3,
    borderColor: '#E1E1E1',
    justifyContent: 'center',
    alignItems: 'center'
  },
  backText: {
    fontSize: 20,
    color: '#777',
    fontWeight: '900'
  },
  actionButton: {
    flex: 1,
    borderRadius: 20,
    minHeight: 66,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center'
  },
  actionText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '900',
    fontSize: 22
  },
  completeBox: {
    alignItems: 'center',
    gap: 18,
    paddingTop: 36
  },
  completeIcon: {
    fontSize: 76,
    textAlign: 'center'
  },
  doneTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#222',
    textAlign: 'center'
  },
  muted: {
    fontSize: 18,
    lineHeight: 26,
    color: '#828282',
    fontWeight: '800',
    textAlign: 'center'
  },
  lyricPreview: {
    backgroundColor: '#FFF4E2',
    borderRadius: 22,
    padding: 20,
    gap: 8,
    width: '100%'
  },
  lyricPreviewText: {
    fontSize: 18,
    lineHeight: 28,
    color: '#9B5A11',
    fontWeight: '900',
    textAlign: 'center'
  },
  routineGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16
  },
  routineCard: {
    width: '47%',
    aspectRatio: 1,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0
  },
  routineEmoji: {
    fontSize: 46,
    textAlign: 'center'
  },
  routineTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#222',
    textAlign: 'center'
  },
  routineTime: {
    fontSize: 18,
    color: '#858585',
    fontWeight: '900'
  },
  travelScene: {
    flex: 1,
    backgroundColor: '#D7F2E7',
    padding: 24,
    gap: 12
  },
  sceneTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  sceneTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 250
  },
  sceneSongIcon: {
    fontSize: 22
  },
  exitButton: {
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 10
  },
  exitText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#222'
  },
  houseScene: {
    flex: 1,
    borderRadius: 28,
    overflow: 'hidden',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#E7DFD0'
  },
  livingRoom: {
    flex: 1,
    backgroundColor: '#FFF0D9',
    padding: 20
  },
  bathRoom: {
    flex: 1,
    backgroundColor: '#EAF8FC',
    padding: 18,
    alignItems: 'center',
    justifyContent: 'flex-end'
  },
  doorFrame: {
    width: 28,
    backgroundColor: '#B9874D'
  },
  sceneLabel: {
    fontSize: 22,
    fontWeight: '900',
    color: '#87613C'
  },
  curtainRod: {
    position: 'absolute',
    top: 28,
    left: 44,
    width: 230,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#A6783F'
  },
  windowFrame: {
    width: 230,
    height: 215,
    borderRadius: 14,
    borderWidth: 8,
    borderColor: '#B99354',
    backgroundColor: '#BDE8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 44,
    marginLeft: 34
  },
  windowSky: {
    fontSize: 58
  },
  pictureFrame: {
    position: 'absolute',
    top: 78,
    right: 68,
    width: 190,
    height: 110,
    borderRadius: 14,
    borderWidth: 8,
    borderColor: '#B99354',
    backgroundColor: '#9FCBE4',
    alignItems: 'center',
    justifyContent: 'center'
  },
  pictureText: {
    fontSize: 44
  },
  sofa: {
    position: 'absolute',
    left: 30,
    width: 360,
    bottom: 84,
    height: 150,
    borderRadius: 20,
    backgroundColor: '#D17656'
  },
  sideTable: {
    position: 'absolute',
    right: 130,
    bottom: 94,
    width: 78,
    height: 105,
    borderRadius: 10,
    backgroundColor: '#B88A4B'
  },
  smallToy: {
    position: 'absolute',
    right: 260,
    bottom: 82,
    width: 48,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#4D7DF0'
  },
  floorLines: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 72,
    backgroundColor: '#C9915A'
  },
  footprintsLeft: {
    position: 'absolute',
    bottom: 15,
    right: 18,
    flexDirection: 'row',
    gap: 32
  },
  footprintsRight: {
    position: 'absolute',
    bottom: 55,
    left: 28,
    flexDirection: 'row',
    gap: 34
  },
  footprint: {
    fontSize: 24,
    color: '#9D714D',
    opacity: 0.65,
    fontWeight: '900'
  },
  tileWall: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#DDF2F7'
  },
  showerArea: {
    position: 'absolute',
    top: 70,
    left: 34,
    right: 80,
    height: 240,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.45)',
    borderWidth: 8,
    borderColor: '#8DB9C8'
  },
  mirror: {
    width: 320,
    height: 175,
    borderRadius: 18,
    borderWidth: 8,
    borderColor: '#8DB9C8',
    backgroundColor: '#D9F5FB',
    marginBottom: 28
  },
  sink: {
    width: 300,
    height: 86,
    borderRadius: 18,
    backgroundColor: '#F7FCFE',
    borderWidth: 3,
    borderColor: '#BBD6E0'
  },
  sceneSpeech: {
    position: 'absolute',
    bottom: 285,
    left: 22,
    right: 120,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E1E1E1'
  },
  sceneSpeechText: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center'
  },
  musicNotes: {
    position: 'absolute',
    right: 205,
    bottom: 250,
    fontSize: 42,
    color: '#5CA9F2',
    fontWeight: '900'
  },
  characterAtBathroom: {
    position: 'absolute',
    bottom: 78,
    left: 110
  },
  handEmoji: {
    position: 'absolute',
    right: -24,
    top: 18,
    fontSize: 34
  },
  habitCueCard: {
    position: 'absolute',
    right: 92,
    bottom: 112,
    width: 170,
    minHeight: 150,
    backgroundColor: '#fff',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10
  },
  sceneLyrics: {
    fontSize: 18,
    color: '#76624B',
    fontWeight: '900',
    textAlign: 'center'
  },
  sceneHint: {
    fontSize: 17,
    color: '#76624B',
    fontWeight: '800',
    textAlign: 'center'
  },
  playScene: {
    flex: 1,
    backgroundColor: '#FFF4E2',
    padding: 28
  },
  playTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  playBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18
  },
  playEmoji: {
    fontSize: 70,
    textAlign: 'center'
  },
  playTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: '#222'
  },
  songCard: {
    width: '58%',
    minWidth: 560,
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 26,
    alignItems: 'center',
    gap: 10
  },
  songStatus: {
    color: '#858585',
    fontSize: 18,
    fontWeight: '900'
  },
  songLine: {
    color: '#222',
    fontSize: 22,
    lineHeight: 32,
    fontWeight: '900',
    textAlign: 'center'
  },
  songHint: {
    color: '#858585',
    fontSize: 16,
    fontWeight: '800'
  },
  playBottomButton: {
    minHeight: 86,
    flexDirection: 'row'
  },
  stampBoard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  stampCell: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 18,
    backgroundColor: '#F6F6F6',
    alignItems: 'center',
    justifyContent: 'center'
  },
  stampCellDone: {
    backgroundColor: '#FFF0D9',
    borderWidth: 3,
    borderColor: '#F5962A'
  },
  stampText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#8B8B8B'
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 10
  },
  choiceChip: {
    flex: 1,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#F4F4F4',
    alignItems: 'center'
  },
  chipText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#444'
  },
  memoInput: {
    minHeight: 90,
    textAlignVertical: 'top'
  },
  logPanel: {
    margin: 28,
    padding: 18,
    borderRadius: 20,
    backgroundColor: '#F8F8F8',
    gap: 6
  },
  logTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#222'
  },
  mascotShadow: {
    height: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.10)',
    position: 'absolute',
    bottom: 2
  },
  mascotLabel: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: '900',
    color: '#666'
  }
});
