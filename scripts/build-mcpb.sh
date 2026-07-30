#!/usr/bin/env bash
#
# Build the SoulSketch MCPB bundle (.mcpb) - a zip containing the MCP server
# plus a manifest.json, enabling one-click installs in Claude Desktop and
# publishable to Smithery as a local (stdio) server.
#
# What happens, in plain English:
#   1. Compile the workspace (tsc) as usual
#   2. Squash the server and ALL its dependencies into one self-contained
#      JavaScript file (esbuild) - no node_modules needed at install time
#   3. Write the MCPB manifest describing the server and its user settings
#   4. Zip it all into dist-mcpb/soulsketch.mcpb with the official mcpb CLI
#
# Usage: bash scripts/build-mcpb.sh   (from the repo root)

set -euo pipefail
cd "$(dirname "$0")/.."

VERSION=$(node -p "require('./packages/mcp-server/package.json').version")
STAGING=dist-mcpb/staging

echo "Building SoulSketch MCPB bundle v${VERSION}..."
rm -rf dist-mcpb
mkdir -p "$STAGING/server"

# Step 1: normal TypeScript build
npm run build --workspace @soulsketch/mcp-server >/dev/null

# Step 2: bundle server + dependencies into a single ESM file.
npx esbuild packages/mcp-server/dist/index.js \
  --bundle --platform=node --format=esm \
  --banner:js="import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" \
  --outfile="$STAGING/server/index.mjs" >/dev/null

# The server reads ../package.json for its version; give the bundle one.
node -e "
const fs = require('fs');
const pkg = require('./packages/mcp-server/package.json');
fs.writeFileSync('$STAGING/package.json', JSON.stringify({ name: pkg.name, version: pkg.version, type: 'module' }, null, 2));
"

# Step 3: the MCPB manifest (spec: https://github.com/anthropics/mcpb/blob/main/MANIFEST.md)
node -e "
const fs = require('fs');
const manifest = {
  manifest_version: '0.3',
  name: 'soulsketch',
  display_name: 'SoulSketch',
  version: '$VERSION',
  description: 'Portable, user-owned AI memory packs: read, validate, fingerprint, diff, and observe',
  long_description:
    'Your assistant\'s identity lives in five plain text files inside a private folder you own - your Soul-Sanctum - instead of a vendor database. SoulSketch lets any MCP client load that identity (one soul, many vessels), append consensual diary observations, health-check packs, seal them with tamper-evident fingerprints, and diff two pack states per identity dimension.',
  author: { name: 'John Santi & The AI Family', email: 'contact@enterprisezk.com' },
  repository: { type: 'git', url: 'https://github.com/bytewizard42i/soulSketch.git' },
  homepage: 'https://github.com/bytewizard42i/soulSketch',
  documentation: 'https://github.com/bytewizard42i/soulSketch/blob/main/docs/MCP_SERVER.md',
  support: 'https://github.com/bytewizard42i/soulSketch/issues',
  license: 'Apache-2.0',
  keywords: ['memory', 'identity', 'continuity', 'privacy', 'soul-sanctum'],
  server: {
    type: 'node',
    entry_point: 'server/index.mjs',
    mcp_config: {
      command: 'node',
      args: ['\${__dirname}/server/index.mjs'],
      env: { SOULSKETCH_ALLOWED_ROOTS: '\${user_config.soul_sanctum}' }
    }
  },
  // Tool list is discovered live from the running server (tools/list);
  // registries that want static schemas should introspect, not trust a copy.
  tools_generated: true,
  compatibility: { platforms: ['darwin', 'win32', 'linux'], runtimes: { node: '>=18.0.0' } },
  user_config: {
    soul_sanctum: {
      type: 'directory',
      title: 'Soul-Sanctum folder',
      description: 'The private folder (ideally a Git repo) holding your assistant\'s memory packs. The server can only see this directory.',
      required: true,
      default: '\${HOME}/soul-sanctum'
    }
  }
};
fs.writeFileSync('$STAGING/manifest.json', JSON.stringify(manifest, null, 2));
"

# Step 4: zip it with the official CLI (validates the manifest too)
npx --yes @anthropic-ai/mcpb pack "$STAGING" "dist-mcpb/soulsketch-${VERSION}.mcpb"

echo ""
echo "Bundle ready: dist-mcpb/soulsketch-${VERSION}.mcpb"
