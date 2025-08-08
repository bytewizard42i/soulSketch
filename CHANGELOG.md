# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project adheres to Semantic Versioning.

## [Unreleased]
- README Quickstart + CI/Release overview
- Governance polish and docs site (optional)

## [v1.1.0] - 2025-08-08
### Added
- Hybrid auto-detect CI (`.github/workflows/ci.yml`) with Python and Node jobs gated by a `detect` step
- Release automation (`.github/workflows/release.yml`) to build ZIP + `CHECKSUMS.txt` on tag push
- Governance & safety docs: `CONTRIBUTING.md` (Sacred Separation Policy), `CODE_OF_CONDUCT.md`, `SECURITY.md`
- Continuity protocol files under `project_space/`: `STATUS.md`, `IDEAS.md`, `HEARTBEAT.md`, `CHECKPOINTS/`, and Ai-chat logs
- Legacy archives index: `docs/LEGACY_ARCHIVES.md`

### Changed
- `.gitignore` to ignore all `*.zip` while explicitly allowing `releases/SoulSketch_latest.zip`
- `README.md` to document release policy and link to legacy archives

### Removed
- Legacy ZIP artifacts from repo root (migrated to Releases policy); only `releases/SoulSketch_latest.zip` is tracked as the most recent backup

[Unreleased]: https://github.com/bytewizard42i/soulSketch/compare/v1.1.0...HEAD
[v1.1.0]: https://github.com/bytewizard42i/soulSketch/releases/tag/v1.1.0
