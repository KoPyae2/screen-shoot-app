# Security Policy

## Supported Versions

Only the latest release of Snapture receives security updates.

| Version | Supported |
| ------- | --------- |
| Latest release | ✅ |
| Older versions | ❌ |

## Reporting a Vulnerability

Please **do not** report security vulnerabilities through public GitHub issues.

Instead, use [GitHub's private vulnerability reporting](https://github.com/KoPyae2/screen-shoot-app/security/advisories/new) to report it privately.

When reporting, please include:

- A description of the vulnerability and its impact
- Steps to reproduce the issue
- The version of Snapture and your operating system

You can expect an acknowledgment within a few days. Once the issue is confirmed and a fix is released, we will credit you in the release notes unless you prefer to remain anonymous.

## Scope Notes

Snapture is a desktop application that captures screen content and writes images to the local clipboard and filesystem. Reports about the following are especially valuable:

- Escapes of the Tauri security sandbox / CSP
- Path traversal in save/history handling
- Leaking captured image data beyond the local machine
