# AGENTS.md

A short orientation for AI coding assistants and human reviewers who land in
this repo cold.

## What this repo is

SoulSketch is an **open protocol** for portable AI memory packs (persona,
relationships, technical context, voice, runtime observations) plus a small
TypeScript reference implementation. See [`README.md`](README.md) for the full
overview and [`SECURITY.md`](SECURITY.md) for what is and isn't implemented.

## What this repo is *not*

- Not a published npm package yet (`@soulsketch/core` / `@soulsketch/cli` are
  source-only for now).
- Not a scientific claim about consciousness. The poetic framing in
  [`philosophy/`](philosophy) and parts of the README is intentionally
  exploratory.
- Not a hosted service. There is a reference HTTP API in [`api/`](api) but it
  is not deployed anywhere by the maintainer.

## Where the real code lives

| Path | Purpose |
| --- | --- |
| `packages/core/` | Agent kernel, memory-driver interface, safety helpers. The most "production-ish" code. |
| `protocol/` | Protocol implementation: memory engine, validator, exporter, embedding pipeline, knowledge graph, session manager, security boundaries, runtime observations. |
| `cli/` | `soulsketch` CLI. Real commands: `memory`, `validate pack`, `session`, `graph`, `symphony`, `interactive`. |
| `api/` | Reference HTTP API. |
| `sync/` | Git/GitHub and Notion adapters. |
| `schemas/` | JSON schemas for memory packs and packets — the closest thing to a normative artifact. |
| `examples/reference_memory_pack/` | A sanitized memory pack you can copy. |
| `tests/` | End-to-end tests. |

## Conventions

- Memory packs are 5 plain files: `persona.md`, `relationship_dynamics.md`,
  `technical_domains.md`, `stylistic_voice.md`, `runtime_observations.jsonl`.
- Public protocol + private state: this repo is the **skeleton**; users keep
  their actual memories in a separate private repo.
- Code style: TypeScript, ESM, Prettier, ESLint, Vitest.

## If you're making changes

1. Read [`CONTRIBUTING.md`](CONTRIBUTING.md).
2. Don't add `apps/`, `adapters/`, `prompts/` packages, hosted services, or
   "production" claims unless they're actually in the tree. The
   [Limitations](README.md#%EF%B8%8F-limitations--current-scope) section is
   deliberate.
3. When updating security claims, mirror them in [`SECURITY.md`](SECURITY.md).
4. Keep poetic / philosophical text out of normative docs (schemas, SPEC,
   SECURITY). It belongs in `philosophy/` and the README's "Core Philosophy"
   section.

## Historical context

Older session artifacts (Alice↔Cassie integration logs, repair notes, etc.)
live in [`docs/archive/`](docs/archive). Don't treat them as current spec.
