# CLAUDE.md — the-dive

A whimsical turn-based bar management game. PWA, plays in any mobile browser,
installs to a phone home screen.

## Stack
- React 18 + TypeScript + Vite
- Phaser 3 — animated bar scene during the shift cinematic
- vite-plugin-pwa — manifest + service worker
- vitest — unit tests for the simulator

## Layout

```
src/
  game/                     pure TypeScript — no DOM, no Phaser, no React
    types.ts                Station, GameState, ShiftReport, traits, etc.
    content.ts              drinks, customers, staff, events, upgrades — const data
    rng.ts                  Mulberry32 seeded PRNG
    simulator.ts            runShift(state, config, catalog, seed) -> ShiftReport
    save.ts                 newGame / load / save / nextDaySeed
    __tests__/              vitest tests
  ui/                       React components
    PlanningPanel.tsx       morning: hire/fire, station, prices, upgrades
    ShiftPanel.tsx          embeds Phaser + scrolls log
    PhaserBarScene.ts       Phaser scene, animates the report
    ResultsPanel.tsx        end-of-day stats
  App.tsx                   phase state machine + state setters
  main.tsx                  React entry
  index.css                 base styles
```

## Conventions

- **Simulator is a pure function.** `runShift(state, config, catalog, seed)` →
  `ShiftReport`. No DOM, no Phaser, no React, no Math.random. *Every* depth
  feature lands here first, with a deterministic test, before any UI surfaces it.
- **One source of truth for content.** All drinks/customers/staff/events/upgrades
  live in `src/game/content.ts` as `const` arrays. Adding content = appending.
  No Editor, no JSON loading, no asset pipeline.
- **Determinism.** Use `Rng.next/intBetween/pick` — never `Math.random` — inside
  the simulator. Tests rely on `(state, seed)` reproducibility.
- **State is immutable.** All `setState` callers in `App.tsx` produce a new
  object. Persisted via `useEffect` → `save(state)` on every state change.
- **Trait magnitudes** live in the `TRAIT` block at the top of `simulator.ts` —
  tune there, not scattered through the tick loop.
- **Tip math has integer-rounding pitfalls.** Tips round to whole dollars; small
  percentage modifiers can vanish. If you change tip math, re-check the
  Charming/Surly tests; they're statistical for a reason.
- **No emojis in code unless the user asks.** (User-facing emoji on customer
  archetypes / bartender sprites is fine — that's a deliberate design choice
  pending pixel-art swap.)

## Testing

- `npm test` — vitest, runs simulator tests in node env.
- Each new simulator behavior gets at least one test pinning it. Mix
  deterministic-per-seed with statistical-over-many-seeds depending on whether
  the change adds rng calls.
- Build a fabricated `GameCatalog` + `GameState` via the `fixture()` helper in
  `simulator.test.ts` to isolate trait effects.
- `npm run typecheck` — strict TS, must be clean before committing.

## Workflow

- `npm run dev` — Vite dev server at http://localhost:5173.
- `npm run build` — production bundle to `dist/`. Generates `sw.js` and
  `manifest.webmanifest`.
- `npm run preview` — serve the built bundle.
- Phaser is ~1.4 MB of the bundle. Lazy-import is on the backlog (E5) but
  hasn't shipped yet.

## Where we are

- Slices 1–7 + 8a + 8b are shipped. 8b added real HEAT + DAMAGE
  to the simulator: `GameState.heat` (0..5) carries overnight; rowdy
  / wedding arrivals, mishaps, and walkouts raise it; serves and
  passive per-tick decay calm it. Mishap entries gain a `damageItem`
  and contribute itemized records to `report.damages`. Every
  `ShiftEntry` carries a `heatAfter` snapshot so the HUD reads the
  running level by replaying entries. The status strip's HEAT pip
  meter and DAMAGE cell now show real values with item lists.
- 8c shipped: `runShift` stays pure but produces a `decisions[]`
  side array. The UI replays entries; on a `Decision` entry it
  pauses, lights up the matching action-bar slots (gated by sim
  flags like `bouncer-on-door`), and waits for click or `[1]..[5]`.
  `applyDecisionOverride` swaps the entry's deltas in place and
  propagates any heatDelta to subsequent `heatAfter` snapshots. One
  decision shipped: heat ≥ 3.5 fires "Rowdy at the bar — POUR /
  CUT OFF / 86 HIM (bouncer required)".
- The screenshot-shape is now fully implemented end-to-end. Future
  decisions (health inspector, door refusals, customer cut-offs)
  plug into the same `RandomEvent.options` / `applyDecisionOverride`
  surface.

## Don't

- Don't `git push` without being asked.
- Don't `git commit` without being asked.
- Don't `git push --force` or rewrite history without explicit permission.
- Don't add features beyond the current slice. Backlog items have been
  intentionally sequenced to frontload payoff and avoid premature abstraction.
- Don't fork the simulator into per-feature pipelines. New behavior threads
  through `runShift` and is gated by data on the relevant archetypes/upgrades.
