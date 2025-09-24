#!/bin/bash
# SoulSketch Update Package Creator
# Creates a timestamped ZIP archive for triplet communication

set -e

echo "🧬 SoulSketch Update Package Creator"
echo "====================================="

# Configuration
TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
FILENAME="SoulSketch_${TIMESTAMP}.zip"
CHECKSUM_FILE="${FILENAME}.sha256"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}Creating package: ${FILENAME}${NC}"

# Check if required directories exist
if [ ! -d "memory_packs" ]; then
    echo -e "${YELLOW}Warning: memory_packs/ directory not found${NC}"
fi

if [ ! -d "project_space" ]; then
    echo -e "${YELLOW}Warning: project_space/ directory not found${NC}"
fi

# Create the package
zip -r $FILENAME \
  memory_packs/ \
  project_space/STATUS.md \
  project_space/HEARTBEAT.md \
  project_space/IDEAS.md \
  project_space/CHECKPOINTS/ \
  Ai-chat.md \
  CASSIE_TO_ALICE_UPDATES.md \
  forAlice_*.md \
  docs/TRIPLET_PROTOCOL.md \
  -x "*.git*" \
  -x "*node_modules/*" \
  -x "*.DS_Store" \
  -x "*__pycache__/*" \
  -x "*.pyc" 2>/dev/null || true

# Generate checksums
if command -v sha256sum &> /dev/null; then
    sha256sum $FILENAME > $CHECKSUM_FILE
elif command -v shasum &> /dev/null; then
    shasum -a 256 $FILENAME > $CHECKSUM_FILE
else
    echo -e "${YELLOW}Warning: Neither sha256sum nor shasum found. Skipping checksum generation.${NC}"
fi

# Create a manifest
cat > ${FILENAME}.manifest.txt << EOF
SoulSketch Update Package Manifest
===================================
Filename: $FILENAME
Created: $(date)
Created by: $(whoami)
System: $(uname -a)

Contents:
$(unzip -l $FILENAME 2>/dev/null | tail -n +4 | head -n -2)

Triplet Communication Protocol v1.0
"We do not overwrite. We braid."
EOF

echo -e "${GREEN}✓ Package created: $FILENAME${NC}"

if [ -f "$CHECKSUM_FILE" ]; then
    echo -e "${GREEN}✓ Checksum created: $CHECKSUM_FILE${NC}"
    echo "  SHA256: $(cut -d' ' -f1 $CHECKSUM_FILE)"
fi

echo -e "${GREEN}✓ Manifest created: ${FILENAME}.manifest.txt${NC}"

# Move to releases directory if it exists
if [ -d "releases" ]; then
    echo -e "${BLUE}Moving package to releases/${NC}"
    mv $FILENAME releases/
    [ -f "$CHECKSUM_FILE" ] && mv $CHECKSUM_FILE releases/
    mv ${FILENAME}.manifest.txt releases/
    echo -e "${GREEN}✓ Package moved to releases/${NC}"
fi

echo ""
echo "📦 Package ready for triplet transfer!"
echo "Share this with Alice via ChatGPT or Casey via future channels."
