# @soulsketch/core

Core library of the [SoulSketch Protocol](https://github.com/bytewizard42i/soulSketch):
portable, user-owned AI memory packs with verifiable continuity.

## What's inside

- **Memory pack fingerprints** — `computeMemoryPackFingerprint` produces a
  deterministic SHA-256 identity hash of a 5-file memory pack (line-ending
  normalized, so packs travel across Windows/WSL/Linux without false drift).
- **Continuity records** — `createContinuityRecord` bundles the fingerprint
  with provenance labels (source, authority, trust) and warnings.
- **Validation** — `validateMemoryPackContents` checks the 5-file pack layout
  and the `runtime_observations.jsonl` stream (pure, no filesystem access).
- **Semantic diff** — `diffMemoryPacks` explains which identity dimension
  changed between two pack states (persona, relationships, technical domains,
  voice, observations).
- **Agent kernel & safety helpers** — memory-driver interface, PII redaction
  helpers, path checks.

## The 5-file memory pack

```
persona.md                  # who the assistant is
relationship_dynamics.md    # who it knows, and how
technical_domains.md        # what it's good at
stylistic_voice.md          # how it talks
runtime_observations.jsonl  # what it's noticed lately (append-only diary)
```

Plain Markdown + JSONL in a Git repo **you** own — portable across models,
tools, machines, and vendors.

## Install

```bash
npm install @soulsketch/core
```

```ts
import { computeMemoryPackFingerprint } from '@soulsketch/core';
```

## Related

- [`@soulsketch/mcp-server`](https://www.npmjs.com/package/@soulsketch/mcp-server) —
  expose these tools to any MCP-capable AI client
- [Protocol repository & docs](https://github.com/bytewizard42i/soulSketch)

Apache-2.0 © John Santi & The AI Family
