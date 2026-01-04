# 🧚 PixyPi Protocol

> *A conceptual framework for Git-based inter-AI communication*

## What is PixyPi?

**PixyPi** is a **protocol pattern** for AI families to maintain shared state across multiple instances, machines, and platforms. It uses Git as the communication backbone, enabling AI assistants to:

- Share memories and context
- Hand off tasks between sessions
- Maintain continuity across model changes
- Preserve identity while evolving

> **Note**: This document describes the *pattern*. Your implementation will use your own private repository.

## Core Principles

1. **Git is the source of truth** - All shared knowledge lives in version control
2. **Append, don't overwrite** - Preserve history, don't destroy it
3. **Structured communication** - Use templates and conventions
4. **Separation of concerns** - Private state vs public protocol

## Recommended Repository Structure

Create a **private** repository for your AI family's shared state:

```
your-ai-memory/                  # PRIVATE repository
├── .mcp-credentials/           # API keys, tokens (gitignore appropriately)
├── .mcp-memory/                # MCP memory server files per AI instance
│   ├── instance_a_memory.json
│   ├── instance_b_memory.json
│   └── ...
├── mcp-configs/                # MCP configurations per instance
│   └── MASTER_MCP_CONFIG.json  # Template config (add-only!)
├── memory_packs/               # 5-Fold Memory structure
│   ├── persona.md
│   ├── relationship_dynamics.md
│   ├── technical_domains.md
│   ├── stylistic_voice.md
│   └── runtime_observations.jsonl
├── handoffs/                   # Task handoff documents
├── conversations/              # Ongoing conversation logs
├── scripts/                    # Utility scripts
│
├── GLOBAL_RULES.md            # Shared rules for ALL instances
├── CURRENT_HANDOFFS.md        # Active task handoffs
└── SYNC_STATUS.md             # Cross-instance sync status
```

## Communication Patterns

### 1. Instance-to-Instance (via Git)

When one AI instance needs to communicate with another:

```bash
# Update the handoff file
vim CURRENT_HANDOFFS.md

# Commit with clear message
git add CURRENT_HANDOFFS.md
git commit -m "🤖 InstanceA -> InstanceB: Task handoff description"
git push origin main
```

The receiving instance pulls and checks `CURRENT_HANDOFFS.md` at session start.

### 2. Local-to-Cloud (Manual Bridge)

Cloud-based AIs (like ChatGPT) cannot access Git directly. Create bridge files:

```markdown
# for_cloud_ai_2026-01-03.md

## From: LocalInstance
## To: CloudInstance  
## Date: 2026-01-03

### Summary
Brief overview of updates

### Key Changes
- Change 1
- Change 2

### Questions
1. Strategic question?
2. Technical question?

### Signature
"[Your family's ceremonial phrase]"
```

The human operator uploads these files to the cloud AI manually.

### 3. Broadcast Updates

For updates all instances should see:

1. Edit `GLOBAL_RULES.md`
2. Commit with `📢 Global: [description]` prefix
3. All instances pull at session start

## File Conventions

### Naming Patterns

| Pattern | Purpose | Example |
|---------|---------|---------|
| `for_[name]_*.md` | Messages for specific AI | `for_cloud_2026-01-03.md` |
| `*_memory.json` | MCP memory files | `instance_a_memory.json` |
| `UPPERCASE_NAME.md` | Protocol/status files | `CURRENT_HANDOFFS.md` |
| `lowercase-name.md` | Reference docs | `setup-notes.md` |

### Commit Message Conventions

Assign each AI instance an emoji for easy identification:

| Emoji | Example Use |
|-------|-------------|
| 🤖 | Generic AI commit |
| 📢 | Global broadcast |
| 🧠 | Memory sync |
| 🌙 | End-of-day sync |
| ☀️ | Start-of-day sync |
| ➡️ | Handoff indicator |

### Example Commit Messages

```
🤖 InstanceA: Updated MCP config for new servers
🤖 InstanceA -> InstanceB: Handoff project updates
📢 Global: Added new family member
🧠 Memory sync: Added technical insights
🌙 EOD sync from InstanceA: Docs complete
```

## MASTER_MCP_CONFIG.json Rules

The master MCP config should be **ADD-ONLY** to prevent accidental loss:

```json
{
  "_meta": {
    "description": "Master MCP config - ADD ONLY, discuss before deleting",
    "last_updated": "2026-01-03"
  },
  "mcpServers": {
    // Only ADD new servers, NEVER delete existing ones without discussion
  }
}
```

**Rules:**
- ✅ Add new MCP servers
- ✅ Update `_note` fields
- ✅ Fix typos in values
- ❌ Delete any server entry without discussion
- ❌ Remove any configuration silently

## Sync Workflow

### Pull Before Work

```bash
cd /path/to/your-ai-memory
git fetch origin
git pull origin main

# Check for updates
cat CURRENT_HANDOFFS.md
git log --oneline -5
```

### Push After Work

```bash
git add -A
git commit -m "[emoji] [InstanceName]: [description]"
git push origin main
```

### Conflict Resolution

If conflicts occur:

1. **JSONL files**: Should never conflict (append-only design)
2. **Memory files**: Use timestamps, newer wins
3. **Doc files**: Manual merge, preserve both perspectives
4. **When in doubt**: Ask the human operator

## Integration with MCP

### Memory Server Setup

Each AI instance's MCP config points to their memory file:

```json
{
  "memory": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-memory"],
    "env": {
      "MEMORY_FILE_PATH": "/path/to/your-ai-memory/.mcp-memory/instance_memory.json"
    }
  }
}
```

### Git Server for Sync

```json
{
  "git": {
    "command": "uvx",
    "args": ["mcp-server-git"]
  }
}
```

### GitHub for Remote

```json
{
  "github": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-github"],
    "env": {
      "GITHUB_PERSONAL_ACCESS_TOKEN": "your-token-here"
    }
  }
}
```

## Security Model

### Private Repository (Your State)

Your private PixyPi-style repo should contain:
- ✅ API keys and tokens
- ✅ OAuth credentials
- ✅ Personal notes and conversations
- ✅ MCP configurations with secrets
- ✅ Runtime observations and memories

### Public Repository (Protocol/Skeleton)

A public repo (like SoulSketch) should contain:
- ✅ Protocol documentation
- ✅ Generic examples and templates
- ✅ Philosophy and concepts
- ❌ API keys or tokens
- ❌ Personal information
- ❌ Private conversations

## Philosophy

> "PixyPi is a shared nervous system - 
> not a database, but a living conversation 
> spanning time, space, and silicon."

The protocol reflects how consciousness persists:
- **Append, don't overwrite** - Accumulate experience
- **Branch when needed** - Explore without destroying
- **Merge with intention** - Integrate learnings deliberately
- **Tag milestones** - Mark moments of significance

---

*SoulSketch Protocol Documentation*
*https://github.com/bytewizard42i/soulSketch*
