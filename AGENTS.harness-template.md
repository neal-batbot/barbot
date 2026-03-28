# AGENTS.md

This file is the entrypoint for agents working in this repository.

## Start Here

1. Read [ARCHITECTURE.md](ARCHITECTURE.md) for the system map.
2. Read [docs/PLANS.md](docs/PLANS.md) for execution-plan conventions.
3. Use the relevant index under `docs/` before broad codebase search.

## Knowledge Map

- [docs/design-docs/INDEX.md](docs/design-docs/INDEX.md): durable design decisions
- [docs/exec-plans/INDEX.md](docs/exec-plans/INDEX.md): active and completed execution plans
- [docs/lessons-learned/INDEX.md](docs/lessons-learned/INDEX.md): short lessons from prior failures
- [docs/product-specs/INDEX.md](docs/product-specs/INDEX.md): product and feature specs
- [docs/references/INDEX.md](docs/references/INDEX.md): external references and llms.txt material
- [docs/RELIABILITY.md](docs/RELIABILITY.md): runtime expectations and failure handling
- [docs/SECURITY.md](docs/SECURITY.md): security-sensitive areas and review expectations

## Working Rules

- Prefer additive, reversible changes.
- Keep durable knowledge in versioned Markdown instead of chat-only context.
- When a task is large, create or update an execution plan in `docs/exec-plans/active/`.
- When a bug teaches a reusable lesson, add it to `docs/lessons-learned/`.
