# Harness Principles

Source: OpenAI, [工程技术：在智能体优先的世界中利用 Codex](https://openai.com/zh-Hans-CN/index/harness-engineering/), published 2026-02-11.

This note captures the parts that matter for repository initialization.

## Core Ideas

1. Start from a repo the agent can shape.
   OpenAI describes bootstrapping an empty Git repo with Codex-generated structure, config, and guidance. The important takeaway is not "empty repo", but that the repo itself becomes the execution environment for agents.

2. Engineer the environment, not just the code.
   Human leverage moves from hand-writing implementation to designing tools, abstractions, validation loops, and clear instructions so the agent can reliably execute.

3. Optimize for agent readability.
   If knowledge is not local, versioned, and reachable from the repo, the agent effectively cannot see it. Durable knowledge should live in code, Markdown, generated references, and execution plans.

4. Treat `AGENTS.md` as a map.
   The article argues against a giant handbook. Keep `AGENTS.md` short and use it as a routing layer into `docs/` and other source-of-truth files.

5. Use progressive disclosure.
   Give the agent a small stable entrypoint, then point it to the next relevant doc. Avoid dumping every rule into one file.

6. Make plans first-class artifacts.
   Active plans, completed plans, and tech debt should be versioned so future agents can continue work without hidden context.

7. Reduce entropy continuously.
   As throughput rises, stale docs and dead instructions become a liability. Add lightweight repo mechanisms that make documentation freshness and structure easier to check.

## Repo Initialization Implications

- Create a predictable `docs/` topology.
- Add index files so agents can navigate instead of search blindly.
- Separate long-lived references from task-specific plans.
- Keep architecture and operating constraints in version control.
- Prefer idempotent scaffolding so the repo can evolve safely.
