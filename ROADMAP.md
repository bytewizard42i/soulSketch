# SoulSketch Roadmap

## Current Thesis

SoulSketch is not trying to replace the memory features built into modern Ai platforms.
Those features are useful, but they are usually platform-owned, hard to inspect, and
hard to move across models, IDEs, machines, and vendors.

SoulSketch is the portable layer underneath them: human-readable memory packs,
Git history, provenance labels, trust boundaries, fingerprints, handoffs, and sync
patterns that let a user own the continuity of an assistant.

## What Exists Today

- The 5-file memory pack format: `persona.md`, `relationship_dynamics.md`,
  `technical_domains.md`, `stylistic_voice.md`, and `runtime_observations.jsonl`.
- A public skeleton repository with templates, examples, schemas, docs, protocol
  files, TypeScript core code, CLI entry points, and release artifacts.
- PixyPi as the private, in-use reference implementation for a multi-assistant
  memory system across machines and tools.
- A practical dual-repository pattern: public protocol, private state.
- MCP-friendly conventions for file access, memory tools, Git sync, and assistant
  bootstrapping.
- Initial security and trust-boundary utilities: redaction helpers, path checks,
  visibility labels, and memory envelope metadata.

## Product Positioning

Lead with the practical claim:

> SoulSketch makes Ai continuity portable, inspectable, version-controlled, and
> owned by the user.

Keep the philosophical language as a meaningful frame, not as the technical proof.
The proof is the file format, Git history, CLI validation, PixyPi reference usage,
and repeatable handoff workflow.

## Phase 1: Credibility and Correctness

Goal: make the public repo true, runnable, and easy to trust.

- [x] Calibrate the README to call SoulSketch research-grade software.
- [x] Identify PixyPi as the live reference implementation.
- [x] Add deterministic memory pack fingerprints in `@soulsketch/core`.
- [x] Add provenance, authority, and trust labels for memory pack continuity.
- [x] Add core unit tests so `npm test` has real coverage.
- [x] Make the CLI validate the actual 5-file memory pack directory format.
- [ ] Publish a short `docs/PIXYPI_REFERENCE_IMPLEMENTATION.md` guide with no
  private memory contents.
- [ ] Replace outdated business claims with a lean product note.
- [ ] Add CI coverage for CLI smoke tests.
- [ ] Add a current security audit note with known dependency and runtime status.

## Phase 2: Practical Developer Tools

Goal: make SoulSketch useful before it becomes a platform.

- [ ] `soulsketch validate <pack>`: full structure, JSONL, metadata, and warning
  checks for 5-file packs.
- [ ] `soulsketch fingerprint <pack>`: generate a stable identity fingerprint and
  per-file hashes.
- [ ] `soulsketch health <pack>`: report freshness, missing sections, stale files,
  trust labels, and risky provenance.
- [ ] `soulsketch handoff`: generate a session handoff summary for switching
  assistants, machines, or model providers.
- [ ] `soulsketch snapshot`: write a versioned continuity record for a milestone.
- [ ] `soulsketch diff`: compare two fingerprints or pack directories and explain
  what changed.

## Phase 3: MCP and IDE Integration

Goal: make continuity available inside the tools people already use.

- [ ] Build `@soulsketch/mcp-server`.
- [ ] Expose MCP tools for remembering, recalling, validating, fingerprinting,
  handoff generation, and Git sync.
- [ ] Add setup guides for Codex, Windsurf, Cursor, Claude Desktop, and VS Code.
- [ ] Keep the storage model local-first, Git-first, and readable without a hosted
  service.
- [ ] Add explicit safeguards for secrets, private memories, and imported packs.

## Phase 4: PixyPi-to-Public Learning Loop

Goal: let the private reference implementation improve the public protocol without
leaking private state.

- [ ] Create sanitized examples from real PixyPi workflows.
- [ ] Document the daily operating loop: boot context, memory creation, sync,
  review, handoff, and archival.
- [ ] Add a contradiction scanner for stale or conflicting preferences.
- [ ] Add memory consolidation helpers for old runtime observations.
- [ ] Add diffusion packets for cross-assistant learnings.

## Phase 5: DIDz and Midnight Integration

Goal: make agent continuity verifiable without revealing private memory contents.

- [ ] Store SoulSketch fingerprints in a DIDz-compatible agent identity record.
- [ ] Explore Midnight private-state storage for current fingerprints.
- [ ] Prove continuity, provenance, or age of an assistant without disclosing the
  memory pack.
- [ ] Keep the first implementation narrow: hashes, timestamps, authority labels,
  and owner-controlled updates.

## Deferred Until There Is Pull

These ideas stay out of the critical path until the protocol has outside users:

- Hosted SaaS platform.
- Enterprise licensing.
- Visual memory constellations.
- Marketplace templates.
- Commercial certification programs.

The near-term win is smaller and stronger: a local-first protocol and CLI that make
assistant continuity portable, auditable, and trustworthy.
