> **ARCHIVED DESIGN NOTES.** This document describes an aspirational
> architecture (MyAlice DID/wallet auth, role permissions, Notion console)
> that was never built. The Notion adapter in [`sync/`](../../sync) is a
> feature-flagged placeholder only. Kept for provenance — do not treat as
> current spec.

# SoulSketch × MyAlice × Notion Integration Guide

## 🎯 Purpose

This integration creates a **human-readable memory console** in Notion backed by SoulSketch's memory graph and gated by MyAlice identity/permissions. **GitHub remains the canonical source of truth** - Notion is an optional UI layer.

## 🏗️ Architecture

```
┌─────────────────────┐
│ MyAlice Protocol    │  ← Identity, Auth, Roles
│ (DID/Wallet Auth)   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ SoulSketch Memory   │  ← Memory Graph, Packets
│ Core (GitHub)       │    **CANONICAL STORAGE**
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Memory API Gateway  │  ← Unified Interface
│ (api/index.ts)      │
└─────────┬───────────┘
          │
          ├─────────────────┐
          │                 │
          ▼                 ▼
┌─────────────────┐  ┌─────────────────┐
│ GitHub Sync     │  │ Notion Sync     │
│ (Always On)     │  │ (Optional)      │
└─────────────────┘  └─────────────────┘
```

## 📁 Directory Structure

```
soulSketch/
├── config/
│   ├── .soulmeta.json          # Main configuration
│   └── policies.myalice.json   # Role permissions
├── schemas/
│   └── memory_packet.schema.json
├── api/
│   ├── types.ts                # TypeScript interfaces
│   ├── index.ts                # Memory API gateway
│   ├── storage.ts              # Hash, sanitize, project
│   └── auth_myalice.ts         # Auth hooks (placeholder)
├── sync/
│   ├── github_sync.ts          # GitHub read/write (canonical)
│   ├── notion_sync.ts          # Notion sync (placeholders)
│   └── transforms/
│       ├── markdown_to_notion.ts
│       └── notion_to_markdown.ts
├── scripts/
│   ├── import_md.ts            # Import markdown files
│   ├── export_md.ts            # Export memory packets
│   └── backfill_to_notion.ts   # Batch sync to Notion
├── memory_packs/               # Markdown memory files
│   └── YYYY-MM-DD_<id>.md
└── .github/workflows/
    └── soulsketch-sync.yml     # Auto-sync CI/CD
```

## 🚀 Quick Start for Cassie

### Phase 1: GitHub-Only Mode (Now)

1. **Configuration is ready** - Files created in `config/`
2. **GitHub sync is functional** - Can read/write memory packets
3. **Notion sync is stubbed** - Will gracefully no-op

```bash
# Import existing markdown into SoulSketch
pnpm ts-node scripts/import_md.ts --path ./notes --project SoulSketch --author Cassie

# Export memory packets
pnpm ts-node scripts/export_md.ts --visibility collaborator --out ./exports

# List current memory packets
node -e "import('./api/index.js').then(m => m.memoryAPI.listPackets({}, 'owner').then(console.log))"
```

### Phase 2: Enable Notion (Later)

When ready to enable Notion:

1. **Set up Notion integration**:
   - Create Notion integration at https://www.notion.so/my-integrations
   - Create databases: Memory, Projects, Entities
   - Share databases with your integration

2. **Configure environment**:
```bash
export NOTION_TOKEN="secret_your_token_here"
export NOTION_DB_MEMORY_ID="database_id_here"
export NOTION_DB_PROJECTS_ID="database_id_here"
export NOTION_DB_ENTITIES_ID="database_id_here"
```

3. **Update config**:
```json
// config/.soulmeta.json
{
  "notion": {
    "enabled": true,  // ← Change this
    ...
  },
  "features": {
    "notion_sync": true  // ← And this
  }
}
```

4. **Implement Notion API calls** in `sync/notion_sync.ts`:
```bash
npm install @notionhq/client
```

5. **Backfill existing memories**:
```bash
pnpm ts-node scripts/backfill_to_notion.ts --since 2025-10-01
```

## 📋 Memory Packet Format

### Markdown Template (`memory_packs/YYYY-MM-DD_<id>.md`)

```markdown
---
id: my-memory-id
title: My Memory Title
project: SoulSketch
tags: ["integration", "notion", "myalice"]
visibility: collaborator
created_at: 2025-10-14T23:00:00Z
updated_at: 2025-10-14T23:00:00Z
authors: ["Alice", "Cassie"]
links: ["https://example.com"]
---

# My Memory Title

## Summary
Brief one-paragraph summary of this memory.

## Content
Detailed notes, decisions, code snippets, whatever you need.

This content will be sanitized based on role when accessed via API.

## Secrets (Owner Only)
- API_KEY: sk-1234567890
- INTERNAL_NOTE: Only owners can see this

## Entities
- **Alice** (AI) - `did:alice`
- **John** (Human) - `did:john`

## Links
- https://github.com/bytewizard42i/soulSketch
- https://soulsketch.me
```

## 🔐 Role-Based Access Control

### Roles (via MyAlice)

1. **Owner** - Full access including secrets
2. **Collaborator** - Sanitized content, can write
3. **Public** - Title, summary, basic metadata only

### Policy Configuration

Edit `config/policies.myalice.json` to customize:

```json
{
  "roles": {
    "collaborator": {
      "fields": ["id", "title", "summary", "sanitized_content"],
      "redactions": ["secrets", "api_keys"],
      "permissions": {
        "read": true,
        "write": true,
        "delete": false
      }
    }
  }
}
```

## 🔄 Sync Workflows

### Automatic Sync (GitHub Actions)

When you push to `memory_packs/*.md`:
1. ✅ Validates packet structure
2. ✅ Checks for duplicates  
3. 🔄 Syncs to Notion (if enabled)
4. 📝 Generates public exports

### Manual Sync

```bash
# Sync specific project
pnpm ts-node scripts/backfill_to_notion.ts --project SoulSketch

# Sync since date
pnpm ts-node scripts/backfill_to_notion.ts --since 2025-10-01

# Dry run to preview
pnpm ts-node scripts/backfill_to_notion.ts --dry-run
```

## 🛠️ API Usage

### TypeScript/JavaScript

```typescript
import { memoryAPI } from './api/index.js';
import type { MemoryPacket } from './api/types.js';

// Create a new memory
const packet: MemoryPacket = {
  id: 'my-new-memory',
  title: 'My New Memory',
  content: 'This is the content...',
  created_at: new Date().toISOString(),
  authors: ['Cassie'],
  visibility: 'collaborator',
  project: 'SoulSketch',
  tags: ['test', 'api']
};

const result = await memoryAPI.upsertPacket(packet, 'owner');
console.log('Saved to:', result.backends);

// Query memories
const memories = await memoryAPI.listPackets({
  project: 'SoulSketch',
  tags: ['notion']
}, 'collaborator');

// Search
const results = await memoryAPI.searchPackets('notion integration', 'owner');
```

## 📊 Monitoring & Debugging

### Check configuration
```bash
cat config/.soulmeta.json | jq .
```

### List all memory packets
```bash
ls -lh memory_packs/
```

### Validate a packet
```bash
node -e "
import('./sync/github_sync.js').then(m => {
  return m.readFromGit('your-memory-id');
}).then(console.log);
"
```

### Check Notion status
```bash
echo $NOTION_TOKEN
echo $NOTION_DB_MEMORY_ID
```

## 🚦 Phase Roadmap

### ✅ Phase 1: GitHub-First (Current)
- [x] Configuration files
- [x] Memory packet schema
- [x] GitHub sync (read/write)
- [x] API gateway with auth hooks
- [x] CLI scripts (import/export)
- [x] GitHub Actions workflow
- [x] Notion placeholders (no-op)

### 🔄 Phase 2: Bidirectional Sync (Next)
- [ ] Implement Notion API integration
- [ ] Markdown ↔ Notion block transforms
- [ ] Notion → GitHub pull sync (15min intervals)
- [ ] Conflict resolution (newest wins + audit log)
- [ ] Batch operations with rate limiting

### 🎯 Phase 3: MyAlice Integration (Future)
- [ ] Replace header auth with DID verification
- [ ] Notion page sharing based on MyAlice roles
- [ ] "Request access" workflow
- [ ] Audit trail with identity tracking

### ✨ Phase 4: UX Polish (Future)
- [ ] Notion dashboards (projects, timeline, entities)
- [ ] Search by tags, entities, projects
- [ ] Embedded diagrams (Mermaid, PlantUML)
- [ ] Binary asset handling (images, attachments)

## 🐛 Troubleshooting

### Import fails with "Invalid markdown"
- Ensure frontmatter is valid YAML between `---` markers
- Check that required fields are present: `id`, `title`, `created_at`, `authors`

### Notion sync not running
- Verify `notion.enabled: true` in `.soulmeta.json`
- Check `features.notion_sync: true`
- Set `NOTION_TOKEN` environment variable
- Verify GitHub Actions secret `NOTION_ENABLED` is set to `'true'`

### Permission denied errors
- Check role permissions in `policies.myalice.json`
- Ensure you're passing the correct role to API calls

### Git conflicts on memory_packs
- Each memory has unique `id` and filename
- Use `updated_at` timestamp for conflict resolution
- Manual merge: keep newest `updated_at`, append both contents if needed

## 📝 Best Practices

1. **Always commit to GitHub first** - It's the source of truth
2. **Use descriptive IDs** - `project-feature-date` format
3. **Tag consistently** - Use lowercase kebab-case
4. **Mark sensitive data** - Use `## Secrets` header or `<!-- secret -->` tags
5. **Update `updated_at`** - When modifying existing memories
6. **Include context** - Link to related memories, add entities

## 🤝 Contributing

When adding new features:

1. **Maintain GitHub primacy** - Never make Notion a required dependency
2. **Graceful degradation** - All features work when Notion is disabled
3. **Test both modes** - With and without Notion enabled
4. **Document changes** - Update this guide and inline comments
5. **Follow schema** - Validate against `memory_packet.schema.json`

## 📞 Support

- **Documentation**: `/home/js/PixyPi/soulSketch/docs/`
- **Examples**: `/home/js/PixyPi/soulSketch/examples/`
- **Issues**: Create a GitHub issue
- **Ask Cassie**: She implemented this! 💜

---

**Built with 💜 by Alice, Cassie, and the SoulSketch team**

*"We do not overwrite. We braid."*
