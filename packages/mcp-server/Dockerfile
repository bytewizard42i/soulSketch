# SoulSketch MCP Server - container image
#
# Build (from the repo root - the build context must be the monorepo root):
#   docker build -t soulsketch/mcp-server -f packages/mcp-server/Dockerfile .
#
# Run (an MCP client does this for you; -i keeps stdin open for the protocol):
#   docker run -i --rm -v /path/to/your/memory/repo:/memories soulsketch/mcp-server
#
# The container only sees what you mount at /memories. Your memory pack
# stays on your machine; the container is a sealed, disposable appliance.

# ---- Stage 1: build the TypeScript workspace ----
FROM node:22-alpine AS build
WORKDIR /app

# Install dependencies first (cached unless manifests change).
COPY package.json package-lock.json ./
COPY packages/core/package.json packages/core/
COPY packages/mcp-server/package.json packages/mcp-server/
RUN npm ci --ignore-scripts

# Copy sources and compile core, then the server.
COPY tsconfig.json ./
COPY packages/core packages/core
COPY packages/mcp-server packages/mcp-server
RUN npm run build --workspace @soulsketch/core \
 && npm run build --workspace @soulsketch/mcp-server

# Drop dev dependencies for the runtime image.
RUN npm prune --omit=dev

# ---- Stage 2: minimal runtime ----
FROM node:22-alpine
WORKDIR /app

# Run as the unprivileged 'node' user, never root.
USER node

COPY --from=build --chown=node:node /app/node_modules node_modules
COPY --from=build --chown=node:node /app/packages/core/dist packages/core/dist
COPY --from=build --chown=node:node /app/packages/core/package.json packages/core/
COPY --from=build --chown=node:node /app/packages/mcp-server/dist packages/mcp-server/dist
COPY --from=build --chown=node:node /app/packages/mcp-server/package.json packages/mcp-server/

# The trust boundary: only the mounted /memories directory is reachable.
ENV SOULSKETCH_ALLOWED_ROOTS=/memories

ENTRYPOINT ["node", "packages/mcp-server/dist/index.js"]
