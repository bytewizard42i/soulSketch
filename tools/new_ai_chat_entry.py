#!/usr/bin/env python3
import os
from pathlib import Path
from datetime import datetime
import subprocess

def current_short_sha():
    try:
        return subprocess.check_output(["git", "rev-parse", "--short", "HEAD"]).decode().strip()
    except Exception:
        return "unknown"

def main():
    root = Path(__file__).parent.parent
    outdir = root / "project_space" / "Ai-chat"
    outdir.mkdir(parents=True, exist_ok=True)

    ts = datetime.now().strftime("%Y-%m-%d-%H%M")
    sha = current_short_sha()
    fname = f"{ts}_commit-{sha}.md"
    fpath = outdir / fname

    if fpath.exists():
        print(f"Exists: {fpath}")
        return

    template = f"""# Session: Untitled

- Participants: John (operator), Cassie (steward)
- Commit: {sha}
- Context: 
- Links: 

## Emotional Resonance

## Technical Notes

## Philosophical Insights

## Decisions

## Next Steps
"""
    fpath.write_text(template)
    print(f"Created: {fpath}")

if __name__ == "__main__":
    main()
