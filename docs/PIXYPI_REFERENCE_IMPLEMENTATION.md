# PixyPi Reference Implementation

PixyPi is the maintainer's **Soul-Sanctum** - the private, in-use reference
implementation that keeps SoulSketch grounded. (A Soul-Sanctum is what we call
each user's private memory repository: the one place their assistant's
identity lives, owned by them alone.) It proves the protocol is not only a philosophy or a future SaaS idea.
It is a working operating pattern for continuity across assistants, machines,
repositories, and model providers.

This document describes the architecture without publishing private memory state.

## Why PixyPi Matters

Modern Ai platforms increasingly provide built-in memory. That is useful, but it
does not remove the need for SoulSketch. Platform memory is usually controlled by
the platform, hidden from Git history, and difficult to move into another model,
IDE, or local runtime.

PixyPi shows the different claim:

> A user can own assistant continuity as plain files, policies, memories, Git
> history, and repeatable handoff rituals.

## Operating Pattern

PixyPi uses SoulSketch as a protocol layer, not as a hosted service.

1. Public protocol files live in SoulSketch.
2. Private assistant state lives in a private repository.
3. Memory packs are plain Markdown and JSONL files.
4. Git records what changed, when it changed, and who reviewed it.
5. MCP and IDE tools read from the private state when they need continuity.
6. Handoff notes summarize current work when moving between assistants or tools.

## Core Components

### 5-File Memory Pack

Each assistant identity can be represented by:

- `persona.md`: role, temperament, identity framing, and operating posture.
- `relationship_dynamics.md`: human collaboration patterns and preferences.
- `technical_domains.md`: tools, repos, environments, and coding conventions.
- `stylistic_voice.md`: communication style and formatting habits.
- `runtime_observations.jsonl`: dated observations that evolve over time.

### Global Rules

Global rules act as a boot layer. They provide stable context that should be
available before any project-specific memory is loaded.

### MCP Memory

MCP memory tools can provide a session-friendly knowledge graph or key-value
memory layer. SoulSketch does not require one specific MCP server. The protocol
expects memory to be inspectable, scoped, and connected to a source of truth.

### Git Sync

Git is the continuity ledger. It gives PixyPi a simple answer to provenance and
rollback questions:

- Which memory changed?
- Who changed it?
- When did it change?
- Which commit was loaded?
- Can the previous state be restored?

### Handoff Notes

Handoffs prevent context loss when switching between assistants, machines, or
platforms. A useful handoff names the task, status, files touched, decisions made,
open risks, and next action.

## Trust Boundaries

PixyPi keeps a clean boundary between public protocol and private state.

- Public templates are examples, not canonical identity.
- Private memory packs are state, not reusable templates.
- Imported memories need provenance before they can be trusted.
- Sensitive memories should remain private and should not be copied into public
  documentation.
- A fingerprint can identify a memory state without disclosing its contents.

## How This Updates SoulSketch

SoulSketch should prioritize tools that make the PixyPi pattern repeatable:

- Validate the 5-file pack format.
- Fingerprint a memory pack.
- Record provenance, authority, and trust labels.
- Generate handoff summaries.
- Report memory health and stale observations.
- Sync through Git without hiding the source of truth.

That is the practical protocol. The philosophical language can remain, but the
tooling should prove the claim.
