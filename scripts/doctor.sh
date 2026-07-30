#!/usr/bin/env bash
#
# SoulSketch doctor - preflight check for running the MCP server.
#
# Checks (never changes) your environment, explains each finding in plain
# language, and tells you exactly how to fix anything missing. The only
# action it ever OFFERS to take is installing Docker Engine on native Linux,
# and only after asking you explicitly.
#
# Usage:
#   bash scripts/doctor.sh
#
# Exit code: 0 if at least one way of running the server works, 1 otherwise.

# 'set -u' = error on undefined variables. (We deliberately skip 'set -e'
# because probe commands are EXPECTED to fail on machines missing tools.)
set -u

# ---------- tiny output helpers ----------
PASS=0
WARN=0
FAIL=0
ok()   { echo "  [OK]   $1"; PASS=$((PASS + 1)); }
warn() { echo "  [WARN] $1"; WARN=$((WARN + 1)); }
bad()  { echo "  [MISS] $1"; FAIL=$((FAIL + 1)); }

echo ""
echo "SoulSketch doctor - checking this computer can run the MCP server"
echo "=================================================================="
echo ""
echo "To run SoulSketch's memory tools, your computer needs ONE of:"
echo "  - Node.js 18+  (a free JavaScript runtime), or"
echo "  - Docker       (free software that runs sealed 'containers')"
echo ""
echo "This script only LOOKS at your setup - it changes nothing without"
echo "asking. If anything is missing, we'll guide you through fixing it."

# ---------- detect the platform, because the advice differs ----------
# WSL kernels contain "microsoft" in their version string - that's the
# reliable tell that Windows is underneath and Docker Desktop lives there.
PLATFORM="linux"
if grep -qi microsoft /proc/version 2>/dev/null; then
  PLATFORM="wsl"
elif [ "$(uname -s 2>/dev/null)" = "Darwin" ]; then
  PLATFORM="mac"
fi
echo ""
echo "Platform detected: $PLATFORM"

# =====================================================================
# Path A: Node.js (needed for the npm/npx way of running the server)
# =====================================================================
echo ""
echo "--- Path A: run via Node.js ---"
NODE_OK=false
if command -v node >/dev/null 2>&1; then
  NODE_VERSION="$(node --version)"                 # e.g. v22.1.0
  NODE_MAJOR="${NODE_VERSION#v}"                   # strip the leading 'v'
  NODE_MAJOR="${NODE_MAJOR%%.*}"                   # keep digits before first dot
  if [ "$NODE_MAJOR" -ge 18 ] 2>/dev/null; then
    ok "Node.js $NODE_VERSION (18+ required)"
    NODE_OK=true
  else
    bad "Node.js $NODE_VERSION is too old - need 18+. Get it at https://nodejs.org"
  fi
else
  bad "Node.js not found. Install from https://nodejs.org (or use the Docker path below)"
fi

# =====================================================================
# Path B: Docker (needed for the container way of running the server)
# =====================================================================
echo ""
echo "--- Path B: run via Docker ---"
DOCKER_OK=false
if ! command -v docker >/dev/null 2>&1; then
  case "$PLATFORM" in
    wsl)
      bad "Docker CLI not found in this WSL distro."
      echo "         Fix: install Docker Desktop on WINDOWS (https://docs.docker.com/desktop/),"
      echo "         then enable it for this distro: Docker Desktop -> Settings ->"
      echo "         Resources -> WSL Integration."
      ;;
    mac)
      bad "Docker not found. Install Docker Desktop: https://docs.docker.com/desktop/"
      ;;
    linux)
      bad "Docker not found."
      echo "         Docker Engine can be installed with Docker's official script."
      # Only on native Linux do we OFFER to install - never silently, and
      # only when running interactively (a real person at a real terminal).
      if [ -t 0 ]; then
        printf "         Install Docker Engine now via https://get.docker.com? [y/N] "
        read -r REPLY
        if [ "$REPLY" = "y" ] || [ "$REPLY" = "Y" ]; then
          curl -fsSL https://get.docker.com | sh
          echo "         Done. You may need to log out/in for group permissions,"
          echo "         then re-run this script."
        else
          echo "         Skipped. Manual instructions: https://docs.docker.com/engine/install/"
        fi
      fi
      ;;
  esac
else
  # CLI exists - but is the engine actually awake and answering?
  if docker info >/dev/null 2>&1; then
    ok "Docker $(docker --version | sed 's/Docker version //;s/,.*//') - engine is running"
    DOCKER_OK=true

    # A subtle post-update failure we hit ourselves: the engine runs fine
    # but pulling/building fails because the credential helper broke.
    # 'docker pull' of a tiny image is the cheapest end-to-end probe.
    if docker pull hello-world >/dev/null 2>&1; then
      ok "Registry access works (test pull succeeded)"
    else
      warn "Engine runs, but pulling images fails (often a broken credential"
      echo "         helper after a Docker Desktop update). Fix: fully quit Docker"
      echo "         Desktop from the system tray and start it again."
    fi
  else
    case "$PLATFORM" in
      wsl) bad "Docker CLI exists but the engine isn't answering. Start Docker Desktop on Windows." ;;
      mac) bad "Docker CLI exists but the engine isn't answering. Start Docker Desktop." ;;
      *)   bad "Docker CLI exists but the daemon isn't running. Try: sudo systemctl start docker" ;;
    esac
  fi
fi

# =====================================================================
# Verdict
# =====================================================================
echo ""
echo "=================================================================="
echo "Results: $PASS ok, $WARN warnings, $FAIL missing"
if $NODE_OK || $DOCKER_OK; then
  echo "Verdict: this computer CAN run the SoulSketch MCP server."
  $NODE_OK   && echo "  - Node path available (see docs/MCP_SERVER.md, Setup)"
  $DOCKER_OK && echo "  - Docker path available (see docs/MCP_SERVER.md, Option B)"
  exit 0
else
  echo "Verdict: not yet - this computer needs Node.js or Docker first."
  echo ""
  echo "Don't worry, this is a one-time setup and we'll guide you:"
  echo "  - Easiest for most people: install Docker Desktop from"
  echo "      https://docs.docker.com/desktop/"
  echo "    then re-run this script - it will confirm when you're ready."
  echo "  - Step-by-step setup guide:  docs/MCP_SERVER.md"
  echo "  - Stuck? Open an issue and we'll help personally:"
  echo "      https://github.com/bytewizard42i/soulSketch/issues"
  echo ""
  echo "When you've installed one of them, run this again:"
  echo "  bash scripts/doctor.sh"
  exit 1
fi
