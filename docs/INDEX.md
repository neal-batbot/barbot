# Knowledge Base Index

> Master index and quality dashboard. Last updated: 2026-05-16.
> Run `pnpm docs:lint` to refresh quality scores.

## Navigation

| Section                                      | Description                                    | Index        |
| -------------------------------------------- | ---------------------------------------------- | ------------ |
| [design-docs/](design-docs/INDEX.md)         | Architectural decisions with validation status | 5 docs       |
| [exec-plans/](exec-plans/INDEX.md)           | Execution plans (active/completed) + tech debt | 2 active     |
| [guides/](guides/INDEX.md)                   | How-to guides (setup, features, debugging)     | 16 guides    |
| [references/](references/INDEX.md)           | External API docs snapshots (.llms.txt)        | 4 references |
| [generated/](generated/INDEX.md)             | Auto-generated docs (db schema)                | 1 file       |
| [lessons-learned/](lessons-learned/INDEX.md) | Documented mistakes and their fixes            | 5 lessons    |

## Root Files

| File                                     | Description                                      |
| ---------------------------------------- | ------------------------------------------------ |
| [../AGENTS.md](../AGENTS.md)             | Entry point for AI agents (~100 lines, map only) |
| [../CLAUDE.md](../CLAUDE.md)             | Identical copy of AGENTS.md for Claude           |
| [../ARCHITECTURE.md](../ARCHITECTURE.md) | Stable system architecture reference             |
| [../README.md](../README.md)             | User-facing project overview                     |

---

## Quality Scores

> Auto-updated by `pnpm docs:lint`

| Section         | Files  | Score   | Last Validated |
| --------------- | ------ | ------- | -------------- |
| design-docs     | 5      | 100/100 | 2026-05-16     |
| exec-plans      | 5      | 90/100  | 2026-05-16     |
| guides          | 16     | 85/100  | 2026-05-16     |
| references      | 4      | 100/100 | 2026-03-27     |
| generated       | 1      | —       | —              |
| lessons-learned | 5      | 70/100  | 2026-03-27     |
| **OVERALL**     | **35** | **—**   | **—**          |

---

## Health Checks

Run `pnpm docs:check` to:

1. Regenerate `docs/generated/db-schema.md` from Drizzle schema
2. Validate all internal links
3. Check AGENTS.md is < 120 lines
4. Compute quality scores
5. Report any orphaned files
