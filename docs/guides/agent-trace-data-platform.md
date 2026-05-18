# Agent Trace Data Platform

This project reuses the cross-repo `agent_trace` Supabase/Postgres schema for storing complete agent sessions as replayable, searchable, training-ready traces.

## Source Of Truth

- Local agent JSONL remains the raw source of truth.
- Supabase Storage stores compressed raw JSONL and large artifacts.
- Supabase Postgres stores searchable indexes and curated training examples.

The Barbot migration source is:

- `supabase/migrations/20260518000000_agent_trace.sql`

The same SQL is mirrored in:

- `pi-agent/packages/trace-collector/sql/supabase-agent-trace.sql`
- `craft-agents-oss/packages/agent-trace-schema/sql/supabase-agent-trace.sql`

## Tables

- `agent_trace.sessions`
- `agent_trace.turns`
- `agent_trace.events`
- `agent_trace.messages`
- `agent_trace.tool_calls`
- `agent_trace.artifacts`
- `agent_trace.training_examples`
- `agent_trace.import_runs`

## Security Defaults

- All `agent_trace` tables enable RLS.
- Raw trace writes must be performed by backend/service-role code only.
- Browser code must not receive Supabase service-role keys or raw session traces.
- Training exports should read `agent_trace.training_examples`, not raw `agent_trace.events`, unless a redaction pass has already run.

## Storage Rule

- Keep short text and query fields in Postgres.
- Put raw JSONL and outputs larger than 1 MB in Supabase Storage.
- Link Storage objects through `raw_storage_path`, `storage_path`, `sha256`, and `byte_size`.
