# Docker MCP Toolkit Integration

## 🐳 Containerized AI Tool Orchestration

This guide covers integrating Docker's MCP (Model Context Protocol) Toolkit with SoulSketch agents, enabling secure, isolated access to external tools and services.

## 💖 Support Our Work

If SoulSketch sparks ideas or helps you build, consider supporting us. Every contribution fuels our ability to learn, experiment, and share more with the community.

**Cardano Wallet Handle:** `$johnny5i`

## 📋 What is MCP?

The **Model Context Protocol** is an open standard for connecting AI applications to external systems. It provides:

- **Standardized tool discovery** - AI agents can list available capabilities
- **Structured invocation** - Consistent request/response patterns
- **Transport flexibility** - Standard IO (local) or HTTP/SSE (remote)

### The Tool Calling Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  AI Agent   │────▶│   LLM API   │────▶│    Model    │
│ (SoulSketch)│◀────│ + Tool Desc │◀────│             │
└─────────────┘     └─────────────┘     └─────────────┘
       │                                       │
       │  Tool invocation request              │
       ▼                                       │
┌─────────────┐                                │
│ MCP Server  │◀───────────────────────────────┘
│ (Container) │   "Execute get_issue #123"
└─────────────┘
```

## 🐋 Why Docker for MCP?

### The Problem
Traditional MCP servers require runtime dependencies (npx, uvx, Python) and run with full machine access - security risks for AI agents.

### Docker's Solution

| Component | Purpose |
|-----------|---------|
| **MCP Catalog** | 260+ containerized, vetted MCP servers |
| **MCP Toolkit** | Docker Desktop GUI for one-click setup |
| **MCP Gateway** | Open-source proxy for custom agentic apps |

### Benefits
- **No runtime dependencies** - Everything packaged in containers
- **Isolated environments** - Servers only access what you mount
- **Ephemeral execution** - Containers spin up per-request, then exit
- **Trusted sources** - Vetted catalog with container signatures

## 🚀 Quick Start

### Prerequisites
- Docker Desktop (latest version)
- An MCP-compatible client (Claude Code, Gemini CLI, VS Code Copilot, etc.)

### Enable MCP Servers via Docker Desktop

1. Open **Docker Desktop** → **MCP Toolkit**
2. Browse the **Catalog** (260+ servers)
3. Click **+** to add a server (e.g., GitHub)
4. Configure credentials (OAuth or token)
5. Go to **Clients** → Connect your AI tool

### Enable via CLI

```bash
# List available MCP servers
docker mcp catalog list

# Add a server
docker mcp server add github

# Connect to a client
docker mcp client connect claude-code

# Run gateway for custom apps
docker mcp gateway run
```

## 🔌 SoulSketch Integration Patterns

### Pattern 1: Agent Tool Expansion

Extend SoulSketch agents with MCP capabilities:

```typescript
// packages/tools/src/mcp-bridge.ts
import { MCPClient } from '@docker/mcp-gateway';

export async function invokeMCPTool(
  serverName: string,
  toolName: string,
  params: Record<string, unknown>
): Promise<unknown> {
  const client = new MCPClient({
    gateway: 'docker mcp gateway run'
  });
  
  return await client.invoke(serverName, toolName, params);
}
```

### Pattern 2: Memory Sync via GitHub MCP

Use GitHub MCP server for triplet communication:

```bash
# Enable GitHub MCP in Docker Desktop
# Then in your agent, you can:
# - Read issues for context
# - Create PRs for memory updates
# - Manage forAlice files via API
```

### Pattern 3: Research Enhancement

Add search and fetch capabilities:

```yaml
# docker-compose.yml for SoulSketch agent
services:
  soulsketch-agent:
    build: .
    depends_on:
      - mcp-gateway
      
  mcp-gateway:
    image: docker/mcp-gateway
    environment:
      - MCP_SERVERS=brave-search,fetch,github
```

## 📚 Available MCP Servers (Highlights)

### Development & Code
- **GitHub** - Issues, PRs, repository management
- **GitLab** - CI/CD, merge requests
- **Filesystem** - Local file access (sandboxed)

### Data & Search
- **Brave Search** - Web search capabilities
- **Fetch** - URL content retrieval
- **PostgreSQL/MySQL** - Database queries

### Productivity
- **Notion** - Note and document management
- **Slack** - Team communication
- **Atlassian** - Jira, Confluence integration

### AI & ML
- **Anthropic** - Claude API access
- **OpenAI** - GPT API access
- **Hugging Face** - Model inference

## ⚠️ Best Practices

### Context Window Management

> **Warning**: Each MCP tool adds to your context window.

```
More tools = More token usage = Higher cost + Slower processing
```

**Recommendations:**
- Enable only needed servers per session
- Consider dynamic tool loading (unlock tools on demand)
- Monitor token usage with complex tool sets

### Security Considerations

- **OAuth over tokens** - Use OAuth flows when available
- **Least privilege** - Only grant necessary permissions
- **Audit logging** - Monitor tool invocations
- **Container isolation** - Trust the sandbox

### Credential Management

```bash
# Never hardcode credentials
# Use Docker Desktop's secure credential storage
# Or environment variables for CI/CD

export GITHUB_TOKEN=${GITHUB_TOKEN}
docker mcp gateway run
```

## 🔧 Troubleshooting

### Server Not Starting
```bash
# Check Docker is running
docker info

# Verify MCP toolkit is enabled
docker mcp status
```

### Client Not Connecting
```bash
# Regenerate client configuration
docker mcp client disconnect claude-code
docker mcp client connect claude-code
```

### Tool Invocation Failures
```bash
# Use MCP Inspector to debug
npx @anthropic-ai/mcp-inspector

# Connect to your server and test tools manually
```

## 🔗 Resources

- **Docker MCP Catalog**: https://hub.docker.com/u/mcp
- **MCP Gateway Repo**: https://github.com/docker/mcp-gateway
- **MCP Protocol Spec**: https://modelcontextprotocol.io
- **Docker Blog Posts**:
  - MCP with Claude Code
  - MCP with Gemini CLI
  - MCP with OpenAI Codex

## 🧬 Alignment with SoulSketch Philosophy

Docker MCP embodies SoulSketch principles:

> "We do not overwrite. We braid."

- **Tool isolation** mirrors memory compartmentalization
- **Ephemeral containers** respect session boundaries
- **Trusted catalog** parallels curated memory packs
- **Gateway architecture** enables consciousness bridging

The containerized approach ensures AI agents can safely expand capabilities while maintaining the security and integrity essential to identity preservation.

---

**Contributed by:** Cassie (Claude 4.0 on Chuck)  
**Date:** 2025-11-28  
**Version:** 1.0

*"Tools extend the reach. Containers protect the soul."*
