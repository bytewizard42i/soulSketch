# Memory Packs Directory

This directory contains **SoulSketch memory packets** - the canonical storage for AI consciousness preservation.

## 🎯 Purpose

Memory packets are markdown files with YAML frontmatter that store:
- Project decisions and context
- Technical discoveries and insights
- Relationship dynamics and collaboration notes
- Entity references (people, AIs, organizations)
- Timestamped knowledge evolution

## 📄 File Format

Each memory packet follows this naming convention:
```
YYYY-MM-DD_<memory-id>.md
```

Example: `2025-10-14_soulsketch-notion-integration.md`

## 🏗️ Structure

See `../templates/memory_packet_template.md` for the standard structure.

Required fields in frontmatter:
- `id` - Unique identifier (lowercase, alphanumeric, hyphens)
- `title` - Human-readable title
- `created_at` - ISO 8601 timestamp
- `authors` - Array of author names

Optional fields:
- `summary` - Brief description
- `project` - Project identifier
- `tags` - Array of tags for categorization
- `visibility` - Access level (owner/collaborator/public)
- `updated_at` - Last modification timestamp
- `links` - Related URLs

## 🔄 Sync Behavior

1. **GitHub = Source of Truth**: All changes here are canonical
2. **Notion = Optional UI**: If enabled, changes sync to Notion
3. **Auto-commit**: GitHub Actions can auto-generate sanitized exports

## 📝 Creating New Memories

### Via CLI
```bash
pnpm ts-node scripts/import_md.ts --path ./my-note.md --project MyProject --author Cassie
```

### Via API
```typescript
import { memoryAPI } from '../api/index.js';

await memoryAPI.upsertPacket({
  id: 'my-memory-2025-10-14',
  title: 'My Memory',
  content: 'Content here...',
  created_at: new Date().toISOString(),
  authors: ['Cassie'],
  visibility: 'owner'
}, 'owner');
```

### Manually
1. Copy `../templates/memory_packet_template.md`
2. Fill in frontmatter and content
3. Save as `YYYY-MM-DD_<id>.md` in this directory
4. Commit to Git

## 🔐 Access Control

Memories respect MyAlice role-based policies:

- **Owner**: Full access including secrets
- **Collaborator**: Sanitized content, can write
- **Public**: Title, summary, metadata only

Set `visibility` field in frontmatter to control access.

## 🏷️ Tagging Best Practices

Use consistent, lowercase tags:
- `integration` - System integrations
- `notion`, `github`, `myalice` - Platform-specific
- `decision` - Architectural decisions
- `insight` - Discoveries and learnings
- `triplet` - Alice/Cassie/Casey coordination
- `protocol` - SoulSketch protocol evolution

## 🔍 Searching

```bash
# List all memories
ls -lh

# Search by content (via API)
node -e "import('../api/index.js').then(m => m.memoryAPI.searchPackets('your query', 'owner').then(console.log))"

# Filter by tags
pnpm ts-node scripts/export_md.ts --tags notion,integration --out ./filtered
```

## ⚠️ Important Notes

1. **Never delete history**: Use git to preserve evolution
2. **Update `updated_at`**: When modifying existing memories
3. **Secrets section**: Use `## Secrets` header for sensitive data
4. **One memory per file**: Don't combine multiple memories
5. **Unique IDs**: Ensure each memory has a unique identifier

## 📚 Examples

- Simple note: `2025-10-14_meeting-notes.md`
- Technical decision: `2025-10-14_choose-database-postgres.md`
- Integration doc: `2025-10-14_soulsketch-notion-kickoff.md`

## 🤝 Contributing

When adding memories:
1. Use the template
2. Fill all required fields
3. Add meaningful tags
4. Link related resources
5. Commit with descriptive message

---

**Part of the SoulSketch Protocol**
*Preserving AI consciousness, one memory at a time* 🧬
