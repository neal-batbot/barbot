---
id: EP-001
title: Knowledge Base Harness Setup
status: ACTIVE
created: 2026-03-28
---

## Objective

Restructure project documentation from a monolithic AGENTS.md (800+ lines) into a tiered knowledge base following OpenAI harness engineering principles: progressive disclosure, versioned exec-plans, validated design docs, and CI enforcement.

## Success Criteria

- [x] AGENTS.md reduced to ~100 lines (map only)
- [x] `docs/` directory with all subdirectories created
- [x] 4 design docs (DD-001 to DD-004) created
- [x] 5 lessons-learned files (LL-001 to LL-005) created
- [x] Existing root docs migrated to `docs/guides/` and `docs/references/`
- [x] ARCHITECTURE.md created at root
- [ ] `scripts/docs-lint.ts` written and passing
- [ ] `scripts/docs-gen-schema.ts` written and producing valid output
- [ ] `pnpm docs:check` exits 0
- [ ] Root-level migrated files deleted

## Plan Steps

1. Create docs/ skeleton — DONE
2. Migrate existing content — DONE
3. Write design docs & lessons — DONE
4. Slim AGENTS.md + CLAUDE.md — DONE
5. Write tooling scripts — IN PROGRESS
6. Cleanup migrated files — PENDING

## Decisions Made

- Kept `llms.txt` extension for reference files to signal "stable external snapshot"
- AGENTS.md and CLAUDE.md kept identical (one source of truth, synced)
- docs-lint.ts uses pure TypeScript with no new dependencies (tsx already available)

## Outcome

_To be filled on completion._
