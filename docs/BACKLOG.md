# BACKLOG: the-dive

## Vision

**Polish & juice + Depth & replayability.** 15–30 minute sit-down sessions.
Not chasing content breadth or narrative depth in the near term. Backlog leans
toward (a) interlocking decisions every morning, (b) making the shift
moment-to-moment feel incredible, (c) systems that pay off across a
week-long arc rather than a 3-min run.

## Status

- ✅ **MVP**: playable Day-1 → Day-N loop, planning → shift → results,
  Phaser cinematic, localStorage save, PWA installable, deterministic
  simulator with 6 tests.
- ✅ **Slice 1 — Hire/fire + station UI.** Skeeter and Dee come online,
  segmented Off/Bar/Floor/Door control on each crew card, fire ×.
- ✅ **Slice 2 — Drink prices + upgrade shop.** Per-drink stepper with
  reset-to-suggested, owned-upgrade pills, buy buttons gated on cash.
- ✅ **Slice 3 — Staff traits fire in sim.** Quick / Lazy / Klutz /
  Charming / Surly / Chatty all wired to `runShift` with a `TRAIT` block
  for tuning. 7 new tests. Hire cards translate traits to plain English.
- ✅ **Slice 4 — Shift phases + reputation tiers.** Early / Prime / Last
  Call derived from tick, phase-change `Note` entries tagged with `phase`
  for the visualizer, per-archetype `phaseSpawnMultiplier`, and
  `minReputation` gating. Three new archetypes: Date-Night Couple (rep
  15+), Yelp Reviewer (rep 35+), Wedding Party (rep 60+). 6 new tests.
  Phaser-side phase reaction (tint / time-of-night text) deferred to the
  Slice 5 juice pass.
- ✅ **Slice 5 — Juice pass.** End-of-day newspaper (THE DIVE TIMES,
  serif, body paragraph synthesized from `report.entries`); count-up
  totals on the results screen and a running cash/rep readout in the
  shift header; floating `+$N` cash toasts over the Phaser canvas;
  procedural Web Audio SFX (coin / chime / trombone / glass break)
  triggered per entry, with a global mute toggle persisted to
  localStorage. No new runtime deps.

## Suggested first 5 slices

| # | Slice | Status | Why first | Touches |
|---|-------|--------|-----------|---------|
| 1 | Hire/fire + station assignment UI | ✅ done | Doubles playable surface area in one PR | `PlanningPanel.tsx` |
| 2 | Upgrade shop + drink price UI | ✅ done | Real decisions every morning | `PlanningPanel.tsx` |
| 3 | Staff traits actually firing in sim | ✅ done | First *depth* slice — Klutz / Lazy / Charming / Surly do something | `simulator.ts`, `types.ts` |
| 4 | Shift phases (Early / Prime / Last Call) + rep tiers | ✅ done | Adds rhythm to shifts and visible long-arc progression | `simulator.ts`, `types.ts`, `content.ts` |
| 5 | Juice pass: sound, number animations, end-of-day newspaper | ✅ done | The feel axis — game stops feeling like a prototype | `ResultsPanel.tsx`, `ShiftPanel.tsx`, new `audio.ts` |

After those five, the game is genuinely fun for ~30 min. Then we choose: more
depth (drink crafting, crisis decisions, regulars-with-loyalty) or more polish
(pixel-art sprites, animated bar scene). Recommended: depth next, because
polish without depth runs out of replays fast.

## Full backlog

### A. MVP gaps — surface what's already in code
**A1.** ✅ Hire/fire UI.
**A2.** ✅ Station assignment UI.
**A3.** ✅ Drink price UI.
**A4.** ✅ Upgrade shop.
**A5.** Nightly special UI. `state.nightlySpecialDrinkId` field exists; sim
ignores it. Add: special drink gets +20% spawn weight on customers who like
it, +1 rep per serve. Touches `PlanningPanel.tsx`, `simulator.ts`.

### B. Depth — interlocking systems (the replayability axis)
**B1.** ✅ Staff traits actually fire in sim.
**B2.** Staff mood matters. `HiredStaff.mood` field exists, currently dead.
Mood drifts each shift based on outcomes (busy = +mood for Quick, -mood for
Lazy; getting yelled at = -mood). Below 30 = trait penalties amplify; above
80 = bonuses. Show mood meter on staff card. Touches `simulator.ts`,
`PlanningPanel.tsx`.
**B3.** ✅ Shift phases. `phaseForTick` derives Early/Prime/LastCall;
`phaseSpawnMultiplier` per archetype; phase-change `Note` entries are
tagged with `phase` for the Phaser scene to consume. Phaser tint /
time-of-night text deferred to Slice 5.
**B4.** ✅ Reputation tiers gate customers. `minReputation` added to
`CustomerArchetype`; Date-Night Couple (15+), Yelp Reviewer (35+),
Wedding Party (60+) authored.
**B5.** Inventory / restocking. Each drink has `stockLeft` set from a
morning order; running out mid-shift = walkouts. Player allocates morning
cash between staff/upgrades/stock. Real triage. Touches `types.ts`,
`simulator.ts`, `PlanningPanel.tsx`.
**B6.** Crisis decision moments. Some shift events pause for player input
("Health inspector wants a word — bribe $50 / charm if you have Charm 1.0+
on floor / take the $25 fine"). Modal in `ShiftPanel`. Branching outcomes
injected back into the report. The big jump from "watch a number tick" to
"I'm playing a game". Touches `simulator.ts` (yields a decision),
`ShiftPanel.tsx`, new `DecisionModal.tsx`.
**B7.** Regulars with loyalty. Track per-customer-archetype `loyalty` in
save. Each successful serve +1; walkout -3. Below 0 the archetype stops
spawning for N days. Visible roster in Planning ("The Dive Regulars
haven't been around lately…"). Touches `types.ts`, `simulator.ts`,
`PlanningPanel.tsx`.
**B8.** Drink crafting / signature drinks. Once you own the Cocktail
Shaker upgrade, unlock a "Recipe" screen: combine 2 base drinks →
signature with custom name, +rep on serve. Player-named signatures show up
in shift log. Touches `types.ts`, `content.ts`, new `RecipeBook.tsx`.
**B9.** Weekly milestone goals. Day 7: "make $X or you lose the lease".
Day 14: "rep 30 or the landlord raises the rent". Hard pressure that
forces real choices in mid-week. Game-over screen with restart. Touches
`types.ts`, `App.tsx`, new `MilestoneBanner.tsx`.

### C. Polish & juice — the feel axis
**C1.** ✅ Sound. Built procedurally via Web Audio (no Howler dep, no
asset files) in `src/ui/audio.ts`: coin / chime / trombone / glass-break
SFX triggered per shift entry, plus a global mute toggle persisted to
localStorage. Music loops + jukebox tracks remain unbuilt — would need
real assets and are deferred.
**C2.** ✅ End-of-day newspaper. `composeStory` synthesizes a paragraph
from `report.entries` (crew callouts, event tallies, rep-tier color);
serif "DIVE TIMES" masthead with a four-column totals strip.
**C3.** ✅ Number juice. `useCountUp` hook (RAF + ease-out cubic) drives
animated totals on the results panel; running cash/rep readout in the
shift header; floating `+$N` toasts over the Phaser canvas, larger with
a glow for tips ≥ $25.
**C4.** Phaser scene polish. Parallax dive interior (back wall, jukebox,
neon sign, pool table, dartboard); customers walk to *the bar counter*
instead of a queue line; jukebox light pulses; jukebox sprite shakes when
"eats a quarter" event fires. Touches `PhaserBarScene.ts`.
**C5.** Customer thought bubbles + patience bars. Each waiting customer
shows their preferred drink emoji and a thinning patience bar above their
head. Visible tension. Touches `PhaserBarScene.ts`.
**C6.** Variable tick pacing. Slow ticks during events (let the player
read), faster ticks during quiet stretches, camera punch on a Crisis.
Touches `ShiftPanel.tsx` (timing), `PhaserBarScene.ts` (camera).
**C7.** Pixel-art sprite swap. Establish 16x16 sprite pipeline; replace
emoji with 4-frame walk cycles for the 3 (later 6) customer archetypes
and named staff. Asset gen via free packs first (Kenney) — author later.
Touches `public/sprites/`, `PhaserBarScene.ts`.
**C8.** Animated transitions. Planning → Shift = camera dolly into the
bar; Shift → Results = lights-up cut. Sells the world. Touches `App.tsx`,
`PhaserBarScene.ts`.

### D. Meta / replayability (after first run is fun)
**D1.** Career stats screen on bankruptcy. Days survived, biggest tip,
busiest night, who got fired most.
**D2.** Multiple starting scenarios. "Inherited dive" (default), "Bought a
wreck" (less cash, more disrepair), "Pop-up bar" (3-day timer for huge
profit).
**D3.** Achievement-style milestones. "Survive a health inspector with no
bouncer", "Run a 100% college-kid night", etc.
**D4.** Daily seed challenge. Same seed for everyone today; share your
final cash. Stretch — needs a server or just a "share text" copy button.

### E. Tech & infra
**E1.** GitHub Pages auto-deploy. Workflow on push → builds → publishes.
Public URL for sharing without local install.
**E2.** Real PWA icons. 192 + 512 PNGs (currently the manifest references
files that don't exist).
**E3.** Save migrations. Bump `STORAGE_KEY` on breaking changes; write a
migrator from v1 → v2 so existing saves don't wipe.
**E4.** Settings panel. Mute, music volume, reset save, credits.
**E5.** Bundle splitting. Phaser is 1.4 MB. Lazy-import on first navigation
to ShiftPanel so the planning screen loads instantly.
**E6.** Smoke tests for UI. Render `PlanningPanel`, click "Open the
doors", assert phase transitions. JSDOM + React Testing Library.

## Critical files to be touched (most-changed first)
- `src/ui/PlanningPanel.tsx` — A5, B2, B5, B7
- `src/game/simulator.ts` — A5, B2, B3, B4, B5, B6, B7
- `src/game/types.ts` — B4, B5, B7, B8, B9, E3
- `src/game/content.ts` — B4, B7, B8 (mostly content additions)
- `src/ui/PhaserBarScene.ts` — B3, C4, C5, C6, C7, C8
- `src/ui/ShiftPanel.tsx` — B6, C1, C3, C6
- `src/ui/ResultsPanel.tsx` — C1, C2, C3
- `src/App.tsx` — B6, B9, D2, E5

## Patterns to lean on
- `runShift(state, config, catalog, seed)` in `src/game/simulator.ts` — pure
  function. Every depth feature lands here, with a deterministic test, before
  any UI.
- `catalog` in `src/game/content.ts` — single source of truth.
- `Rng.next/intBetween/pick` in `src/game/rng.ts` — use this, never
  `Math.random`, to keep determinism.
- `applyReport(state, report)` in `src/game/simulator.ts` — central place to
  mutate persisted state from a shift outcome.
- `defaultShiftConfig` in `src/game/types.ts` — knobs for tuning.
- `TRAIT` block at the top of `simulator.ts` — trait magnitudes.

## Verification
- After every slice: `npm run typecheck && npm test && npm run build` clean.
- Each *depth* slice (Section B) lands with at least one new test in
  `simulator.test.ts` pinning the new behavior with a fixed seed.
- Each *content* slice ends with a quick playthrough of Days 1–7 to confirm
  pacing.

## Skipping for now
- Tutorial / onboarding — premature; the game is small enough to learn by
  playing.
- Cloud save / accounts — premature; localStorage is fine.
- Multiple bar locations / themes — fun late-game, but blocks on having one
  bar that's actually deep first.
- IAP, ads, analytics — not the goal.
- iOS native build — PWA on iOS Safari is fine.
- 30-customer / 50-event content explosions — content per slice is fine, but
  a content sprint without new mechanics gets old fast.

## Slice 4 starting notes (for the next session)

The next session can dive into Slice 4 by:
1. Adding a `phase` concept to the simulator: derive Early/Prime/Last Call
   from `tick / tickCount`. Possibly emit `Note` entries on phase boundaries
   for the Phaser scene to react to.
2. Per-phase `spawnWeight` multiplier on customer archetypes — could be
   inline (case statement) or new field on `CustomerArchetype`.
3. Adding `minReputation` to `CustomerArchetype` (mirror the field that
   already exists on `RandomEvent`).
4. Authoring three new customer archetypes in `content.ts`:
   - **Date-Night Couple** (rep 15+, tipMultiplier ~0.30, patience high,
     mishap low — consistent good earners)
   - **Yelp Reviewer** (rep 35+, repInfluence very high in either direction,
     mishap chance amplifies the negative impact)
   - **Wedding Party** (rep 60+, spawn weight high once it hits, may
     overwhelm capacity — last-night-of-the-week pressure)
5. New tests: phase-aware spawn distribution; rep-tier gating; new
   archetypes don't spawn below their `minReputation`.

Be careful: tip-multiplier traits can round small tips to zero (Charming was
+10% before being bumped to +30% for this reason). New archetypes should
have prices/multipliers that produce visible tips at default prices.
