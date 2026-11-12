# Fire Safety BD — অগ্নি-নিরাপত্তা বাংলাদেশ

An offline, bilingual (English / বাংলা) fire-safety companion for Bangladesh.
It helps any household check its fire risk, pick the right extinguisher,
know the emergency numbers, keep a safety checklist, write an escape plan,
and learn the answers that save lives.

## The problem

Bangladesh recorded **27,059 fires in 2025 — about 75 a day** — killing 85
people and injuring 267 (Fire Service & Civil Defence, Feb 2026).
Electrical faults caused **34.7%** of them; cigarette stubs, stoves and gas
leaks caused most of the rest. Residential buildings were the most affected.
Most of these fires are preventable with a few habits — but most households
have never checked their own risk, do not own an extinguisher, and do not
have an escape plan.

## Features

1. **Home fire-risk check** — 10 questions (wiring, multi-plugs, heaters,
   LPG cylinder, leak checks, cooking, smoking, exits, extinguisher,
   escape knowledge) → a 0–100 score, a Low / Moderate / High / Critical
   band, and a fix-list ordered by what matters most.
2. **Extinguisher finder** — pick what is burning (wood/paper, cooking oil,
   electrical, gas, petrol) → the right extinguisher class (A / F / E / C / B)
   and what you must *never* do (e.g. never water on oil or live electrics),
   plus the PASS steps (Pull, Aim, Squeeze, Sweep).
3. **Emergency numbers** — 999 (National Emergency Service), 102 (Fire
   Service & Civil Defence hotline), 02223355555 (FSCD Central Control
   Room), with tap-to-call links and the four things to tell the operator.
4. **Room-by-room safety checklist** — 22 items across kitchen, electrical,
   bedroom & living room, exits & equipment; progress saved on the device.
5. **Household escape plan** — household size, meeting point, two escape
   routes, last practice date; saved on the device, printable.
6. **Fire-safety quiz** — 10 questions with plain-language explanations
   (oil fires, stop-drop-roll, smoke, gas smell, lifts, being trapped, PASS,
   the 102 hotline).
7. **The numbers** — the official 2025 FSCD figures with causes and sources.
8. **Bilingual throughout** — every screen in English and বাংলা, with
   Bengali digits; language choice persists. Fully offline, no account,
   nothing leaves the device. Works at 390px mobile width.

## Stack

- Plain HTML + CSS + JavaScript — no framework, no build step, no network
  requests at runtime.
- `js/data.js` — all content (strings, questions, checklist, quiz, facts).
- `js/logic.js` — pure functions (risk scoring, bands, quiz scoring,
  checklist progress, escape-plan validation, Bengali digits).
- `js/i18n.js` — language state (localStorage).
- `js/app.js` — rendering and interaction.
- Tests: `tests/logic.test.js` (node unit tests), `tests/smoke.js`
  (headless-Chrome CDP smoke test).

## Prerequisites

- Any modern browser. To run the tests: Node.js 18+ and the cached
  headless Chromium used by the smoke test (see Testing).

## Install & run

```bash
# just open it — no install, no server needed
open index.html
# or serve it locally
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Testing

```bash
node tests/logic.test.js   # 43 unit checks
node tests/smoke.js        # 60 headless-Chrome checks (tabs, risk flows,
                           # extinguisher finder, checklist + escape-plan
                           # persistence, full quiz, Bengali toggle,
                           # 390px overflow, zero network requests,
                           # zero console/page errors)
```

Real results (2026-11-12): **43/43 unit checks green, 60/60 smoke checks
green, 0 console/page errors.** See `TEST_RESULTS.md` for the full log.

## Deployment

Static site — any static host works. GitHub Pages (main branch, root):
<https://fahad3235.github.io/fire-safety-bd/>

## Facts & sources

See `DATA_NOTES.md`. Key facts: 999 is the National Emergency Service;
102 is the Fire Service & Civil Defence hotline (16163 was retired at the
end of 2024); 2025 FSCD figures (27,059 fires, 85 deaths, 267 injured,
electrical faults 34.7%) come from the FSCD press release reported by BSS,
TBS and The Daily Star, 10–11 Feb 2026.

## Limitations

- This is a public-awareness guide, **not** an official Fire Service app.
  In an emergency, call **999 or 102 first** — do not open an app.
- The risk score is an awareness estimate from 10 questions, not a
  professional fire-risk assessment. A licensed electrician and the Fire
  Service are the authority for a real inspection.
- Extinguisher guidance is general (classes A / B / C / E / F). If a fire
  is bigger than a wastebasket, do not fight it — leave and call for help.
- 2025 figures are the latest published at build time; check the Fire
  Service for newer releases.

## Status

Complete MVP, tested, published. Offline-first; no backend, no analytics.
