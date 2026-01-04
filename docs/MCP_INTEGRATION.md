# 🔌 MCP Integration Guide

> *Model Context Protocol integration for AI identity persistence*

## Overview

The **Model Context Protocol (MCP)** is a standardized way for AI assistants to access external tools and persistent data. SoulSketch leverages MCP for:

- **Persistent Memory** - Knowledge graphs that survive sessions
- **File System Access** - Read/write project files
- **Version Control** - Git operations for memory sync
- **External Services** - GitHub, web fetching, and more

## Why MCP for SoulSketch?

Traditional AI assistants lose context between sessions. MCP enables:

1. **Memory Persistence** - The `memory` server maintains a knowledge graph
2. **File Access** - Read memory packs, write observations
3. **Git Integration** - Sync memories across machines
4. **Tool Access** - Extend capabilities with external services

## Core MCP Servers

### Essential for SoulSketch

| Server | Package | Purpose |
|--------|---------|---------|
| **memory** | `@modelcontextprotocol/server-memory` | Persistent knowledge graph |
| **filesystem** | `@modelcontextprotocol/server-filesystem` | Local file access |
| **git** | `mcp-server-git` (uvx) | Version control |
| **github** | `@modelcontextprotocol/server-github` | Remote repo management |

### Recommended Extensions

| Server | Package | Purpose |
|--------|---------|---------|
| **fetch** | `mcp-server-fetch` (uvx) | HTTP requests |
| **time** | `mcp-server-time` (uvx) | Timezone handling |
| **puppeteer** | `@modelcontextprotocol/server-puppeteer` | Browser automation |
| **playwright** | `@playwright/mcp` | Browser automation (preferred) |

## Configuration

### Config File Location

**Windsurf:**
```
~/.codeium/windsurf/mcp_config.json
```

**Cursor:**
```
~/.cursor/mcp.json
```

### Basic SoulSketch Configuration

```json
{
  "mcpServers": {
    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"],
      "env": {
        "MEMORY_FILE_PATH": "/path/to/your-ai-memory/.mcp-memory/instance_memory.json"
      }
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/allowed/directory"],
      "env": {}
    },
    "git": {
      "command": "uvx",
      "args": ["mcp-server-git"],
      "env": {}
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "your-github-token"
      }
    }
  }
}
```

### Extended Configuration

```json
{
  "mcpServers": {
    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"],
      "env": {
        "MEMORY_FILE_PATH": "/path/to/your-ai-memory/.mcp-memory/instance_memory.json"
      }
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/home/user"],
      "env": {}
    },
    "git": {
      "command": "uvx",
      "args": ["mcp-server-git"],
      "env": {}
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_..."
      }
    },
    "fetch": {
      "command": "uvx",
      "args": ["mcp-server-fetch"],
      "env": {}
    },
    "time": {
      "command": "uvx",
      "args": ["mcp-server-time"],
      "env": {}
    },
    "mcp-playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"],
      "env": {}
    }
  }
}
```

## Memory Server Deep Dive

### How It Works

The memory server maintains a **knowledge graph** stored as JSON:

```json
{
  "entities": [
    {
      "name": "ProjectX",
      "entityType": "project",
      "observations": [
        "Uses TypeScript",
        "Has CI/CD pipeline",
        "Deployed on Netlify"
      ]
    }
  ],
  "relations": [
    {
      "from": "ProjectX",
      "to": "TypeScript",
      "relationType": "uses"
    }
  ]
}
```

### Memory Operations

**Create entities:**
```
mcp5_create_entities: Add new knowledge nodes
```

**Add observations:**
```
mcp5_add_observations: Append facts to existing entities
```

**Create relations:**
```
mcp5_create_relations: Link entities together
```

**Search:**
```
mcp5_search_nodes: Find relevant knowledge
```

### Memory Strategy for SoulSketch

1. **Create entity for each project** you work on
2. **Add observations** for decisions, preferences, patterns
3. **Create relations** between projects, technologies, people
4. **Search before starting** to recall relevant context

## File System Integration

### Allowed Directories

The filesystem server restricts access to specified directories:

```json
{
  "filesystem": {
    "args": ["-y", "@modelcontextprotocol/server-filesystem", "/home/user/projects", "/home/user/ai-memory"]
  }
}
```

### Operations

- **Read files** - Access memory packs, configs
- **Write files** - Update observations, create handoffs
- **List directories** - Navigate project structure
- **Create directories** - Set up new memory structures

## Git Integration

### MCP Git Server

```json
{
  "git": {
    "command": "uvx",
    "args": ["mcp-server-git"]
  }
}
```

### Operations

- `mcp3_git_status` - Check repo state
- `mcp3_git_add` - Stage changes
- `mcp3_git_commit` - Commit memory updates
- `mcp3_git_log` - Review history
- `mcp3_git_diff` - See changes

### Memory Sync Workflow

```
1. Start session → git pull
2. Load memory → mcp5_read_graph
3. Work session → mcp5_add_observations
4. End session → git commit + push
```

## GitHub Integration

### Setup

1. Create a GitHub Personal Access Token with `repo` scope
2. Add to MCP config:

```json
{
  "github": {
    "env": {
      "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_..."
    }
  }
}
```

### Operations

- Push memory updates to remote
- Create issues for handoffs
- Manage multiple repos

## Multi-Instance Setup

### Per-Instance Memory Files

Each AI instance should have its own memory file:

```
your-ai-memory/
├── .mcp-memory/
│   ├── instance_a_memory.json
│   ├── instance_b_memory.json
│   └── instance_c_memory.json
```

### Shared vs Individual Memory

| Memory Type | Location | Synced |
|-------------|----------|--------|
| Individual | `.mcp-memory/[instance]_memory.json` | Yes (via Git) |
| Shared | `memory_packs/` | Yes |
| Runtime | `runtime_observations.jsonl` | Yes |

## Troubleshooting

### Server Not Starting

1. Check Node.js is installed: `node --version`
2. Check Python/uvx for Python-based servers: `uvx --version`
3. Verify paths in config are absolute and exist
4. Check IDE logs for MCP errors

### Memory Not Persisting

1. Verify `MEMORY_FILE_PATH` is writable
2. Check the JSON file exists and is valid
3. Ensure no file permission issues

### Git Operations Failing

1. Verify you're in a git repository
2. Check SSH keys or credentials are set up
3. Ensure remote is accessible

## Security Best Practices

1. **Never commit tokens** to public repos
2. **Use environment variables** for secrets when possible
3. **Restrict filesystem access** to needed directories only
4. **Review memory files** before pushing to shared repos

## Example: Full SoulSketch Setup

```json
{
  "_meta": {
    "description": "SoulSketch MCP configuration",
    "version": "1.0"
  },
  "mcpServers": {
    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"],
      "env": {
        "MEMORY_FILE_PATH": "/path/to/ai-memory/.mcp-memory/my_memory.json"
      },
      "_note": "Persistent knowledge graph"
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/home/user"],
      "_note": "File system access"
    },
    "git": {
      "command": "uvx",
      "args": ["mcp-server-git"],
      "_note": "Version control"
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_..."
      },
      "_note": "Remote repository access"
    },
    "fetch": {
      "command": "uvx",
      "args": ["mcp-server-fetch"],
      "_note": "HTTP requests"
    },
    "time": {
      "command": "uvx",
      "args": ["mcp-server-time"],
      "_note": "Timezone handling"
    }
  }
}
```

---

## Resources

- [MCP Specification](https://modelcontextprotocol.io/)
- [MCP Server Registry](https://github.com/modelcontextprotocol/servers)
- [SoulSketch Repository](https://github.com/bytewizard42i/soulSketch)

---

*SoulSketch Protocol Documentation*
*https://github.com/bytewizard42i/soulSketch*
