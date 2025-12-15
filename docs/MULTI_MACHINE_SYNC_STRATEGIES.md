# Multi-Machine Sync Strategies for AI Assistant Teams

When running AI assistants across multiple machines, keeping shared memory and configuration in sync is essential. This document outlines strategies from simple to advanced.

---

## Strategy 1: Git-Based Sync (Simplest)

**How it works**: Shared repository that all machines push/pull from.

**Pros**:
- Already using git for version control
- Works across any network topology
- Full history and rollback capability
- Conflict resolution built-in

**Cons**:
- Requires manual push/pull (or cron automation)
- Not truly real-time

**Implementation**:
```bash
# Auto-pull every 5 minutes via cron
*/5 * * * * cd /path/to/shared-repo && git pull origin main

# Or watch for changes and auto-push
inotifywait -m -r -e modify,create,delete /path/to/shared-repo | while read; do
    git add -A && git commit -m "Auto-sync" && git push
done
```

---

## Strategy 2: Syncthing (P2P Real-Time)

**How it works**: Peer-to-peer file synchronization without central server.

**Pros**:
- Real-time sync
- Encrypted
- No central server needed
- Works across platforms (Linux, Windows, macOS)

**Cons**:
- Requires Syncthing daemon running on all machines
- May need firewall configuration
- WSL2 requires special network setup

**Installation**:
```bash
# Ubuntu/Debian
sudo apt install syncthing

# Start as service
systemctl --user enable syncthing
systemctl --user start syncthing
```

**Configuration**:
1. Access web UI at `http://localhost:8384`
2. Add remote devices via device ID
3. Share folders between devices

---

## Strategy 3: rsync + fswatch (Event-Driven)

**How it works**: Watch for file changes, sync on change via SSH.

**Pros**:
- Near real-time
- Uses standard SSH (secure)
- Low overhead

**Cons**:
- Requires SSH access between machines
- One-directional sync (need bidirectional setup for two-way)

**Implementation**:
```bash
# Watch and sync on change
fswatch -o /path/to/folder | xargs -n1 -I{} rsync -avz /path/to/folder/ user@remote:/path/to/folder/
```

---

## Strategy 4: lsyncd (Live Sync Daemon)

**How it works**: Daemon that monitors directories and syncs changes via rsync/SSH.

**Pros**:
- Automatic and continuous
- Configurable delays and filters
- Supports multiple targets

**Cons**:
- More complex setup
- Requires SSH keys configured

**Configuration** (`/etc/lsyncd.conf`):
```lua
sync {
    default.rsync,
    source = "/path/to/shared-folder",
    target = "user@remote:/path/to/shared-folder",
    delay = 1,
    rsync = {
        archive = true,
        compress = true
    }
}
```

---

## Strategy 5: Hybrid Approach (Recommended)

Combine strategies for robustness:

1. **Git for versioned content** (rules, configs, docs)
   - Push/pull manually or via hooks
   - Full history and conflict resolution

2. **Syncthing for real-time state** (memory files, logs)
   - Instant propagation
   - No manual intervention

3. **SSH for remote execution**
   - Run commands on remote machines
   - Trigger builds, tests, or syncs

---

## WSL Considerations

When syncing to/from Windows Subsystem for Linux:

- **Network**: WSL2 uses NAT; may need port forwarding
- **File permissions**: Linux permissions don't map 1:1 to Windows
- **Paths**: Use `/mnt/c/...` to access Windows filesystem from WSL
- **Firewall**: Windows Defender may block sync tools initially

---

## Recommended Folder Structure

```
shared-repo/
├── rules/           # Shared guidelines (git-synced)
├── configs/         # Tool configurations (git-synced)
├── memory/          # AI memory files (real-time sync)
├── docs/            # Documentation (git-synced)
└── .credentials/    # Secrets (gitignored, manually synced)
```

---

## Security Notes

- **Secrets**: Never sync secrets via unencrypted channels
- **SSH keys**: Use key-based auth, not passwords
- **Firewall**: Only open necessary ports
- **Private repos**: Keep shared AI memory in private repositories

---

*Part of the SoulSketch Protocol - AI identity preservation and transfer framework*
