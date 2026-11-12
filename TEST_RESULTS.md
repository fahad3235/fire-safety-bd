# TEST_RESULTS.md — fire-safety-bd

Run date: 2026-11-12 (16:00 slot, Asia/Dhaka). All tests run for real on this
machine; nothing invented.

## Unit tests — 43/43 green

Command: `node tests/logic.test.js`

- Data integrity: 10 risk questions (weights sum 92; 7 yes-risky + 3 no-risky);
  5 extinguisher types, classes A/F/E/C/B; numbers 999, 102, 02223355555;
  checklist 4 groups / 22 items, unique ids; facts total 27,059 with
  electrical 34.7% and cause percentages summing to 66.8; every UI string
  present in both languages; dup-id / bad-weight / bad-answer banks rejected.
- Risk scoring: all-safe → 100 / low / 0 fixes; all-risky → 8 / critical /
  10 fixes; fixes sorted by weight (wiring 12 first); one risky → 88 /
  moderate; four risky → 58 / high; five risky → 50 / high boundary;
  empty answers → 100; band boundaries 90/89/70/69/50/49 all correct.
- Extinguisher lookup: oil → F with water warning; electrical → CO₂;
  unknown id → null.
- Quiz scoring: all-correct 10/10, all-wrong 0/10, half-correct 5/10.
- Checklist progress: 0/22, 3 checked, unknown ids ignored.
- Escape-plan validation: valid plan passes; 0 and 51 members, empty
  meeting point, empty exit 1 rejected; optional exit2/date accepted.
- Formatting: 102 → ১০২; 27,059 → ২৭,০৫৯ in Bengali, unchanged in English.

One repair cycle (test-side only): the first run was 42/43 — the assertion
"5 yes-risky + 5 no-risky" was wrong; the bank is 7 yes-risky + 3 no-risky.
The test was corrected; no app code changed.

## Headless-Chrome smoke tests — 60/60 green

Command: `node tests/smoke.js` (raw CDP, headless_shell-1187, file://)

- Load: title mentions Fire Safety; 7 tabs; risk panel active; first
  question asks about wiring; Next disabled before answering.
- Risk flow (real DOM): all-safe answers → score 100, "Low risk", no-fix
  praise; restart → wiring "yes" + rest safe → score 88, "Moderate risk",
  fix list mentions electrician.
- Extinguisher finder: 5 chips; PASS steps listed; oil → Class F +
  "NEVER use water"; electrical → CO₂ in the use line.
- Emergency: 3 number cards; 999 and 102 present; tel:102 link present;
  4 operator tips.
- Checklist: 22 boxes; tick k1 + e2 → progress "2 / 22"; persists after
  reload (k1 still checked); reset clears all ticks.
- Escape plan: empty submit shows error; valid plan saves, summary shows
  meeting point, persists after reload.
- Quiz: all 10 answered correctly via the live UI → "Correct!" feedback
  every time → result 10; retry restarts at Q1.
- Facts: 6 stat cards; 27,059 total; electrical 34.7%; FSCD source cited.
- Language: toggle → title "ফায়ার সেফটি বিডি"; persists after reload
  (localStorage fsbd-lang = bn); toggle back → en.
- Footer mentions emergency 999.
- Mobile 390px: no horizontal overflow on any of the 7 tabs.
- Zero non-file network requests. 0 console/page errors.
