# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.2.x   | :white_check_mark: |
| 1.1.x   | :x:                |
| < 1.1   | :x:                |

## Reporting a Vulnerability

### Coordinated Disclosure Process

We take security seriously and appreciate responsible disclosure of vulnerabilities.

**DO NOT** create public GitHub issues for security vulnerabilities.

### How to Report

Email: **security@soulsketch.me** or contact **bytewizard42i** directly

Include:
1. **Description**: Clear explanation of the vulnerability
2. **Impact**: Potential consequences if exploited
3. **Steps to Reproduce**: Detailed reproduction steps
4. **Proof of Concept**: Code samples if applicable
5. **Suggested Fix**: Any recommendations for mitigation

### Response Timeline

- **Initial Response**: Within 48-72 hours
- **Status Update**: Within 5 business days
- **Fix Timeline**: Based on severity:
  - Critical: 7-14 days
  - High: 14-30 days
  - Medium: 30-60 days
  - Low: Next release cycle

### Recognition

We maintain a Security Hall of Fame to recognize responsible security researchers who help improve SoulSketch.

## Security Features

### Implemented today

- **PII Redaction**: Regex-based redaction of common identifiers (emails, phones, SSNs, credit cards, IPv4) in `packages/core/src/safety.ts`. This is a best-effort filter, not a guarantee.
- **`.gitignore` hygiene**: Sensitive paths (`.env*`, `secrets/`, `private_memories/`, `temp_memories/`, etc.) are excluded by default.
- **Public/private split**: This repo is the public skeleton; users are expected to keep memory state in a separate private repo (see `README.md`).

### Planned / not yet implemented

These have appeared in earlier docs as aspirational features. They are **not** in the current code and should not be relied upon:

- **Memory Encryption** (e.g. AES-256 at rest)
- **Sandboxed Execution** for tool calls
- **Structured Audit Logging**
- **Memory TTL / automatic expiration**

If you depend on any of these, implement them at your integration layer for now. Contributions welcome — see `ROADMAP.md`.

### Best Practices

1. **API Keys**: Never commit API keys; use environment variables.
2. **Memory Storage**: Treat memory packs as sensitive; encrypt at rest in your own infrastructure until built-in encryption lands.
3. **Access Control**: If you expose any management surface (HTTP, CLI on a shared host), put your own authentication in front of it.
4. **Updates**: Track the latest stable tag.
5. **Monitoring**: Add your own logging around tool calls and memory writes.

## Supply Chain & Releases

- Single authoritative ZIP per tag in GitHub Releases
- `CHECKSUMS.txt` (sha256) is generated and attached to each release
- Legacy artifact provenance is documented in `docs/LEGACY_ARCHIVES.md`
- Release signing and Dependabot policies are planned but not yet enforced

## Vulnerability Disclosure

After a fix is released, we will:
1. Publish a security advisory on GitHub
2. Update the CHANGELOG with CVE details if applicable
3. Credit the reporter (unless anonymity requested)

## Contact

- Security Team: security@soulsketch.me
- Repository Owner: bytewizard42i
- Alternative: Create a private security advisory on GitHub
