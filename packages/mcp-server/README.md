# @soulsketch/mcp-server

MCP server for the [SoulSketch Protocol](https://github.com/bytewizard42i/soulSketch):
gives any MCP-capable AI client (Claude Desktop, Windsurf, Cursor, …) tools to
read, verify, and append to portable, user-owned AI memory packs.

## The six tools

| Tool | In plain English |
| --- | --- |
| `soulsketch_read_pack` | "Wake up and remember who you are" — load an identity |
| `soulsketch_observe` | "Write that down" — append one diary line (the only write) |
| `soulsketch_validate_pack` | Health-check a 5-file memory pack |
| `soulsketch_fingerprint_pack` | Tamper-evident SHA-256 seal of the pack state |
| `soulsketch_diff_packs` | Which identity dimension changed between two packs |
| `soulsketch_continuity_record` | Notarized snapshot: fingerprint + provenance labels |

## Setup

```jsonc
// in your MCP client config
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

A Docker image and a plain-language guide (including what each tool affords
you and the full trust model) live in the
[protocol repository](https://github.com/bytewizard42i/soulSketch/blob/main/docs/MCP_SERVER.md).

## Trust model, in one paragraph

The server only touches directories you allow via `SOULSKETCH_ALLOWED_ROOTS` -
normally your **Soul-Sanctum**, the private repo where your assistant's
memory packs live.
Five of the six tools are read-only; the sixth appends single lines to
`runtime_observations.jsonl` and can never modify or delete existing memories.
No network calls, no telemetry, no hosted anything: your assistant's memory is
a folder of text files on **your** computer, in **your** Git history.

Apache-2.0 © John Santi & The AI Family
