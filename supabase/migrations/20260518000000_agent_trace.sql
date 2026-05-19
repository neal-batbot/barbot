create extension if not exists pgcrypto;

create schema if not exists agent_trace;

create table if not exists agent_trace.sessions (
  id text primary key,
  source_agent text not null,
  capture_mode text not null check (capture_mode in ('imported', 'wrapped', 'observed')),
  title text,
  user_goal text,
  cwd text,
  source text,
  thread_source text,
  originator text,
  cli_version text,
  model_provider text,
  model text,
  reasoning_effort text,
  personality text,
  git_sha text,
  git_branch text,
  git_origin_url text,
  first_user_message text,
  preview text,
  status text not null default 'active',
  visibility text not null default 'private',
  raw_storage_bucket text,
  raw_storage_path text,
  raw_sha256 text,
  raw_byte_size bigint,
  tokens_used integer not null default 0,
  event_count integer not null default 0,
  started_at timestamptz not null,
  updated_at timestamptz not null,
  completed_at timestamptz,
  raw_meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_agent_trace_sessions_updated
  on agent_trace.sessions (updated_at desc, id desc);
create index if not exists idx_agent_trace_sessions_cwd
  on agent_trace.sessions (cwd);
create index if not exists idx_agent_trace_sessions_model
  on agent_trace.sessions (model);
create index if not exists idx_agent_trace_sessions_git_branch
  on agent_trace.sessions (git_branch);

create table if not exists agent_trace.turns (
  id text primary key,
  session_id text not null references agent_trace.sessions(id) on delete cascade,
  turn_id text not null,
  seq integer not null,
  cwd text,
  model text,
  effort text,
  approval_policy text,
  sandbox_policy jsonb,
  permission_profile jsonb,
  summary text,
  user_instructions text,
  developer_instructions text,
  truncation_policy jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  duration_ms integer,
  status text,
  raw_context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (session_id, turn_id),
  unique (session_id, seq)
);

create index if not exists idx_agent_trace_turns_session_seq
  on agent_trace.turns (session_id, seq);
create index if not exists idx_agent_trace_turns_status
  on agent_trace.turns (status);

create table if not exists agent_trace.events (
  id uuid primary key default gen_random_uuid(),
  session_id text not null references agent_trace.sessions(id) on delete cascade,
  turn_id text,
  seq bigint not null,
  timestamp timestamptz not null,
  event_type text not null,
  payload_type text,
  role text,
  phase text,
  call_id text,
  tool_namespace text,
  tool_name text,
  status text,
  content_text text,
  arguments jsonb,
  output_text text,
  token_usage jsonb,
  duration_ms integer,
  error jsonb,
  raw_payload jsonb not null,
  raw_line jsonb not null,
  redaction_status text not null default 'raw',
  created_at timestamptz not null default now(),
  unique (session_id, seq)
);

create index if not exists idx_agent_trace_events_session_seq
  on agent_trace.events (session_id, seq);
create index if not exists idx_agent_trace_events_turn_seq
  on agent_trace.events (session_id, turn_id, seq);
create index if not exists idx_agent_trace_events_payload_type
  on agent_trace.events (payload_type);
create index if not exists idx_agent_trace_events_tool
  on agent_trace.events (tool_namespace, tool_name);
create index if not exists idx_agent_trace_events_call_id
  on agent_trace.events (call_id);
create index if not exists idx_agent_trace_events_created
  on agent_trace.events (timestamp desc);

create table if not exists agent_trace.messages (
  id uuid primary key default gen_random_uuid(),
  session_id text not null references agent_trace.sessions(id) on delete cascade,
  turn_id text,
  event_id uuid references agent_trace.events(id) on delete cascade,
  seq bigint not null,
  role text not null,
  phase text,
  content text not null,
  content_format text not null default 'text',
  has_images boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_agent_trace_messages_session_seq
  on agent_trace.messages (session_id, seq);
create index if not exists idx_agent_trace_messages_turn_seq
  on agent_trace.messages (session_id, turn_id, seq);
create index if not exists idx_agent_trace_messages_role
  on agent_trace.messages (role);
create index if not exists idx_agent_trace_messages_content_fts
  on agent_trace.messages using gin (to_tsvector('simple', content));

create table if not exists agent_trace.tool_calls (
  id uuid primary key default gen_random_uuid(),
  session_id text not null references agent_trace.sessions(id) on delete cascade,
  turn_id text,
  call_id text not null,
  event_id uuid references agent_trace.events(id) on delete set null,
  tool_type text not null,
  namespace text,
  name text not null,
  arguments jsonb not null default '{}'::jsonb,
  output text,
  exit_code integer,
  stdout text,
  stderr text,
  duration_ms integer,
  status text,
  error jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (session_id, call_id)
);

create index if not exists idx_agent_trace_tool_calls_session
  on agent_trace.tool_calls (session_id, completed_at);
create index if not exists idx_agent_trace_tool_calls_name
  on agent_trace.tool_calls (name);
create index if not exists idx_agent_trace_tool_calls_status
  on agent_trace.tool_calls (status);

create table if not exists agent_trace.artifacts (
  id uuid primary key default gen_random_uuid(),
  session_id text not null references agent_trace.sessions(id) on delete cascade,
  turn_id text,
  event_id uuid references agent_trace.events(id) on delete set null,
  artifact_type text not null,
  storage_bucket text,
  storage_path text,
  mime_type text,
  byte_size bigint,
  sha256 text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_agent_trace_artifacts_session
  on agent_trace.artifacts (session_id, created_at);
create index if not exists idx_agent_trace_artifacts_sha256
  on agent_trace.artifacts (sha256);

create table if not exists agent_trace.training_examples (
  id uuid primary key default gen_random_uuid(),
  session_id text not null references agent_trace.sessions(id) on delete cascade,
  turn_id text,
  example_type text not null,
  input_messages jsonb not null,
  expected_output jsonb,
  tool_trace jsonb,
  labels jsonb not null default '{}'::jsonb,
  quality_score numeric,
  split text,
  source_event_ids uuid[],
  redaction_status text not null default 'redacted',
  created_at timestamptz not null default now()
);

create index if not exists idx_agent_trace_training_examples_type
  on agent_trace.training_examples (example_type);
create index if not exists idx_agent_trace_training_examples_split
  on agent_trace.training_examples (split);
create index if not exists idx_agent_trace_training_examples_session
  on agent_trace.training_examples (session_id);

create table if not exists agent_trace.import_runs (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  source_root text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'running',
  sessions_seen integer not null default 0,
  sessions_imported integer not null default 0,
  events_imported integer not null default 0,
  error jsonb,
  metadata jsonb not null default '{}'::jsonb
);

alter table agent_trace.sessions enable row level security;
alter table agent_trace.turns enable row level security;
alter table agent_trace.events enable row level security;
alter table agent_trace.messages enable row level security;
alter table agent_trace.tool_calls enable row level security;
alter table agent_trace.artifacts enable row level security;
alter table agent_trace.training_examples enable row level security;
alter table agent_trace.import_runs enable row level security;
