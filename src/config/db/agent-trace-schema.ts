import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgSchema,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const agentTrace = pgSchema('agent_trace');

export const agentTraceSessions = agentTrace.table(
  'sessions',
  {
    id: text('id').primaryKey(),
    sourceAgent: text('source_agent').notNull(),
    captureMode: text('capture_mode').notNull(),
    title: text('title'),
    userGoal: text('user_goal'),
    cwd: text('cwd'),
    source: text('source'),
    threadSource: text('thread_source'),
    originator: text('originator'),
    cliVersion: text('cli_version'),
    modelProvider: text('model_provider'),
    model: text('model'),
    reasoningEffort: text('reasoning_effort'),
    personality: text('personality'),
    gitSha: text('git_sha'),
    gitBranch: text('git_branch'),
    gitOriginUrl: text('git_origin_url'),
    firstUserMessage: text('first_user_message'),
    preview: text('preview'),
    status: text('status').notNull().default('active'),
    visibility: text('visibility').notNull().default('private'),
    rawStorageBucket: text('raw_storage_bucket'),
    rawStoragePath: text('raw_storage_path'),
    rawSha256: text('raw_sha256'),
    rawByteSize: bigint('raw_byte_size', { mode: 'number' }),
    tokensUsed: integer('tokens_used').notNull().default(0),
    eventCount: integer('event_count').notNull().default(0),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    rawMeta: jsonb('raw_meta').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_agent_trace_sessions_updated').on(table.updatedAt, table.id),
    index('idx_agent_trace_sessions_cwd').on(table.cwd),
    index('idx_agent_trace_sessions_model').on(table.model),
    index('idx_agent_trace_sessions_git_branch').on(table.gitBranch),
  ]
);

export const agentTraceTurns = agentTrace.table(
  'turns',
  {
    id: text('id').primaryKey(),
    sessionId: text('session_id')
      .notNull()
      .references(() => agentTraceSessions.id, { onDelete: 'cascade' }),
    turnId: text('turn_id').notNull(),
    seq: integer('seq').notNull(),
    cwd: text('cwd'),
    model: text('model'),
    effort: text('effort'),
    approvalPolicy: text('approval_policy'),
    sandboxPolicy: jsonb('sandbox_policy'),
    permissionProfile: jsonb('permission_profile'),
    summary: text('summary'),
    userInstructions: text('user_instructions'),
    developerInstructions: text('developer_instructions'),
    truncationPolicy: jsonb('truncation_policy'),
    status: text('status').notNull().default('active'),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    rawContext: jsonb('raw_context').notNull().default({}),
  },
  (table) => [
    uniqueIndex('idx_agent_trace_turns_session_turn').on(
      table.sessionId,
      table.turnId
    ),
    index('idx_agent_trace_turns_session_seq').on(table.sessionId, table.seq),
    index('idx_agent_trace_turns_status').on(table.status),
  ]
);

export const agentTraceEvents = agentTrace.table(
  'events',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    sessionId: text('session_id')
      .notNull()
      .references(() => agentTraceSessions.id, { onDelete: 'cascade' }),
    turnId: text('turn_id'),
    seq: integer('seq').notNull(),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
    eventType: text('event_type').notNull(),
    payloadType: text('payload_type'),
    role: text('role'),
    phase: text('phase'),
    callId: text('call_id'),
    toolNamespace: text('tool_namespace'),
    toolName: text('tool_name'),
    status: text('status'),
    contentText: text('content_text'),
    arguments: jsonb('arguments'),
    outputText: text('output_text'),
    tokenUsage: jsonb('token_usage'),
    durationMs: integer('duration_ms'),
    error: jsonb('error'),
    rawPayload: jsonb('raw_payload').notNull(),
    rawLine: jsonb('raw_line').notNull(),
    redactionStatus: text('redaction_status').notNull().default('raw'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_agent_trace_events_session_seq').on(
      table.sessionId,
      table.seq
    ),
    index('idx_agent_trace_events_turn_seq').on(
      table.sessionId,
      table.turnId,
      table.seq
    ),
    index('idx_agent_trace_events_payload_type').on(table.payloadType),
    index('idx_agent_trace_events_tool').on(
      table.toolNamespace,
      table.toolName
    ),
    index('idx_agent_trace_events_call_id').on(table.callId),
    index('idx_agent_trace_events_created').on(table.timestamp),
  ]
);

export const agentTraceMessages = agentTrace.table('messages', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  sessionId: text('session_id')
    .notNull()
    .references(() => agentTraceSessions.id, { onDelete: 'cascade' }),
  turnId: text('turn_id'),
  eventId: uuid('event_id').references(() => agentTraceEvents.id, {
    onDelete: 'cascade',
  }),
  seq: integer('seq').notNull(),
  role: text('role').notNull(),
  phase: text('phase'),
  content: text('content').notNull(),
  contentFormat: text('content_format').notNull().default('text'),
  hasImages: boolean('has_images').notNull().default(false),
  metadata: jsonb('metadata').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const agentTraceToolCalls = agentTrace.table(
  'tool_calls',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    sessionId: text('session_id')
      .notNull()
      .references(() => agentTraceSessions.id, { onDelete: 'cascade' }),
    turnId: text('turn_id'),
    callId: text('call_id').notNull(),
    eventId: uuid('event_id').references(() => agentTraceEvents.id, {
      onDelete: 'set null',
    }),
    toolType: text('tool_type').notNull(),
    namespace: text('namespace'),
    name: text('name').notNull(),
    arguments: jsonb('arguments').notNull().default({}),
    output: text('output'),
    exitCode: integer('exit_code'),
    stdout: text('stdout'),
    stderr: text('stderr'),
    durationMs: integer('duration_ms'),
    status: text('status'),
    error: jsonb('error'),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_agent_trace_tool_calls_session_call').on(
      table.sessionId,
      table.callId
    ),
    index('idx_agent_trace_tool_calls_session').on(
      table.sessionId,
      table.completedAt
    ),
    index('idx_agent_trace_tool_calls_name').on(table.name),
    index('idx_agent_trace_tool_calls_status').on(table.status),
  ]
);
