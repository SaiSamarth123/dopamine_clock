# Memento

Chrome extension (MV3) that replaces the new tab with a personal accountability dashboard: life urgency grid, mission gate, focus timer, and Intelligence core.

**Version:** 0.0.0.1

## Development

```bash
npm install
npm test
npm run test:e2e   # headed Chrome + unpacked extension
```

Load unpacked: Chrome → Extensions → Developer mode → Load unpacked → this folder.

## Release

| Asset | Location |
|-------|----------|
| QA checklist | [QA.md](QA.md) |
| Privacy policy | [docs/privacy-policy.md](docs/privacy-policy.md) · [docs/index.html](docs/index.html) |
| Chrome Web Store copy | [docs/STORE_LISTING.md](docs/STORE_LISTING.md) |
| Icons | [icons/](icons/) |

Before publishing: enable GitHub Pages via **GitHub Actions** (not branch root — see [STORE_LISTING.md](docs/STORE_LISTING.md)), complete manual items in [QA.md](QA.md), add screenshots per store listing guide.
