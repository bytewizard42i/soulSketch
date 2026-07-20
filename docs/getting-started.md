# Getting Started with SoulSketch

SoulSketch is a portable memory-pack protocol for Ai assistant continuity. It is
local-first, Git-friendly, and designed to keep canonical memory under the
user's control.

## Prerequisites

- Node.js 18 or newer
- Git
- A text editor or IDE

## Install From Source

SoulSketch is not published to npm yet. Use the repository directly:

```bash
git clone https://github.com/bytewizard42i/soulSketch.git
cd soulSketch
npm install
npm run build
```

## Validate the Reference Pack

The simplest useful check is validating the 5-file reference memory pack:

```bash
npx tsx cli/soulsketch-cli.ts validate pack examples/reference_memory_pack
```

The required files are:

```text
persona.md
relationship_dynamics.md
technical_domains.md
stylistic_voice.md
runtime_observations.jsonl
```

## Create Your Own Pack

Copy the technical assistant template into your private state repository:

```bash
mkdir -p ~/my-assistant-state/memory_packs
cp templates/technical_assistant/* ~/my-assistant-state/memory_packs/
cd ~/my-assistant-state
git init
git add memory_packs
git commit -m "Initialize SoulSketch memory pack"
```

Keep real memory state private. This public repository is the protocol skeleton,
not the place for personal memories, credentials, or private project history.

## Record Runtime Observations

`runtime_observations.jsonl` stores one JSON object per line. Prefer dated,
small observations:

```jsonl
{"date":"2026-07-20T12:00:00Z","type":"preference","note":"User prefers direct repo checks before edits."}
{"date":"2026-07-20T12:30:00Z","type":"decision","note":"Canonical memory state lives in the private Git repository."}
```

## Use Git as the Continuity Ledger

Commit meaningful memory changes:

```bash
git status --short
git add memory_packs
git commit -m "Update assistant memory after project handoff"
```

Git answers practical continuity questions:

- What changed?
- When did it change?
- Who reviewed it?
- Which commit was loaded?
- Can we restore an older state?

## Understand Trust Boundaries

SoulSketch 1.2 uses explicit trust language:

- `public-template`: safe example material, not canonical identity.
- `private-state`: real assistant state owned by the user.
- `sanitized-example`: derived from real use, reviewed for public sharing.
- `sensitive`: private material that should not be published.
- `unknown`: imported or unreviewed material.

Canonical memory should include a repository and commit before it is used as a
source of truth.

## PixyPi Reference Pattern

PixyPi is the private, in-use reference implementation. The public pattern is:

1. Public protocol and templates live in SoulSketch.
2. Private state lives in a private repository.
3. MCP, IDE, and assistant tools read from that private state.
4. Handoff notes summarize current work when switching assistants.
5. Git history preserves provenance.

See [PixyPi Reference Implementation](PIXYPI_REFERENCE_IMPLEMENTATION.md).

## Development Commands

```bash
npm run build
npm test
npm run lint
```

## Current Scope

SoulSketch is research-grade software. It has real code, schemas, CLI commands,
and a private reference implementation, but it is not a hosted service and is
not published as an npm package yet.

The near-term focus is practical tooling:

- Validate memory packs.
- Fingerprint continuity states.
- Report memory health.
- Generate handoffs.
- Package the protocol as an MCP server.
