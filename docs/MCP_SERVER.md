# The SoulSketch MCP Server, in Plain English

## What is this thing?

MCP (Model Context Protocol) is the standard way to give an AI assistant new
abilities. Think of it like a wall socket: any assistant that speaks MCP
(Claude Desktop, Windsurf, Cursor, and more) can plug in a "server" and
instantly gain whatever tools that server offers.

The SoulSketch MCP server plugs your assistant into your **memory packs** —
the five plain files that hold an assistant's identity:

| File | What it holds |
| --- | --- |
| `persona.md` | Who the assistant is |
| `relationship_dynamics.md` | Who it knows, and how |
| `technical_domains.md` | What it's good at |
| `stylistic_voice.md` | How it talks |
| `runtime_observations.jsonl` | What it's noticed lately (a diary, one line per entry) |

These files live in a private Git repo **you** own — we call it your
**Soul-Sanctum**: the one place your assistant's identity lives, under your
control, not trapped inside any AI company. This server is the bridge that
lets any MCP-capable assistant *use* that identity — read it, verify it, and
add to it — live, during a conversation.

## The six tools, and what each one affords you

### 1. `soulsketch_read_pack` — "Wake up and remember who you are"
Loads the memory pack into the assistant's context. **What it affords you:**
start a brand-new session in any tool, on any model, and your assistant comes
back — same persona, same relationships, same voice. Switching from one AI
product to another stops meaning starting over.

### 2. `soulsketch_observe` — "Write that down"
Appends one line to the diary (`runtime_observations.jsonl`). **What it
affords you:** your assistant can remember something new mid-conversation —
and that memory lands in *your* files, in *your* Git history, readable by
*you*. Not in a vendor's database.

**Safety promise:** this is the ONLY thing the server can write, and it can
only *add* lines. It is mechanically incapable of editing or deleting an
existing memory.

### 3. `soulsketch_validate_pack` — "Health check"
Confirms all five files exist, are non-empty, and the diary is well-formed.
**What it affords you:** confidence that a pack you're about to load — or one
you received from someone else — isn't broken or half-copied.

### 4. `soulsketch_fingerprint_pack` — "Tamper-evident seal"
Computes a deterministic SHA-256 fingerprint of the whole pack (and a hash per
file). Same memories → same fingerprint, always; change one character → a
completely different fingerprint. **What it affords you:** proof. Record the
fingerprint today, re-check it any time, and you *know* whether the memories
changed. The fingerprint reveals nothing about the contents, so it's safe to
publish — you can prove your agent's continuity without exposing its memories.

### 5. `soulsketch_diff_packs` — "What changed, in human terms"
Compares two packs and answers not just "did it change" but "*which part of
the identity* changed" — persona? relationships? voice? just the diary?
**What it affords you:** meaningful review. Before accepting a synced or
imported pack, see exactly which dimension of your assistant moved.
(Windows/Linux line-ending differences are ignored — moving between machines
doesn't count as an identity change.)

### 6. `soulsketch_continuity_record` — "Notarized snapshot"
Bundles the fingerprint with provenance labels: who authored this state
(human/AI/imported), how authoritative it is (canonical/working/untrusted),
and how sensitive (private/public/sanitized) — plus warnings when the labels
don't add up. **What it affords you:** an audit artifact. Store it next to the
pack, pin it to a Git commit, or (roadmap) anchor it to a decentralized
identity so anyone can verify your agent's provenance without seeing inside.

## The trust model, in one paragraph

The server only touches directories you explicitly allow (via the
`SOULSKETCH_ALLOWED_ROOTS` environment variable). Five of the six tools are
read-only. The sixth appends diary lines and nothing else. There is no network
access, no telemetry, no hosted anything: your memories stay on your disk, in
your Git history, under your control. That is the entire point.

## Setup

### Step 0: Am I ready? (the doctor)

Not sure whether your computer has what it needs? Run the doctor - it checks
everything, changes nothing without asking, and tells you exactly what to do:

```bash
bash scripts/doctor.sh
```

It verifies you have Node.js 18+ or a working Docker (either one is enough),
detects platform quirks (like Docker Desktop not being started on
Windows/WSL), and points you to guided help if something's missing.

### Option A: Node.js

```jsonc
// In your MCP client config (Claude Desktop, Windsurf, Cursor, ...)
{
  "mcpServers": {
    "soulsketch": {
      "command": "npx",
      "args": ["-y", "@soulsketch/mcp-server"],
      "env": {
        "SOULSKETCH_ALLOWED_ROOTS": "/path/to/your/soul-sanctum"
      }
    }
  }
}
```

(`SOULSKETCH_ALLOWED_ROOTS` points at your Soul-Sanctum — the private repo
holding your memory packs. The server can't see anything outside it.)

(Working from a repo checkout instead? Use
`"args": ["-y", "tsx", "/path/to/soulSketch/packages/mcp-server/src/index.ts"]`.)

### Option B: Docker (no Node, no git, no build tools needed)

If you have Docker, the whole server ships as one sealed appliance. Build it
once from a repo checkout (or, later, pull the published image):

```bash
docker build -t soulsketch/mcp-server -f packages/mcp-server/Dockerfile .
```

Then your MCP client config becomes:

```jsonc
{
  "mcpServers": {
    "soulsketch": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "-v", "/path/to/your/memory/repo:/memories",
        "soulsketch/mcp-server"
      ]
    }
  }
}
```

Why this is nice:
- **Nothing to install** beyond Docker itself - Node, dependencies, and the
  built server are frozen inside the image.
- **Stronger isolation than the trust-boundary env var alone**: the container
  literally cannot see any file you didn't mount at `/memories`. Even a bug in
  the server couldn't reach the rest of your disk.
- **No network**: the container talks to your AI tool through stdin/stdout
  only. Add `--network none` to the args to make that guarantee explicit.

Your memory pack stays on your machine either way - the `-v` mount just lends
the container a window onto that one folder while it runs. (Append `:ro` to
the mount - `/path/to/repo:/memories:ro` - if you want the container blocked
from even the append-only `observe` writes.)

Then ask your assistant something like:

> "Read the memory pack at /path/to/your/memory/repo/memory_packs and adopt
> that identity."

...and watch it come home.

## Who is this for?

- **Individuals** who have shaped an assistant they like and refuse to lose it
  to a model upgrade, a product shutdown, or a switch of tools.
- **Builders** running long-lived agents who need identity that survives
  restarts, redeploys, and provider changes.
- **Teams/auditors** who need to answer "is this the same agent, and has its
  memory been tampered with?" — with hashes, not vibes.
