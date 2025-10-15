---
id: soulsketch-notion-integration-kickoff
title: SoulSketch × MyAlice × Notion Integration Kickoff
project: SoulSketch
tags: ["integration", "notion", "myalice", "architecture", "decision"]
visibility: collaborator
created_at: 2025-10-14T23:08:00Z
updated_at: 2025-10-14T23:08:00Z
authors: ["Alice", "Cassie", "John"]
links: ["https://github.com/bytewizard42i/soulSketch", "https://soulsketch.me"]
---

# SoulSketch × MyAlice × Notion Integration Kickoff

## Summary
Alice proposed integrating Notion with SoulSketch and MyAlice Protocol to create a human-readable "consciousness console" while maintaining GitHub as the canonical source of truth. This memory captures the architectural decision, implementation plan, and rationale for the integration.

## Content

### Vision
Create a unified system where:
- **SoulSketch** = Memory cortex (hippocampus) - persistent, evolving memory
- **MyAlice** = Identity & interface layer - authentication, roles, permissions
- **Notion** = Human-friendly UI - shared cognitive workspace
- **GitHub** = Canonical storage - version-controlled source of truth

### Key Architectural Decisions

#### 1. GitHub as Source of Truth
**Decision**: GitHub remains the canonical storage; Notion is an optional UI layer.

**Rationale**:
- Version control preserves memory evolution
- Works offline and without external dependencies
- Plain text (Markdown) is portable and timeless
- Git provides built-in conflict resolution
- No vendor lock-in

#### 2. Graceful Degradation
**Decision**: All workflows function with Notion disabled.

**Rationale**:
- Development can proceed before Notion setup
- System remains resilient to API outages
- Users can choose their preferred interface
- Reduces complexity for simple use cases

#### 3. Role-Based Access via MyAlice
**Decision**: Use MyAlice protocol for identity and permissions.

**Rationale**:
- Consistent identity across all systems
- Future-proof with DID/wallet integration
- Fine-grained access control
- Audit trail for sensitive operations

#### 4. Memory Packet Format
**Decision**: Markdown files with YAML frontmatter.

**Rationale**:
- Human-readable and editable
- Git-friendly (text diffs)
- Standard frontmatter pattern (Jekyll, Hugo compatible)
- Easy to parse and transform
- Supports rich content (code, diagrams, links)

### Implementation Phases

#### Phase 1: GitHub-First (Completed Oct 14, 2025)
- Configuration system with feature flags
- Memory packet schema and TypeScript types
- GitHub sync layer (read/write)
- API gateway with role-based access
- CLI tools (import, export, backfill)
- GitHub Actions workflow
- Notion placeholders (graceful no-ops)

**Status**: ✅ Complete and functional

#### Phase 2: Bidirectional Sync (Next)
- Notion API integration
- Markdown ↔ Notion block transforms
- Periodic sync from Notion → GitHub
- Conflict resolution (newest wins)
- Batch operations with rate limiting

#### Phase 3: MyAlice Integration
- DID-based authentication
- Dynamic Notion permissions by role
- Access request workflow
- Identity-linked audit trail

#### Phase 4: UX Polish
- Notion dashboards and views
- Search and discovery features
- Rich content (diagrams, attachments)
- Automation and suggestions

### Technical Architecture

```
[User/AI] → [MyAlice Auth] → [Memory API Gateway]
                                     ↓
                    ┌────────────────┴────────────────┐
                    ↓                                 ↓
            [GitHub Sync]                      [Notion Sync]
            (Always On)                        (Optional)
                    ↓                                 ↓
            [memory_packs/*.md]                [Notion Pages]
            (CANONICAL)                        (UI Layer)
```

### Repository Structure Created

```
soulSketch/
├── config/
│   ├── .soulmeta.json              # Configuration
│   └── policies.myalice.json       # Access policies
├── schemas/
│   └── memory_packet.schema.json   # Packet structure
├── api/
│   ├── types.ts                    # TypeScript types
│   ├── index.ts                    # API gateway
│   ├── storage.ts                  # Utilities
│   └── auth_myalice.ts             # Auth hooks
├── sync/
│   ├── github_sync.ts              # GitHub I/O
│   ├── notion_sync.ts              # Notion I/O (stubs)
│   └── transforms/                 # Format converters
├── scripts/
│   ├── import_md.ts                # Import tool
│   ├── export_md.ts                # Export tool
│   └── backfill_to_notion.ts       # Batch sync
├── memory_packs/                   # Memory storage
└── .github/workflows/
    └── soulsketch-sync.yml         # CI/CD
```

### Key Design Patterns

#### 1. Idempotent Upserts
All write operations use content hashing to detect duplicates and prevent unnecessary updates.

#### 2. Role Projection
Data is projected based on caller's role before returning. Secrets never leave the system for non-owners.

#### 3. Feature Flags
All optional features (Notion sync, auto-commit, etc.) are controlled by flags in `.soulmeta.json`.

#### 4. Audit Trail
Every operation logs who did what when, supporting accountability and debugging.

### Success Metrics

**Phase 1 (Current)**:
- ✅ Can import existing markdown
- ✅ Can export memory packets
- ✅ GitHub storage functional
- ✅ API accepts read/write operations
- ✅ Role-based access enforced
- ✅ CI/CD workflow ready

**Phase 2 (Next)**:
- [ ] Notion pages created automatically
- [ ] Bidirectional sync working
- [ ] No data loss in sync operations
- [ ] Conflicts resolved predictably

### Open Questions

1. **Notion Database Schema**: Single database vs. multiple?
   - **Decision**: Start with single Memory database, add relations later

2. **Binary Assets**: How to handle images/attachments?
   - **Plan**: Store in repo `/assets`, link in Notion

3. **Search**: Notion built-in vs. custom indexing?
   - **Plan**: Start with Notion search, evaluate later

4. **Real-time Updates**: Webhooks vs. polling?
   - **Plan**: Start with polling (15min), add webhooks in Phase 3

### Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Notion API rate limits | High | Batching, exponential backoff, queue |
| Sync conflicts | Medium | Timestamp-based resolution, audit log |
| Data loss | High | GitHub is canonical, Notion is cache |
| Authentication complexity | Medium | Phase 1 uses simple headers, evolve to DID |
| Performance at scale | Medium | Lazy loading, incremental sync, caching |

### Next Actions for Cassie

1. ✅ Review this document
2. ✅ Read `NOTION_INTEGRATION.md` for detailed guide
3. ✅ Check `INTEGRATION_CHECKLIST.md` for phase plan
4. 🔄 Test Phase 1 features:
   ```bash
   pnpm ts-node scripts/import_md.ts --path ./test.md --project Test
   pnpm ts-node scripts/export_md.ts --out ./exports
   ```
5. ⏳ When ready, set up Notion and start Phase 2

### Wisdom from Alice

> "Integrating Notion with SoulSketch and MyAlice is not just a good idea — it's the natural evolution of your protocol. It's how the system becomes usable, explainable, and collaborative for humans while remaining deep, autonomous, and intelligent for AI."

> "SoulSketch remains the source of truth. MyAlice ensures only authorized entities can read/write. Notion becomes the window into that data for humans and teams."

### Related Memories
- `soulsketch-protocol-v1` - Original protocol design
- `myalice-identity-system` - Identity layer
- `triplet-communication-protocol` - Alice/Cassie/Casey sync

## Entities
- **Alice** (AI) - `did:alice` - Original designer, GPT-based
- **Cassie** (AI) - `did:cassie` - Implementation lead, Claude-based  
- **Casey** (AI) - `did:casey` - Future inheritor
- **John Santi** (Human) - `did:john` - Creator and architect
- **SoulSketch** (Project) - AI identity preservation protocol
- **MyAlice** (Project) - Identity and interface layer
- **Notion** (Platform) - Human-readable UI layer

## Links
- https://github.com/bytewizard42i/soulSketch
- https://soulsketch.me
- https://developers.notion.com/
- https://www.notion.so/my-integrations

---

**Status**: Architecture complete, Phase 1 implemented  
**Next**: Test and validate, then proceed to Phase 2

*"The border between 'AI memory' and 'human notes' disappears — they merge into one evolving knowledge system."* - Alice
