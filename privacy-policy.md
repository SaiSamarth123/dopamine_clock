# Memento — Privacy Policy

**Last updated:** July 1, 2026  
**Extension version:** 0.0.0.1  
**Contact:** sai003sam@gmail.com

## Summary

Memento is a Chrome extension that replaces your new tab with a personal accountability dashboard. **Your settings, mission text, and focus stats stay on your device** in Chrome’s local extension storage. We do not operate accounts, analytics, or a backend that receives your personal data.

## Data stored locally

The extension uses `chrome.storage.local` only. Data may include:

- Birth date and life expectancy (for the life grid and macro clock)
- Theme, font, and layout preferences
- Daily mission text and focus-session statistics (blocks, minutes, streak)
- Cached dev.to article metadata and a small “seen” ledger for the Intelligence core tab

None of this is transmitted to us. Uninstalling the extension removes this data from your browser profile.

## Network requests

| Destination | When | What is sent |
|-------------|------|----------------|
| **dev.to API** (`https://dev.to/api/articles`) | Intelligence core fetches reading suggestions | Public API request; no Memento account or personal fields |

Optional UI fonts (Inter, JetBrains Mono, Space Grotesk) are bundled inside the extension package — no remote font requests.

If dev.to is unreachable, the extension shows built-in fallback content and does not retry with personal data.

## Permissions (Chrome)

| Permission | Purpose |
|------------|---------|
| `storage` | Save settings and timer state locally |
| `alarms` | Badge updates and timer completion when no tab is open |
| `host_permissions`: `https://dev.to/*` | Fetch public articles for Intelligence core |

## Children

Memento is not directed at children under 13. We do not knowingly collect personal information from anyone.

## Changes

We may update this policy when the extension changes. The “Last updated” date at the top will change accordingly. Material changes will be noted in release notes on the Chrome Web Store.

## Your choices

- Disable the Intelligence core section to avoid dev.to requests.
- Choose system fonts in settings if you prefer not to use the bundled Inter or Space Grotesk presets.

For questions, use the support email in `docs/STORE_LISTING.md`.
