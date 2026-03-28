# AGENTS.md

> Entry point for AI agents. This file is a MAP — ~100 lines. All detail is in `docs/`.
> Last updated: 2026-03-28

## Project Identity

**IC-AI** — Next.js 16 SaaS boilerplate for AI-powered customer support.

- **Stack**: Next.js 16 + React 19 + TypeScript 5, Tailwind CSS v4, Radix UI
- **Database**: Drizzle ORM + PostgreSQL
- **Auth**: Better Auth + RBAC
- **AI**: Dify (primary, SSE streaming) + OpenRouter / Replicate / FAL / Gemini (secondary)
- **i18n**: next-intl (en / zh)
- **Package manager**: pnpm 10.24.0

---

## Quick Commands

```bash
# Development
pnpm dev              # Start dev server (Turbopack)
pnpm build            # Production build
pnpm lint             # ESLint
pnpm format           # Prettier

# Database
pnpm db:generate      # Generate migration from schema changes
pnpm db:migrate       # Apply migrations (production)
pnpm db:push          # Push schema directly (development only)
pnpm db:studio        # Open Drizzle Studio GUI

# Docs
pnpm docs:check       # Regenerate db-schema + validate all docs
pnpm docs:lint        # Validate docs structure, links, quality scores
pnpm docs:gen-schema  # Regenerate docs/generated/db-schema.md

# Auth & RBAC
pnpm auth:generate    # Regenerate auth tables after config changes
pnpm rbac:init        # Initialize RBAC roles
pnpm rbac:assign      # Assign role to user
```

---

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full directory map, data flow diagram, and deployment targets.

---

## Agent Roster

### 执行流程（Planner → Generator → Evaluator 循环）

```
用户需求 (1-4句)
    ↓
[planner]    读 docs/ → 生成 Sprint Contract → docs/exec-plans/active/
    ↓ Contract STATUS: PROPOSED
[evaluator]  审核 Contract → 协商直到 AGREED
    ↓ Contract STATUS: AGREED
[fullstack-developer 或 dify-integration]  实现
    ↓
[evaluator]  真实运行验证 → 4维度打分 → 硬阈值判定
    ↑_____________ FAIL: 具体反馈 ____________|
    ↓ PASS
完成
```

### Agent 说明

| Agent | 职责 | 调用时机 |
|-------|------|---------|
| `planner` | 需求 → Sprint Contract | 任务开始前 |
| `evaluator` | 审核 Contract + 验证输出 | Contract 提交后 / 实现完成后 |
| `fullstack-developer` | DB → API → UI → i18n 实现 | Contract AGREED 后 |
| `dify-integration` | Dify API、SSE、多 bot 配置 | 涉及 Dify 的任务 |
| `claude-process-guardian` | 代码合规审查 | 写完代码后 |
| `project-navigator` | 代码库导航 | 找文件/理解结构 |

---

## Knowledge Base Map

| Section | What's There |
|---------|-------------|
| [docs/design-docs/](docs/design-docs/INDEX.md) | 4 architectural decision records (DD-001 to DD-004) |
| [docs/exec-plans/](docs/exec-plans/INDEX.md) | Active plans, completed plans, tech debt tracker |
| [docs/guides/](docs/guides/INDEX.md) | Setup, feature development, Dify tutorial, debugging |
| [docs/references/](docs/references/INDEX.md) | Dify API, Better Auth, Drizzle ORM, next-intl snapshots |
| [docs/generated/](docs/generated/INDEX.md) | Auto-generated DB schema reference |
| [docs/lessons-learned/](docs/lessons-learned/INDEX.md) | 5 documented past mistakes with fixes |

---

## Dify AI Integration

Primary AI provider. **Critical rules** (conversation_id, multi-bot keys, 404 recovery) are in:
→ [docs/design-docs/DD-003-dify-streaming-architecture.md](docs/design-docs/DD-003-dify-streaming-architecture.md)

Full tutorial: [docs/guides/dify-integration.md](docs/guides/dify-integration.md)

---

## Environment Setup

See [docs/guides/environment-setup.md](docs/guides/environment-setup.md) for required env vars and first-time setup.

---

## Lessons Learned

5 documented lessons from past issues: [docs/lessons-learned/INDEX.md](docs/lessons-learned/INDEX.md)

When fixing a significant bug, add a new lesson using the template in that index.
