#!/usr/bin/env node

/**
 * SoulSketch MCP Server - entry point.
 *
 * Two modes:
 *   soulsketch-mcp setup   -> interactive setup wizard (run once, in a terminal)
 *   soulsketch-mcp         -> MCP server on stdio (started by your AI tool)
 *
 * Typical MCP client config:
 *   command: "npx"
 *   args: ["-y", "@soulsketch/mcp-server"]
 *   env:  { "SOULSKETCH_ALLOWED_ROOTS": "/path/to/your/soul-sanctum" }
 *
 * Library consumers should import from './server.js' instead.
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { buildSoulSketchServer } from './server.js';
import { resolveAllowedRoots } from './pack-io.js';
import { resolveEnabledOptionalTools } from './settings.js';
import { runWizardInteractive } from './wizard.js';

async function main(): Promise<void> {
  if (process.argv[2] === 'setup') {
    await runWizardInteractive();
    return;
  }

  const allowedRoots = resolveAllowedRoots();
  const enabledTools = await resolveEnabledOptionalTools({ allowedRoots });
  const server = buildSoulSketchServer({ allowedRoots, enabledTools });
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stderr, not stdout: stdout is reserved for the MCP protocol itself.
  console.error(
    `SoulSketch MCP server running on stdio (optional tools: ${enabledTools.join(', ') || 'none'})`
  );
}

main().catch((error) => {
  console.error('SoulSketch MCP server failed to start:', error);
  process.exit(1);
});
