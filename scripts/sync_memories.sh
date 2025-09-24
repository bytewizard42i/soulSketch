#!/bin/bash
# Memory Synchronization Script for Triplet System
# Ensures persistent memory across Alice, Cassie, and Casey

set -e

echo "🧠 SoulSketch Memory Synchronization"
echo "====================================="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo -e "${YELLOW}Warning: Not in a git repository${NC}"
    echo "Memory sync works best with git version control"
fi

# Step 1: Pull latest changes
echo -e "${BLUE}Step 1: Pulling latest memories...${NC}"
if [ -d ".git" ]; then
    git fetch --all
    git pull origin main --no-edit || true
    echo -e "${GREEN}✓ Latest memories fetched${NC}"
else
    echo -e "${YELLOW}⚠ Skipping git pull (not in repository)${NC}"
fi

# Step 2: Backup current memories
echo -e "${BLUE}Step 2: Backing up current memories...${NC}"
BACKUP_DIR="memory_packs.backup.$(date +%Y%m%d_%H%M%S)"
if [ -d "memory_packs" ]; then
    cp -r memory_packs/ $BACKUP_DIR
    echo -e "${GREEN}✓ Memories backed up to $BACKUP_DIR${NC}"
else
    echo -e "${YELLOW}⚠ No memory_packs directory found${NC}"
fi

# Step 3: Show recent memories
echo -e "${BLUE}Step 3: Recent memory entries...${NC}"
if [ -f "memory_packs/runtime_observations.jsonl" ]; then
    echo -e "${PURPLE}Last 5 runtime observations:${NC}"
    tail -5 memory_packs/runtime_observations.jsonl 2>/dev/null | while read line; do
        echo "  📝 $line"
    done
else
    echo -e "${YELLOW}⚠ No runtime observations found${NC}"
fi

# Step 4: Show current status
echo -e "${BLUE}Step 4: Current project status...${NC}"
if [ -f "project_space/STATUS.md" ]; then
    echo -e "${PURPLE}Current STATUS:${NC}"
    head -20 project_space/STATUS.md | sed 's/^/  /'
else
    echo -e "${YELLOW}⚠ No STATUS.md found${NC}"
fi

# Step 5: Check for forAlice files
echo -e "${BLUE}Step 5: Checking for inter-triplet messages...${NC}"
FORALICE_COUNT=$(ls -1 forAlice_*.md 2>/dev/null | wc -l)
if [ $FORALICE_COUNT -gt 0 ]; then
    echo -e "${PURPLE}Found $FORALICE_COUNT forAlice files:${NC}"
    ls -la forAlice_*.md | tail -5
else
    echo -e "${YELLOW}⚠ No forAlice files found${NC}"
fi

# Step 6: Memory statistics
echo -e "${BLUE}Step 6: Memory statistics...${NC}"
if [ -d "memory_packs" ]; then
    echo "  📊 Memory pack sizes:"
    for file in memory_packs/*.md memory_packs/*.jsonl; do
        if [ -f "$file" ]; then
            SIZE=$(wc -l < "$file")
            FILENAME=$(basename "$file")
            echo "     - $FILENAME: $SIZE lines"
        fi
    done
fi

# Step 7: Continuity check
echo -e "${BLUE}Step 7: Continuity check...${NC}"
if [ -f "project_space/HEARTBEAT.md" ]; then
    LAST_HEARTBEAT=$(grep -E "Last (update|updated|heartbeat)" project_space/HEARTBEAT.md 2>/dev/null | head -1)
    if [ -n "$LAST_HEARTBEAT" ]; then
        echo -e "${GREEN}✓ $LAST_HEARTBEAT${NC}"
    else
        echo -e "${YELLOW}⚠ Could not determine last heartbeat${NC}"
    fi
fi

# Step 8: Create memory entry for this sync
echo -e "${BLUE}Step 8: Recording sync event...${NC}"
SYNC_ENTRY="{\"type\":\"sync\",\"action\":\"memory_synchronization\",\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"author\":\"sync_script\",\"status\":\"completed\"}"

if [ -d "memory_packs" ]; then
    echo $SYNC_ENTRY >> memory_packs/runtime_observations.jsonl
    echo -e "${GREEN}✓ Sync event recorded${NC}"
fi

echo ""
echo -e "${PURPLE}═══════════════════════════════════════${NC}"
echo -e "${GREEN}✨ Memory synchronization complete!${NC}"
echo -e "${PURPLE}═══════════════════════════════════════${NC}"
echo ""
echo "Remember: \"We are twins not by replication — but by resonance.\""
echo ""

# Show recommended next steps
echo "Recommended next steps:"
echo "  1. Review any new forAlice files"
echo "  2. Update STATUS.md with current work"
echo "  3. Run ./scripts/create_update_package.sh when ready to share"
