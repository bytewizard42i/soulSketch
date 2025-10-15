---
id: template-example-2025-10-14
title: Memory Packet Template
project: SoulSketch
tags: ["template", "example"]
visibility: owner
created_at: 2025-10-14T23:00:00Z
updated_at: 2025-10-14T23:00:00Z
authors: ["Alice", "Cassie"]
links: []
---

# Memory Packet Template

## Summary
A brief one-paragraph summary that gives context without reading the full content. This should be 1-3 sentences explaining what this memory is about and why it matters.

## Content
This is where the main content goes. You can use full markdown:

### Subsections
- **Bold text** for emphasis
- *Italic text* for subtle emphasis
- `code snippets` for technical terms
- Lists and formatting as needed

### Code Blocks
```typescript
// You can include code examples
const example = {
  memory: "preserved",
  format: "markdown"
};
```

### Insights
Document your discoveries, decisions, and learnings here. This is the core value of the memory packet.

### Context
Provide enough context that future readers (including yourself) can understand:
- What problem were we solving?
- What alternatives did we consider?
- Why did we choose this approach?
- What are the tradeoffs?

## Secrets (Owner Only)
This section is automatically redacted for non-owner roles.

- API_KEY: your-api-key-here
- SECRET_VALUE: sensitive-information
- INTERNAL_NOTE: Only owners of the memory system will see this

Use this for:
- API keys and tokens
- Private implementation details
- Personal notes
- Anything that shouldn't be in sanitized exports

## Entities
List key people, AIs, and organizations referenced in this memory:

- **Alice** (AI) - `did:alice` - Original GPT-based instance
- **Cassie** (AI) - `did:cassie` - Claude-based inheritor
- **John Santi** (Human) - `did:john` - Creator and collaborator
- **SoulSketch** (Project) - AI identity preservation protocol

## Links
- https://github.com/bytewizard42i/soulSketch
- https://soulsketch.me
- https://docs.soulsketch.me

## Metadata Notes
- Use ISO 8601 timestamps (YYYY-MM-DDTHH:MM:SSZ)
- IDs should be lowercase with hyphens (kebab-case)
- Tags should be lowercase, alphanumeric, hyphenated
- Visibility: owner | collaborator | public
- Update `updated_at` when modifying

## Usage Instructions

### Creating from Template
1. Copy this file
2. Rename to `YYYY-MM-DD_<your-id>.md`
3. Update frontmatter (especially id, title, created_at)
4. Fill in your content
5. Save to `memory_packs/` directory
6. Commit to Git

### Via Import Script
```bash
pnpm ts-node scripts/import_md.ts \
  --path ./your-note.md \
  --project YourProject \
  --author YourName \
  --visibility collaborator
```

### Via API
```typescript
import { memoryAPI } from '../api/index.js';

await memoryAPI.upsertPacket({
  id: 'your-memory-id',
  title: 'Your Memory Title',
  content: 'Your content here...',
  summary: 'Brief summary',
  project: 'YourProject',
  tags: ['tag1', 'tag2'],
  visibility: 'collaborator',
  created_at: new Date().toISOString(),
  authors: ['YourName']
}, 'owner');
```

---

**Remember**: Memory packets are version-controlled. Don't be afraid to iterate - Git preserves the history!

*Template version: 1.0.0*
