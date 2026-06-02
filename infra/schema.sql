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
  id uuid primary key,
  child_id uuid references child_profiles(id),
  habit_id text not null,
  prompt text not null,
  status text not null,
  created_at timestamptz not null default now()
);

create table generated_songs (
  id uuid primary key,
  request_id uuid references song_generation_requests(id),
  title text not null,
  lyrics text not null,
  audio_url text,
  status text not null,
  created_at timestamptz not null default now()
);

create table habit_sessions (
  id uuid primary key,
  child_id uuid references child_profiles(id),
  habit_id text not null,
  completed_at timestamptz not null,
  stars integer not null
);
