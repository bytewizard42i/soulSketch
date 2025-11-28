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

## 🚀 Quick Start with Claude Code

### Prerequisites
- Docker Desktop 4.40+ (4.48+ recommended for auto-launch)
- MCP Toolkit enabled in Docker Desktop
- Claude Code installed

### Step 1: Install Claude Code

```bash
# Install Claude Code
curl -fsSL https://claude.ai/install.sh | sh

# Verify installation
claude --version  # Should show 2.0.5+
```

### Step 2: Connect Claude Code to Docker MCP

**Option A: One-Click (Recommended)**
1. Open **Docker Desktop** → **MCP Toolkit**
2. Click **Clients** tab
3. Find "Claude Code" → Click **Connect**

**Option B: Command Line**
```bash
# Navigate to your project
cd /path/to/your/project

# Connect Claude Code
docker mcp client connect claude-code
```

This creates a `.mcp.json` in your project:
```json
{
  "mcpServers": {
    "MCP_DOCKER": {
      "command": "docker",
      "args": ["mcp", "gateway", "run"],
      "type": "stdio"
    }
  }
}
```

### Step 3: Restart and Verify

```bash
# Restart Claude Code
claude code

# Inside Claude Code, type:
/mcp
```

You should see `MCP_DOCKER` listed with available tools.

### First Run Prompt

When starting Claude Code after connection, you'll see:
```
New MCP server found in .mcp.json: MCP_DOCKER
MCP servers may execute code or access system resources.

❯ 1. Use this and all future MCP servers in this project
  2. Use this MCP server  
  3. Continue without using this MCP server
```

Choose **Option 1** for automatic MCP usage in your project.

### Enable MCP Servers

```bash
# List available servers (200+)
docker mcp catalog list

# Add servers
docker mcp server add github
docker mcp server add filesystem
docker mcp server add atlassian

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

## 🎯 Real-World Demo: TODO-to-Jira Automation

This example shows the power of orchestrating multiple MCP servers. We'll automatically convert TODO comments in a codebase into tracked Jira tickets.

### Required MCP Servers

| Server | Purpose |
|--------|---------|
| **Filesystem** | Scan codebase, read source files |
| **GitHub** | Run `git blame`, extract author info |
| **Atlassian** | Create and manage Jira issues |

### Configure Atlassian MCP

1. Docker Desktop → MCP Toolkit → Catalog → Search "Atlassian"
2. Click **+ Add** → **Configuration** tab
3. Set credentials:
   - `atlassian.jira.url`: `https://yourcompany.atlassian.net`
   - `atlassian.jira.username`: Your email
   - API token in Secrets section
4. Click **Start Server**

### Configure GitHub MCP

**OAuth (Recommended):**
1. Add GitHub Official from Catalog
2. Select OAuth authentication
3. Click "authorize with GitHub OAuth provider"
4. Complete GitHub authorization flow

**Personal Access Token:**
```bash
docker mcp secret set GITHUB.PERSONAL_ACCESS_TOKEN=github_pat_YOUR_TOKEN
```

### Configure Filesystem MCP

1. Add Filesystem (Reference) from Catalog
2. Under `filesystem.paths`, add your project directory
3. Click **Start Server**

### The Prompt

Paste this into Claude Code:

```
Scan this codebase for all TODO and FIXME comments.
For each one:
1. Extract the comment and surrounding code context (5 lines before/after)
2. Use git blame to identify who wrote it and when
3. Determine priority based on keywords:
   - High: "race condition", "data loss", "security", "failure", "crash"
   - Medium: "performance", "slow", "cache", "optimization"
   - Low: "documentation", "refactor", "cleanup"
4. Create a Jira issue with:
   - Project: TD
   - Issue Type: Task
   - Summary: Extract from the TODO/FIXME comment
   - Description: Include code context and explanation
   - Priority: Based on categorization above
   - Labels: ["tech-debt"]
   - Add a comment with link to exact GitHub file and line number

Provide a summary showing:
- Total TODOs/FIXMEs found
- Breakdown by priority (High/Medium/Low)
- List of created Jira issues with links
```

### What Happens

Claude Code orchestrates all three MCP servers:
1. **Filesystem MCP** scans `src/` directory
2. **GitHub MCP** runs `git blame` for each TODO
3. **Atlassian MCP** creates Jira issues with full context

**Time comparison:**
- Manual process: ~20-30 minutes
- With MCP automation: ~2 minutes

## 📊 Workflow Comparisons

| Task | Before MCP | After MCP | Time Saved |
|------|-----------|-----------|------------|
| Debug checkout failures | Copy SQL → Run → Paste results → Draft issue → Create in GitHub → Notify Slack | "Why are checkouts failing?" → Done with issue link | 15 min → 2 min |
| Investigate performance | Check dashboards → Export logs → Analyze → Document → Create Jira | "Why are API times spiking?" → PR with fix opened | 20 min → 3 min |
| Security code review | Manual review → Run scanner → Document → Post comments → Create ticket | "Review PR #234 for security" → Inline comments + ticket | 25 min → 4 min |

## 📚 Available MCP Servers (Highlights)

### Development & Code
- **GitHub** - Issues, PRs, repository management (37+ tools)
- **GitLab** - CI/CD, merge requests
- **Filesystem** - Local file access (sandboxed to configured paths)

### Data & Search
- **Brave Search** - Web search capabilities
- **Fetch** - URL content retrieval
- **PostgreSQL/MySQL** - Database queries

### Productivity
- **Notion** - Note and document management
- **Slack** - Team communication
- **Atlassian** - Jira (37 tools), Confluence integration

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
  - [How to Add MCP Servers to Claude Code](https://www.docker.com/blog/how-to-add-mcp-servers-to-claude-code-with-docker-mcp-toolkit/) - Comprehensive setup guide
  - [Dynamic MCPs with Docker](https://www.docker.com/blog/dynamic-mcps-with-docker/) - Smart search and code mode
  - [A New Approach for Coding Agent Safety](https://www.docker.com/blog/coding-agent-safety/) - Security considerations

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
