# Memento — Pre-release QA checklist

Run on **Chrome stable** with the unpacked extension ([manifest.json](manifest.json) v0.0.0.1+). Check each item before shipping.

**Legend:** Items marked **(auto)** were verified by `npm test` and/or Playwright e2e on May 22, 2026. Items without **(auto)** still need a manual pass on Chrome stable.

## Release sign-off (v0.0.0.1)

| Check | Status |
|-------|--------|
| Unit tests (`npm test`) | **Pass** — 11 tests |
| E2E (`npm run test:e2e`) | **Partial** — setup/mission gate, block page (3/5 specs; 2 flaky when persistent profile already has config) |
| Manifest icons 16/48/128 | **Done** — [icons/](icons/) + [manifest.json](manifest.json) |
| Privacy policy | **Done** — [docs/privacy-policy.md](docs/privacy-policy.md), [privacy-policy.html](privacy-policy.html) |
| Store listing draft | **Done** — [docs/STORE_LISTING.md](docs/STORE_LISTING.md) |
| Manual Chrome stable pass | **Pending** — complete unchecked items below before Web Store submit |

---

## Install and setup

- [x] **(auto)** Fresh install / new tab: dashboard loads; setup drawer or mission gate visible (e2e: setup flow, mission gate)
- [ ] Validation: empty birth date, future birth date, and life expectancy ≤ current age each show clear errors on the correct tab
- [x] **(auto)** At least one dashboard section must be enabled; error if all unchecked (`validateFormData` unit test)
- [x] **(auto)** **Done** saves settings, closes drawer, shows dashboard (e2e: completes setup)

## Mission gate

- [x] **(auto)** With timer idle, mission gate overlays dashboard (e2e: mission gate visible after setup)
- [x] **(auto)** Life urgency visible during gate: `#life-grid` and `#age-clock` visible (e2e)
- [x] **(auto)** **Start 25 min focus** disabled until mission text is entered (e2e: `gate-start-focus` disabled → enabled after fill)
- [ ] **I'm intentionally browsing** grants ~5 min grace; banner shows countdown
- [ ] After grace expires, mission gate returns

## Focus timer

- [ ] Start / pause / reset work; preset buttons switch duration
- [ ] Extension badge shows remaining minutes while running or paused
- [ ] Completion plays chime once (respects sound = none and reduced-motion)
- [x] **(auto)** Focus stats increment logic: blocks, minutes, streak idempotency (`applyFocusSessionComplete` unit tests)

## Timer completion without tab open (critical)

- [ ] Start 25 min focus, close **all** Memento new tabs, wait for timer to finish
- [ ] Open a new tab: stats and streak reflect the completed session; badge cleared

## Multiple tabs

- [ ] Two Memento tabs open: timer state stays in sync
- [ ] Completion chime plays once, not twice; streak does not double-count

## Edge cases

- [ ] Reload extension during running timer: tab shows warning or recovers without crash
- [ ] dev.to unreachable: Signal tab still shows local fallback insight
- [ ] Theme / font changes apply live; debounced save persists after closing settings
- [ ] Legacy `dopamineClockConfig` migrates once to `mementoConfig`

## Release assets (store readiness)

- [x] Extension icons in manifest (`icons/icon16.png`, `icon48.png`, `icon128.png`)
- [x] Toolbar `action.default_icon` configured
- [x] Privacy policy document in repo (+ HTML for hosting)
- [x] Store listing copy and permission justifications ([docs/STORE_LISTING.md](docs/STORE_LISTING.md))
- [ ] Privacy policy URL hosted and entered in Chrome Web Store dashboard
- [ ] Support email set in store listing (see TODO in STORE_LISTING.md)
- [ ] Screenshots captured per STORE_LISTING.md

## Automated tests (developer)

```bash
npm install
npm test          # Node unit tests (shared.js) — required before release
npm run test:e2e  # Playwright (headed Chrome; isolate profile if tests flake)
```

**E2E note:** Persistent browser context may retain `mementoConfig` between specs. For a clean run, use a fresh profile or run single tests in isolation.
