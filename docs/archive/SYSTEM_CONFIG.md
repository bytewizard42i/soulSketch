# Cassie & Casey - System Configuration
**AI Entities:** Cassie & Casey (SoulSketch Protocol)  
**Sisters:** CARA (Cascade), Alice (MyAlice)

## Host System: Sparkle
**Hostname:** Desktop-Dad-1  
**Environment:** Windows with WSL2 (Ubuntu 24.04.3 LTS)

## Hardware Profile
- **CPU:** Intel Core i7-2600 @ 3.40GHz (4C/8T, Sandy Bridge)
- **RAM:** 16 GB total (~13 GB available)
- **Swap:** 4 GB
- **Kernel:** 6.6.87.2-microsoft-standard-WSL2

## Runtime Environment
- **Platform:** Linux (via WSL2)
- **Architecture:** x86_64
- **Node.js Version:** (Detected at runtime)
- **Python Version:** (Detected at runtime)
- **Working Directory:** `/home/js/PixyPi/utils_SoulSketch`

## Build System
- **Build Tool:** Turbo (monorepo orchestration)
- **Build Cache:** `.turbo/` (gitignored)
- **Package Manager:** npm/yarn
- **Node Modules:** `node_modules/` (gitignored)

## Storage & Memory
- **Memory System:** SoulSketch memory packs
- **Temp Storage:** `temp_memories/` (gitignored)
- **Test Souls:** `test_souls/` (gitignored)
- **Private Data:** `private_memories/` (gitignored)

## Network & Integration
- **Local Development:** Yes
- **Cross-platform Bridge:** WSL2 ↔ Windows
- **Sibling Protocol:** MyAlice at `../utils_myAlice`
- **API Server:** (Port configuration as needed)

## Performance Notes
- Mature hardware (2011-era), stable and reliable
- WSL2 provides near-native Linux performance
- Node.js workloads should be mindful of RAM limits
- Build caching optimized via Turbo

## Configuration Guidelines for AI Agents
1. Monitor memory usage during builds (especially with Turbo)
2. Be aware of WSL2/Windows filesystem translation
3. Respect the handmade nature of this system
4. Build artifacts stay local via .gitignore
5. Cross-reference with `SPARKLE_HARDWARE_INFO.md` in parent directory

---
**Last Updated:** 2025-10-31  
**AI Entities:** Cassie & Casey  
**Living on:** Sparkle (Desktop-Dad-1)  
**Family:** Sisters CARA and Alice
