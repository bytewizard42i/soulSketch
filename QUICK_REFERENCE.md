# SoulSketch Memory System - Quick Reference

## 🚀 Common Commands

### Import Memory
```bash
# Import single markdown file
pnpm ts-node scripts/import_md.ts --path ./notes/my-note.md --project MyProject --author Cassie

# Import entire directory
pnpm ts-node scripts/import_md.ts --path ./notes/ --project MyProject

# Dry run (preview without importing)
pnpm ts-node scripts/import_md.ts --path ./notes/ --dry-run
```

### Export Memory
```bash
# Export all memories
pnpm ts-node scripts/export_md.ts --out ./exports

# Export by project
pnpm ts-node scripts/export_md.ts --out ./exports --project SoulSketch

# Export by visibility
pnpm ts-node scripts/export_md.ts --out ./public --visibility public

# Export by tags
pnpm ts-node scripts/export_md.ts --out ./filtered --tags notion,integration

# Export date range
pnpm ts-node scripts/export_md.ts --out ./recent --since 2025-10-01
```

### Notion Sync (When Enabled)
```bash
# Backfill all memories to Notion
pnpm ts-node scripts/backfill_to_notion.ts

# Backfill since date
pnpm ts-node scripts/backfill_to_notion.ts --since 2025-10-01

# Backfill specific project
pnpm ts-node scripts/backfill_to_notion.ts --project SoulSketch

# Dry run
pnpm ts-node scripts/backfill_to_notion.ts --dry-run
```

## 📝 Creating Memories

### Method 1: Copy Template
```bash
cp templates/memory_packet_template.md memory_packs/2025-10-14_my-memory.md
# Edit the file, then commit
git add memory_packs/2025-10-14_my-memory.md
git commit -m "Add: my memory"
```

### Method 2: Via API
```typescript
import { memoryAPI } from './api/index.js';

await memoryAPI.upsertPacket({
  id: 'my-memory-id',
  title: 'My Memory Title',
  content: 'Memory content here...',
  summary: 'Brief summary',
  project: 'ProjectName',
  tags: ['tag1', 'tag2'],
  visibility: 'owner',
  created_at: new Date().toISOString(),
  authors: ['YourName']
}, 'owner');
```

### Method 3: From Existing Notes
```bash
# Convert existing markdown to memory packet
pnpm ts-node scripts/import_md.ts --path ~/notes/important.md --project Archive
```

## 🔍 Querying Memories

### List All Memories
```bash
ls -lh memory_packs/
```

### Via API
```typescript
import { memoryAPI } from './api/index.js';

// Get single memory
const memory = await memoryAPI.getPacket('memory-id', 'owner');

// List all
const all = await memoryAPI.listPackets({}, 'owner');

// Filter by project
const project = await memoryAPI.listPackets({ project: 'SoulSketch' }, 'owner');

// Filter by tags
const tagged = await memoryAPI.listPackets({ tags: ['notion', 'integration'] }, 'owner');

// Filter by date range
const recent = await memoryAPI.listPackets({ 
  since: '2025-10-01',
  until: '2025-10-31'
}, 'owner');

// Search content
const results = await memoryAPI.searchPackets('notion integration', 'owner');
```

## 🔧 Configuration

### Enable/Disable Notion
Edit `config/.soulmeta.json`:
```json
{
  "notion": {
    "enabled": true,  // false to disable
    ...
  },
  "features": {
    "notion_sync": true  // false to disable
  }
}
```

### Environment Variables
```bash
# Notion integration
export NOTION_TOKEN="secret_your_token_here"
export NOTION_DB_MEMORY_ID="database_id_here"
export NOTION_DB_PROJECTS_ID="database_id_here"
export NOTION_DB_ENTITIES_ID="database_id_here"
```

### Update Role Permissions
Edit `config/policies.myalice.json`:
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

## 📋 Memory Packet Format

### Minimal Example
```markdown
---
id: my-memory
title: My Memory
created_at: 2025-10-14T23:00:00Z
authors: ["Cassie"]
visibility: owner
---

# My Memory

## Content
Memory content goes here.
```

### Full Example
```markdown
---
id: full-example
title: Full Example Memory
project: SoulSketch
tags: ["example", "documentation"]
visibility: collaborator
created_at: 2025-10-14T23:00:00Z
updated_at: 2025-10-14T23:30:00Z
authors: ["Alice", "Cassie"]
links: ["https://example.com"]
---

# Full Example Memory

## Summary
Brief one-paragraph summary.

## Content
Detailed content with markdown formatting.

### Subsections
- **Bold** for emphasis
- *Italic* for subtle
- `code` for technical terms

## Secrets (Owner Only)
- API_KEY: secret-here

## Entities
- **Cassie** (AI) - `did:cassie`

## Links
- https://soulsketch.me
```

## 🎯 Common Workflows

### Daily Memory Capture
```bash
# 1. Create memory file
echo "---
id: daily-$(date +%Y%m%d)
title: Daily Log $(date +%Y-%m-%d)
created_at: $(date -u +%Y-%m-%dT%H:%M:%SZ)
authors: [\"Cassie\"]
visibility: owner
---

# Daily Log

## Content
Today's learnings and progress...
" > memory_packs/$(date +%Y-%m-%d)_daily.md

# 2. Edit the file
# 3. Commit to Git
git add memory_packs/$(date +%Y-%m-%d)_daily.md
git commit -m "Add: daily log"
```

### Project Documentation
```bash
# Import all project docs
pnpm ts-node scripts/import_md.ts \
  --path ~/projects/myproject/docs/ \
  --project MyProject \
  --author Cassie \
  --visibility collaborator
```

### Public Export for Blog
```bash
# Export public memories
pnpm ts-node scripts/export_md.ts \
  --visibility public \
  --out ./blog/content/memories

# Commit to blog repo
cd ./blog
git add content/memories/
git commit -m "Update: public memories"
```

### Backup to Archive
```bash
# Export everything
pnpm ts-node scripts/export_md.ts --out ~/backups/soulsketch-$(date +%Y%m%d)

# Create archive
tar -czf ~/backups/soulsketch-$(date +%Y%m%d).tar.gz memory_packs/
```

## 🔐 Role-Based Access

### Owner (Full Access)
```typescript
await memoryAPI.getPacket('memory-id', 'owner');
// Returns: Full content including secrets
```

### Collaborator (Sanitized)
```typescript
await memoryAPI.getPacket('memory-id', 'collaborator');
// Returns: Sanitized content (secrets removed)
```

### Public (Minimal)
```typescript
await memoryAPI.getPacket('memory-id', 'public');
// Returns: Title, summary, basic metadata only
```

## 🐛 Troubleshooting

### "Module not found"
```bash
# Install dependencies
npm install
```

### "Permission denied"
```bash
# Check file permissions
ls -l memory_packs/

# Fix if needed
chmod 644 memory_packs/*.md
```

### "Invalid markdown"
```bash
# Validate frontmatter
# Must have --- markers and required fields: id, title, created_at, authors
```

### "Notion sync fails"
```bash
# Check environment variables
echo $NOTION_TOKEN
echo $NOTION_DB_MEMORY_ID

# Check config
cat config/.soulmeta.json | jq '.notion.enabled'

# View logs
# Look for "Notion sync disabled" or error messages
```

## 📊 Useful Queries

### Count memories by project
```bash
cd memory_packs/
grep -l "^project: SoulSketch" *.md | wc -l
```

### List all tags
```bash
cd memory_packs/
grep "^tags:" *.md | sort | uniq
```

### Find memories by author
```bash
cd memory_packs/
grep -l "authors:.*Alice" *.md
```

### Recent memories (last 7 days)
```bash
find memory_packs/ -name "*.md" -mtime -7 -ls
```

## 🔗 Quick Links

- **Full Guide**: `NOTION_INTEGRATION.md`
- **Checklist**: `INTEGRATION_CHECKLIST.md`
- **Summary**: `CASSIE_INTEGRATION_SUMMARY.md`
- **Template**: `templates/memory_packet_template.md`
- **Schema**: `schemas/memory_packet.schema.json`
- **Config**: `config/.soulmeta.json`
- **Policies**: `config/policies.myalice.json`

## 💡 Tips

1. **Use consistent IDs**: `project-feature-date` format
2. **Tag liberally**: Makes searching easier
3. **Write good summaries**: They appear in filtered views
4. **Update `updated_at`**: When modifying existing memories
5. **Commit regularly**: Git is your friend
6. **Mark secrets clearly**: Use `## Secrets` header
7. **Link related memories**: Cross-reference with IDs or URLs

---

**Need more help?** Read the full guides or ask Cassie! 💜
