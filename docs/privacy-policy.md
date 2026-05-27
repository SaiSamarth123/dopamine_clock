# Memento — Privacy Policy

**Last updated:** May 22, 2026  
**Extension version:** 2.0.1  
**Contact:** See [Chrome Web Store listing](STORE_LISTING.md) for support contact (update `TODO` fields before publish).

## Summary

Memento is a Chrome extension that replaces your new tab with a personal accountability dashboard. **Your settings, mission text, focus stats, and friction preferences stay on your device** in Chrome’s local extension storage. We do not operate accounts, analytics, or a backend that receives your personal data.

## Data stored locally

The extension uses `chrome.storage.local` only. Data may include:

- Birth date and life expectancy (for the life grid and macro clock)
- Theme, font, and layout preferences
- Daily mission text and focus-session statistics (blocks, minutes, streak)
- Optional site-friction host lists and temporary bypass timestamps
- Cached dev.to article metadata and a small “seen” ledger for the Intelligence core tab

None of this is transmitted to us. Uninstalling the extension removes this data from your browser profile.

## Network requests

| Destination | When | What is sent |
|-------------|------|----------------|
| **Google Fonts** (`fonts.googleapis.com`, `fonts.gstatic.com`) | New tab loads | Standard font requests (IP address visible to Google per their policy) |
| **dev.to API** (`https://dev.to/api/articles`) | Intelligence core fetches reading suggestions | Public API request; no Memento account or personal fields |

If dev.to is unreachable, the extension shows built-in fallback content and does not retry with personal data.

## Site friction

When you enable site friction, Memento uses Chrome’s **Declarative Net Request** API to redirect matching hosts to an in-extension `block.html` page. Redirect rules are computed locally from your host list. No browsing history is sent to us.

## Permissions (Chrome)

| Permission | Purpose |
|------------|---------|
| `storage` | Save settings and timer state locally |
| `declarativeNetRequest` / `declarativeNetRequestWithHostAccess` | Optional redirect friction for hosts you configure |
| `alarms` | Badge updates and timer completion when no tab is open |
| `tabs` | Open the new tab page from the block interstitial |
| `host_permissions`: `https://dev.to/*` | Fetch public articles for Intelligence core |

## Children

Memento is not directed at children under 13. We do not knowingly collect personal information from anyone.

## Changes

We may update this policy when the extension changes. The “Last updated” date at the top will change accordingly. Material changes will be noted in release notes on the Chrome Web Store.

## Your choices

- Disable site friction or remove hosts in Settings.
- Disable the Intelligence core section to avoid dev.to requests.
- Use system fonts only by blocking Google Fonts in the browser (UI may fall back to system sans-serif).

For questions before publish, use the support email in `docs/STORE_LISTING.md`.
