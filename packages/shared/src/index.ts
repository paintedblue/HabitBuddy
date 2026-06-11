export type CharacterId = 'tori' | 'dali' | 'soopi' | 'bboyi';
export type HabitId = 'brush' | 'wash' | 'tidy' | 'sleep' | 'veggie' | 'read';
export type MelodyPresetId = 'energetic' | 'story' | 'follow' | 'calm';
export type RhythmPresetId = 'clapClap' | 'stepStep' | 'bubblePop' | 'brushBrush';
export type InstrumentPresetId = 'piano' | 'xylophone' | 'ukulele' | 'ocarina';
export type SongStatus = 'draft' | 'queued' | 'generating' | 'pending_approval' | 'approved' | 'rejected' | 'failed';
export type RoutinePhase = 'cue' | 'routine' | 'reward';
export type RoutineEventType =
  | 'session_started'
  | 'cue_started'
  | 'cue_completed'
  | 'routine_started'
  | 'routine_paused'
  | 'routine_resumed'
  | 'routine_completed'
  | 'reward_viewed';

export interface Character {
  id: CharacterId;
  name: string;
  species: string;
  accent: string;
  background: string;
}

export interface ChildProfile {
  id: string;
  name: string;
  hardHabit: string;
  habitBarrier: string;
  dreamIdentity: string;
  dreamIdentityCustom: string;
  favoriteFood: string;
  favoriteColor: string;
  friendName: string;
  characterId: CharacterId;
  melodyPresetId?: MelodyPresetId;
  rhythmPresetId?: RhythmPresetId;
  instrumentPresetId?: InstrumentPresetId;
}

export interface HabitTemplate {
  id: HabitId;
  emoji: string;
  name: string;
  durationSeconds: number;
  starterLyric: string;
  progressLyric: string;
}

export interface CustomHabit {
  id: string;
  name: string;
  emoji: string;
  durationSeconds: number;
  createdByParent: boolean;
}

export interface HabitSession {
  id: string;
  childId: string;
  habitId: string;
  completedAt: string;
  stars: number;
}

export interface RoutineEvent {
  id: string;
  type: RoutineEventType;
  at: string;
}

export interface RoutineSession {
  id: string;
  childId: string;
  habitId: string;
  songId?: string;
  startedAt: string;
  completedAt?: string;
  phase: RoutinePhase;
  stars: number;
  events: RoutineEvent[];
}

export interface ObserverNote {
  id: string;
  sessionId: string;
  parentPromptCount: number;
  engagement: 'low' | 'medium' | 'high';
  leftRoutine: boolean;
  note: string;
  createdAt: string;
}

export interface SongGenerationRequest {
  id: string;
  childId: string;
  habitId: string;
  prompt: string;
  inputs?: SongGenerationInputs;
  status: SongStatus;
  createdAt: string;
}

export interface SongGenerationInputs {
  childName?: string;
  animalCharacterKeyword?: string;
  selectedHabits?: string;
  colorKeyword?: string;
  foodKeyword?: string;
  dislikedReason?: string;
  dislikedHabit?: string;
  aspiration?: string;
  melodyPresetId?: MelodyPresetId;
  rhythmPresetId?: RhythmPresetId;
  instrumentPresetId?: InstrumentPresetId;
  generationMode?: 'text' | 'reference_audio';
  referenceAudioUrl?: string;
  referenceAudioFileName?: string;
}

export interface SongLyricsJson {
  title: string;
  verse: string[];
  chorus: string[];
}

export interface GeneratedSong {
  id: string;
  requestId: string;
  title: string;
  lyrics: string;
  structuredLyrics?: SongLyricsJson;
  audioUrl?: string;
  externalSongId?: string;
  provider?: 'eachlabs' | 'sunoapi';
  targetDurationSeconds?: number;
  melodyPresetId?: MelodyPresetId;
  rhythmPresetId?: RhythmPresetId;
  instrumentPresetId?: InstrumentPresetId;
  generationMode?: 'text' | 'reference_audio';
  referenceAudioUrl?: string;
  referenceAudioFileName?: string;
  status: SongStatus;
}

export interface Approval {
  id: string;
  songId: string;
  approved: boolean;
  reviewedAt?: string;
}

export const characters: Character[] = [
  { id: 'tori', name: '토리', species: '곰', accent: '#F5962A', background: '#FFF4E2' },
  { id: 'dali', name: '달이', species: '토끼', accent: '#9279DF', background: '#F2EEFF' },
  { id: 'soopi', name: '숲이', species: '여우', accent: '#84CC3C', background: '#EFF9E2' },
  { id: 'bboyi', name: '뽀이', species: '병아리', accent: '#3ECFB2', background: '#E2FAF6' }
];

export const habitTemplates: HabitTemplate[] = [
  { id: 'brush', emoji: '🪥', name: '양치하기', durationSeconds: 120, starterLyric: '양치하자 시작!', progressLyric: '위아래로 치카치카' },
  { id: 'wash', emoji: '🫧', name: '손 씻기', durationSeconds: 30, starterLyric: '손을 씻자 시작!', progressLyric: '거품거품 뽀글뽀글' },
  { id: 'tidy', emoji: '🧹', name: '방 정리하기', durationSeconds: 120, starterLyric: '방을 정리하자 시작!', progressLyric: '제자리에 착착착' },
  { id: 'sleep', emoji: '😴', name: '일찍자기', durationSeconds: 90, starterLyric: '잘 준비를 시작!', progressLyric: '포근포근 꿈나라로' },
  { id: 'veggie', emoji: '🥦', name: '채소먹기', durationSeconds: 60, starterLyric: '채소 한 입 시작!', progressLyric: '아삭아삭 한 입씩' },
  { id: 'read', emoji: '📚', name: '책 읽기', durationSeconds: 120, starterLyric: '책을 펼쳐 시작!', progressLyric: '한 장 한 장 읽어봐요' }
];

export interface MelodyPreset {
  id: MelodyPresetId;
  icon: string;
  label: string;
  description: string;
  prompt: string;
  instrument: string;
  mood: string;
  rhythm: string;
}

export const melodyPresets: MelodyPreset[] = [
  {
    id: 'energetic',
    icon: '🐰',
    label: '밝은 동요',
    description: '통통! 가볍게 튀는 동요',
    prompt: 'Create the identity of a 10-second cheerful and energetic children\'s nursery rhyme melody. Style: cheerful and energetic children\'s song. Tempo: 115-125 BPM. Mood: bright, playful, happy, and motivating. Key: major key. Features: simple and repetitive melody, strong and steady rhythm, easy for preschool children to sing, short memorable phrases, suitable for clapping, jumping, and movement activities. Instrumentation: ukulele, piano, hand claps, light percussion. The melody should feel fun, active, and encouraging.',
    instrument: 'ukulele, piano, hand claps, and light percussion',
    mood: 'bright, playful, happy, motivating, and energetic',
    rhythm: 'strong steady rhythm for clapping, jumping, and movement'
  },
  {
    id: 'story',
    icon: '🌸',
    label: '부드러운 동요',
    description: '살랑살랑, 둥실둥실 떠다니는 동요',
    prompt: 'Create the identity of a 10-second children\'s story-song melody. Style: storytelling nursery rhyme. Tempo: 85-95 BPM. Mood: warm, imaginative, friendly, and gentle. Key: major key. Features: smooth melodic movement, stepwise melody with few large jumps, easy to remember, suitable for storytelling and character-based songs. Instrumentation: piano, acoustic guitar, soft bells. The melody should feel like a warm picture book adventure.',
    instrument: 'piano, acoustic guitar, and soft bells',
    mood: 'warm, imaginative, friendly, and gentle',
    rhythm: 'smooth storytelling rhythm with stepwise melodic movement'
  },
  {
    id: 'follow',
    icon: '🎵',
    label: '따라 부르는 동요',
    description: '룰루랄라 따라 부르기 쉬운 동요',
    prompt: 'Create the identity of a 10-second interactive children\'s melody. Style: action and movement song. Tempo: 115-120 BPM. Mood: fun, engaging, and playful. Key: major key. Features: strong beat, repetitive rhythm, call-and-response feeling, easy for young children to imitate, suitable for group singing and movement activities. Instrumentation: xylophone, hand percussion, piano. The melody should encourage participation and repeated singing.',
    instrument: 'xylophone, hand percussion, and piano',
    mood: 'fun, engaging, playful, and participatory',
    rhythm: 'strong repetitive rhythm with call-and-response feeling'
  },
  {
    id: 'calm',
    icon: '🤫',
    label: '조용한 동요',
    description: '소곤소곤, 잔잔하게 듣는 동요',
    prompt: 'Create the identity of a 10-second lullaby-style melody for young children. Style: gentle children\'s lullaby. Tempo: 60-70 BPM. Mood: calm, soothing, safe, and comforting. Key: major key. Features: slow rhythm, smooth melodic contour, long sustained notes, very easy and relaxing to listen to. Instrumentation: music box, soft piano, gentle strings. The melody should help children feel relaxed and comfortable.',
    instrument: 'music box, soft piano, and gentle strings',
    mood: 'calm, soothing, safe, and comforting',
    rhythm: 'slow gentle rhythm with long sustained notes'
  }
];

export function melodyPresetById(id: string | undefined): MelodyPreset {
  const normalized = id === 'twinkle' || id === 'bounce' ? 'energetic' : id === 'clap' ? 'follow' : id === 'sway' ? 'calm' : id;
  return melodyPresets.find((preset) => preset.id === normalized) ?? melodyPresets[0];
}

export interface RhythmPreset {
  id: RhythmPresetId;
  label: string;
  description: string;
  prompt: string;
}

export const rhythmPresets: RhythmPreset[] = [
  {
    id: 'clapClap',
    label: '짝짝 박수',
    description: '손뼉 치며 박자를 맞춰요',
    prompt: 'Use a clear clap-clap-rest pattern that repeats under the chorus, like two friendly hand claps followed by a small breath.'
  },
  {
    id: 'stepStep',
    label: '쿵쿵 발걸음',
    description: '걸음처럼 일정하게 가요',
    prompt: 'Use a steady step-step walking groove with a gentle low downbeat, like small marching feet moving forward.'
  },
  {
    id: 'bubblePop',
    label: '톡톡 물방울',
    description: '작고 가벼운 소리가 나요',
    prompt: 'Use light pop-pop bubble accents with playful uneven pauses, airy and small rather than heavy or robotic.'
  },
  {
    id: 'brushBrush',
    label: '슥슥 칫솔질',
    description: '습관 동작처럼 반복돼요',
    prompt: 'Use a soft brush-brush / pause groove, like two small routine motions followed by a breath, repeated gently.'
  }
];

export function rhythmPresetById(id: string | undefined): RhythmPreset {
  return rhythmPresets.find((preset) => preset.id === id) ?? rhythmPresets[0];
}

export interface InstrumentPreset {
  id: InstrumentPresetId;
  label: string;
  description: string;
  prompt: string;
}

export const instrumentPresets: InstrumentPreset[] = [
  {
    id: 'piano',
    label: '딩동 피아노',
    description: '또렷하고 따뜻해요',
    prompt: 'warm simple piano lead'
  },
  {
    id: 'xylophone',
    label: '딸랑 실로폰',
    description: '밝고 반짝거려요',
    prompt: 'bright xylophone-like lead'
  },
  {
    id: 'ukulele',
    label: '통통 우쿨렐레',
    description: '가볍고 신나요',
    prompt: 'playful ukulele-led arrangement'
  },
  {
    id: 'ocarina',
    label: '삐리리 오카리나',
    description: '부드럽고 귀여워요',
    prompt: 'soft ocarina-like lead melody'
  }
];

export function instrumentPresetById(id: string | undefined): InstrumentPreset {
  return instrumentPresets.find((preset) => preset.id === id) ?? instrumentPresets[0];
}

export function renderPersonalizedLyrics(profile: ChildProfile, habit: HabitTemplate) {
  const name = profile.name || '친구';
  const food = profile.favoriteFood || '좋아하는 간식';
  const friend = profile.friendName || '동요 친구';
  const dream = profile.dreamIdentity === '기타' ? profile.dreamIdentityCustom : profile.dreamIdentity;
  const barrier = profile.habitBarrier || '조금 어려워도';
  return {
    cue: `${name}야, ${habit.name} 하러 가볼까?`,
    routine: `${name}야, ${habit.progressLyric}\n${barrier} 괜찮아\n${dream || food}처럼 반짝반짝\n${friend}와 같이 해봐요`,
    reward: `${name}야, 오늘도 해냈어요!`
  };
}
