#!/usr/bin/env python3
"""Scaffold an agent-readable harness layout without clobbering existing files."""

from __future__ import annotations

import argparse
from pathlib import Path


DOC_TEMPLATES = {
    "ARCHITECTURE.md": """# Architecture

## System Map

Describe the top-level architecture, major subsystems, and data flow.

## Boundaries

- Domain boundaries:
- Integration boundaries:
- Ownership boundaries:

## Agent Notes

Link the most important implementation docs under `docs/`.
""",
    "docs/DESIGN.md": """# Design

Capture durable product and interface design principles here.
Link detailed decisions from `docs/design-docs/`.
""",
    "docs/FRONTEND.md": """# Frontend

Document frontend conventions, UI architecture, and testing expectations.
""",
    "docs/PLANS.md": """# Plans

Execution plans live in `docs/exec-plans/`.

- `active/`: in-flight work
- `completed/`: closed plans worth preserving
- `tech-debt-tracker.md`: known debt and follow-ups
""",
    "docs/PRODUCT_SENSE.md": """# Product Sense

Describe the primary users, core journeys, and what quality looks like for this product.
""",
    "docs/QUALITY_SCORE.md": """# Quality Score

Track quality dimensions that matter for this repo.

Suggested axes:

- correctness
- test coverage
- docs freshness
- operability
- UX quality
""",
    "docs/RELIABILITY.md": """# Reliability

Record runtime expectations, failure modes, observability entrypoints, and incident prevention guidance.
""",
    "docs/SECURITY.md": """# Security

Record security-sensitive surfaces, auth model, secrets handling, and review expectations.
""",
    "docs/design-docs/INDEX.md": """# Design Docs Index

List durable design decisions here.
""",
    "docs/exec-plans/INDEX.md": """# Execution Plans Index

Use this directory for versioned plans and progress logs.
""",
    "docs/exec-plans/tech-debt-tracker.md": """# Tech Debt Tracker

Track known debt, why it exists, and the preferred resolution path.
""",
    "docs/exec-plans/active/EP-000-template.md": """# EP-000 Title

## Goal

## Scope

## Constraints

## Plan

## Verification

## Decision Log
""",
    "docs/lessons-learned/INDEX.md": """# Lessons Learned Index

Capture short, reusable lessons from bugs, incidents, and painful migrations.
""",
    "docs/product-specs/INDEX.md": """# Product Specs Index

List major feature specs and user journey documents here.
""",
    "docs/references/INDEX.md": """# References Index

Use this folder for external references adapted for LLM or agent consumption.
""",
    "docs/generated/README.md": """# Generated Docs

Place generated reference artifacts here. Avoid manual edits unless the generation flow says otherwise.
""",
}


AGENTS_TEMPLATE = """# AGENTS.md

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
"""


def write_file(path: Path, content: str, force: bool) -> str:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() and not force:
        return f"skip {path}"
    path.write_text(content, encoding="utf-8")
    return f"write {path}"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default=".")
    parser.add_argument("--repo-name")
    parser.add_argument("--summary")
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--write-agents-template", action="store_true")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    actions: list[str] = []

    for relative_path, content in DOC_TEMPLATES.items():
        rendered = content
        if args.repo_name:
            rendered = rendered.replace("this repo", args.repo_name)
        if args.summary and relative_path == "ARCHITECTURE.md":
            rendered = rendered.replace(
                "Describe the top-level architecture, major subsystems, and data flow.",
                args.summary,
            )
        actions.append(write_file(root / relative_path, rendered, args.force))

    if args.write_agents_template:
        target = root / "AGENTS.harness-template.md"
        actions.append(write_file(target, AGENTS_TEMPLATE, args.force))

    print("Harness repo init actions:")
    for action in actions:
        print(f"- {action}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
