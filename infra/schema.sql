create table parents (
  id uuid primary key,
  email text unique not null,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table child_profiles (
  id uuid primary key,
  parent_id uuid references parents(id),
  name text not null,
  hard_habit text,
  favorite_food text,
  favorite_color text,
  friend_name text,
  character_id text not null,
  created_at timestamptz not null default now()
);

create table habit_templates (
  id text primary key,
  name text not null,
  emoji text not null,
  duration_seconds integer not null
);

create table custom_habits (
  id uuid primary key,
  parent_id uuid references parents(id),
  name text not null,
  emoji text not null,
  duration_seconds integer not null,
  created_at timestamptz not null default now()
);

create table song_generation_requests (
  id text primary key,
  child_id text not null,
  habit_id text not null,
  prompt text not null,
  inputs jsonb,
  provider text,
  external_task_id text,
  error_code text,
  error_message text,
  status text not null,
  created_at timestamptz not null default now()
);

create table generated_songs (
  id text primary key,
  request_id text references song_generation_requests(id),
  title text not null,
  lyrics text not null,
  audio_url text,
  stream_audio_url text,
  source_audio_url text,
  image_url text,
  external_song_id text,
  provider text,
  target_duration_seconds integer,
  duration_seconds integer,
  model_name text,
  melody_preset_id text,
  rhythm_preset_id text,
  instrument_preset_id text,
  generation_mode text,
  reference_audio_url text,
  reference_audio_file_name text,
  reference_audio_duration_seconds integer,
  suno_continue_at_seconds integer,
  status text not null,
  created_at timestamptz not null default now()
);

create index song_generation_requests_external_task_id_idx
  on song_generation_requests(external_task_id);

create table habit_sessions (
  id uuid primary key,
  child_id uuid references child_profiles(id),
  habit_id text not null,
  completed_at timestamptz not null,
  stars integer not null
);
