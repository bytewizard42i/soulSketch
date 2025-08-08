# Project Status

- Cohort: SoulSketch Protocol
- Intent: VC-ready public template with strict separation from private myAlice
- Current Version: v1.1.0 (planned)
- Release Policy: Single authoritative ZIP per GitHub Release; repo is source-only
- CI: Hybrid auto-detect (Python + Node) via `.github/workflows/ci.yml`
- Release Workflow: `.github/workflows/release.yml` builds ZIP + CHECKSUMS.txt on tag push
- Provenance: Checksums for all release artifacts; legacy ZIPs to Releases with index

## Recent Changes
- Added hybrid CI and release workflow; fixed CI by using a `detect` job with outputs
- Added `SECURITY.md`; updated `.gitignore` to ignore all ZIPs except `releases/SoulSketch_latest.zip`
- Committed latest production ZIP to `releases/SoulSketch_latest.zip` for remote backup (policy-compatible), removed other tracked ZIPs
- Added Ai-chat session logs for continuity

## Next Milestones
- Update README with Quickstart, CI/Release overview, and link to `docs/LEGACY_ARCHIVES.md`
- Add CHANGELOG and tag v1.1.0
- Publish single authoritative ZIP to GitHub Releases via release workflow
