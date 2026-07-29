# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.x     | Yes       |
| < 1.0   | No        |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it privately:

1. **Do not** open a public GitHub Issue
2. Email: hello@1arley.com
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

You will receive a response within 48 hours. If the vulnerability is confirmed, a fix will be released within 7 days for critical issues.

## Security Measures

- No secrets or API keys are stored in plaintext
- Configuration files (`.devclirc.json`) should not be committed to repositories
- The `dev ai` command only sends data to configured AI providers — no telemetry is collected
- All network requests are made over HTTPS
