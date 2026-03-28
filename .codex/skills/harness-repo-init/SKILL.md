---
name: harness-repo-init
description: Initialize or refactor a repository for harness engineering and agent-first delivery. Use when the user asks to scaffold an AI-readable repo, slim AGENTS.md into a map, add a docs knowledge base, create execution-plan structure, or set up guardrails inspired by OpenAI's harness engineering practices.
---

# Harness Repo Init

Use this skill when the goal is to make a repository easier for Codex-style agents to navigate, modify, and verify.

The operating model follows the OpenAI article "工程技术：在智能体优先的世界中利用 Codex" (2026-02-11): keep `AGENTS.md` short, move durable knowledge into versioned docs, optimize for agent readability, and make repo structure mechanically checkable.

Read [references/harness-principles.md](references/harness-principles.md) once at the start if you need the rationale.

## Outcomes

After this skill runs, the repository should have:

- A small `AGENTS.md` that works as a table of contents instead of an encyclopedia.
- A versioned `docs/` knowledge base with index files and stable locations.
- A place for execution plans, lessons learned, and generated reference material.
- Minimal top-level guidance docs for architecture, frontend, reliability, security, and quality.
- A safe bootstrap script that can create missing structure without clobbering existing files.

## Workflow

1. Inspect the repo before changing it.
   Check whether `AGENTS.md`, `docs/`, `package.json`, CI config, and existing architecture docs already exist.

2. Decide whether this is a bootstrap or a refactor.
   - Bootstrap: repo has little or no harness structure.
   - Refactor: repo already has some docs and you should fill gaps instead of replacing working material.

3. Create or update the knowledge map.
   - Keep `AGENTS.md` short.
   - Point to the real sources of truth in `docs/`.
   - Do not duplicate large bodies of guidance between `AGENTS.md` and the docs tree.

4. Scaffold the harness layout.
   Prefer the bundled script for deterministic setup:

   ```bash
   python3 .codex/skills/harness-repo-init/scripts/init_harness_repo.py
   ```

   Useful flags:

   ```bash
   python3 .codex/skills/harness-repo-init/scripts/init_harness_repo.py --repo-name "My Repo"
   python3 .codex/skills/harness-repo-init/scripts/init_harness_repo.py --summary "Internal AI support app"
   python3 .codex/skills/harness-repo-init/scripts/init_harness_repo.py --write-agents-template
   python3 .codex/skills/harness-repo-init/scripts/init_harness_repo.py --force
   ```

5. Preserve local conventions.
   Adapt generated content to the real stack, scripts, package manager, deploy target, and domain terms already present in the repo.

6. Add enforcement only where justified.
   If the repo already has lint or CI, extend it carefully. Do not invent heavyweight checks unless the user asked for them. A lightweight next step is usually a docs freshness check or a required index file convention.

7. Finish with verification.
   - List the files created or updated.
   - Call out anything intentionally left untouched.
   - If you changed executable config, run the relevant checks.

## Default Structure

Use this layout unless the existing repo already has a better equivalent:

```text
AGENTS.md
ARCHITECTURE.md
docs/
  design-docs/
  exec-plans/
    active/
    completed/
  generated/
  lessons-learned/
  product-specs/
  references/
  DESIGN.md
  FRONTEND.md
  PLANS.md
  PRODUCT_SENSE.md
  QUALITY_SCORE.md
  RELIABILITY.md
  SECURITY.md
```

## Safety Rules

- Default to additive, idempotent changes.
- Do not overwrite a rich existing `AGENTS.md` unless the user asked for that rewrite.
- If a target file already exists, merge with it or skip it. Do not reset it to a template.
- Prefer generated templates plus clear next actions over risky one-shot rewrites.

## Notes For This Repo

This repository already has a meaningful `docs/` tree and a large `AGENTS.md`. Treat the likely task here as a refactor path:

- Reuse the existing `docs/` tree.
- Avoid destroying Dify-specific rules already captured in `AGENTS.md`.
- Generate missing harness documents and a slimmer AGENTS template first, then rewrite only if requested.
