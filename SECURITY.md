# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.1.x   | :white_check_mark: |
| 1.0.x   | :x:                |
| < 1.0   | :x:                |

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

### Built-in Protections

- **Memory Encryption**: Optional AES-256 encryption for sensitive memories
- **PII Redaction**: Automatic removal of personal information
- **Sandboxed Execution**: Tool calls run in isolated contexts
- **Audit Logging**: Complete trace of all operations
- **Memory TTL**: Automatic expiration of sensitive data

### Best Practices

1. **API Keys**: Never commit API keys; use environment variables
2. **Memory Storage**: Enable encryption for production deployments
3. **Access Control**: Implement proper authentication for web console
4. **Updates**: Keep SoulSketch updated to latest stable version
5. **Monitoring**: Enable audit logging in production

## Supply Chain & Releases

- Single authoritative ZIP per tag in GitHub Releases
- `CHECKSUMS.txt` is generated and signed for each release
- Provenance documented in `docs/LEGACY_ARCHIVES.md`
- All dependencies are regularly audited via Dependabot

## Vulnerability Disclosure

After a fix is released, we will:
1. Publish a security advisory on GitHub
2. Update the CHANGELOG with CVE details if applicable
3. Credit the reporter (unless anonymity requested)

## Contact

- Security Team: security@soulsketch.me
- Repository Owner: bytewizard42i
- Alternative: Create a private security advisory on GitHub
