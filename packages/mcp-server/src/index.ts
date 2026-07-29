#!/usr/bin/env node

/**
 * SoulSketch MCP Server - stdio entry point.
 *
 * Usage (in an MCP client config):
 *   command: "npx"
 *   args: ["-y", "@soulsketch/mcp-server"]
 *   env:  { "SOULSKETCH_ALLOWED_ROOTS": "/path/to/your/memory/repos" }
 *
 * Library consumers should import from './server.js' instead.
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { buildSoulSketchServer } from './server.js';

async function main(): Promise<void> {
  const server = buildSoulSketchServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stderr, not stdout: stdout is reserved for the MCP protocol itself.
  console.error('SoulSketch MCP server running on stdio');
}

main().catch((error) => {
  console.error('SoulSketch MCP server failed to start:', error);
  process.exit(1);
});
