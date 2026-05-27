# Chrome Web Store — Memento listing draft

Use this document when creating the Chrome Web Store developer dashboard entry. Replace placeholders marked `TODO` before submit.

## Package

| Field | Value |
|-------|--------|
| Name | Memento |
| Version | 2.0.1 (match [manifest.json](../manifest.json)) |
| Category | Productivity |
| Language | English |

## Short description (≤ 132 characters)

New tab accountability: life urgency grid, mission gate, focus timer, optional site friction. Data stays on your device.

## Detailed description

**Memento** turns every new tab into a calm accountability surface — not another feed.

**Life urgency** — See your life as a dot grid and a ticking macro clock (Life % and Today %) so time feels real before you scroll.

**Mission gate** — While your focus timer is idle, name what you’re here to do. The full focus timer and Intelligence core unlock after you start a session (or use intentional browsing grace).

**Focus timer** — 25/50/90-minute presets, pause/reset, extension badge countdown, and stats (blocks today, minutes, streak). Sessions complete even if you close every Memento tab.

**Optional site friction** — Redirect distracting hosts you choose through a short countdown interstitial. Temporary bypasses expire; rules stay local.

**Privacy-first** — No account, no analytics backend. Settings and stats live in Chrome local storage. See our [privacy policy](../docs/privacy-policy.md) (host `privacy-policy.html` on GitHub Pages or your site before submit).

---

### Permission justifications (reviewer notes)

| Permission | Justification |
|------------|---------------|
| `storage` | Persist birth date, layout, mission, focus stats, friction hosts, and timer state locally. |
| `declarativeNetRequest` + `declarativeNetRequestWithHostAccess` | User-enabled redirects for configured distraction hosts only. |
| `alarms` | Update toolbar badge and record focus completion when no new tab is open. |
| `tabs` | “Back to Memento” from block interstitial opens `chrome://newtab`. |
| Host: `https://dev.to/*` | Optional Intelligence core fetches public dev.to articles; fails gracefully offline. |

## Privacy policy URL

**TODO before publish:** Host `privacy-policy.html` (repo root) or `docs/privacy-policy.md` via GitHub Pages / your domain.

Example: `https://<your-username>.github.io/memento/privacy-policy.html`

Paste that URL in the store “Privacy policy” field.

## Support / contact

| Field | Value |
|-------|--------|
| Support email | TODO: you@example.com |
| Website (optional) | TODO: project homepage |
| Developer name | TODO |

## Icons (included in package)

- 16×16, 48×48, 128×128 PNG in [icons/](../icons/)
- Store dashboard also needs **128×128** and **440×280** promotional tile (create screenshot composite — see below)

## Screenshots (capture manually)

Recommended 1280×800 or 640×400 PNGs on Chrome stable with unpacked extension:

1. **Mission gate + life grid** — Setup complete, idle timer, mission input visible, `#life-grid` and `#age-clock` visible.
2. **Focus timer running** — Badge visible, timer counting, mission text filled.
3. **Settings drawer** — Life tab with birth date; subtitle “No data leaves this device.”
4. **Site friction block** — `block.html` for a test host with countdown.
5. **Intelligence core** (optional) — After first focus today, Signal tab with article cards.

Save under `store/screenshots/` (gitignored until captured) or attach directly in dashboard.

## Promotional copy (optional)

**Tagline:** Your new tab, aligned with your mission.

**Why Memento?** Combines mortality awareness with a lightweight focus ritual — without selling your attention.

## Single purpose statement

Provides a customizable new tab dashboard for personal focus accountability (life timeline visualization, mission prompt, timer, optional browsing friction).

## Data use certification (dashboard)

- Does **not** sell user data
- Does **not** use data for unrelated purposes
- Data handled per [privacy policy](../docs/privacy-policy.md)

## Pre-submit checklist

- [ ] Privacy policy URL live and linked
- [ ] Support email monitored
- [ ] Icons 128/48/16 in manifest (done)
- [ ] Screenshots uploaded
- [ ] [QA.md](../QA.md) manual pass on Chrome stable
- [ ] `npm test` green in CI
