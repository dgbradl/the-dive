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
- ✅ **Slice 6 — Sepia Tavern reskin.** Adopted the design-system tokens
  (warm sepia palette, Press Start 2P / VT323 / Rye / Special Elite font
  stack, etched borders, no rounded corners) over the entire UI. Pixel
  portraits replace emoji for Marv / Dee / Skeeter on the planning
  panel. Phaser scene preloads sprites and renders the bar with a
  bottle-shelf sprite, wood-paneling backdrop, and the named-archetype
  customers (dive_regular / lost_tourist / rowdy_college_kid + generic
  fallback for the rep-tier archetypes). Newspaper rebuilt as a
  typewriter receipt (Special Elite body, Press Start 2P headline,
  pixel-label totals strip). Wordmark stamp in the planning header.
- ✅ **Slice 7 — Named regulars (B7).** Persistent named regulars
  (Wheezer / Rook / Mike / Doc) with per-regular loyalty. Simulator
  picks a regular from an eligibility pool when their archetype rolls
  to spawn (60% chance when one is available); +1 loyalty on serve, -3
  on walkout; loyalty < 0 stops them from spawning. Save-format bumped
  v1 → v2 with a forward migration. Phaser scene paints the regular's
  uppercase name above their portrait. Newspaper calls them out by
  name. Planning panel gains a "The regulars" roster with portraits,
  last-seen-day, and a loyalty meter. 5 new tests (spawn gating,
  loyalty deltas via applyReport, customerDisplayName surface, plus 2
  save-migration tests in `save.test.ts`).
- ✅ **Slice 8a — HUD chrome + multi-stool seating.** Top chalkboard
  HUD (`SHIFT NN / DAY · phase · clock`), bottom status strip
  (TILL / TIME / HEAT / DAMAGE — heat & damage are stubs), Marv
  bartender dialogue line above a 5-button action bar (POUR / CUT OFF
  / 86 HIM / RING UP / DOOR, all disabled with `[1]..[5]` keyboard
  hints). Phaser scene gains fixed bar-stool seating for named
  regulars + brief arrival speech bubbles per archetype.
- ✅ **Slice 8b — HEAT + DAMAGE in the simulator.** Heat (0..5)
  rises with rowdy/wedding arrivals, mishaps, and walkouts; calmed by
  serves; passive per-tick decay; persists overnight (with overnight
  decay) on `GameState.heat`. Mishap entries get a `damageItem` and
  contribute itemized records to `report.damages`. Each ShiftEntry
  carries `heatAfter` so the HUD samples the running level. The
  status strip now shows real heat pips + dollar damage with item
  list. 4 new tests (damage itemization, heat builds without staff,
  heat is calmer when staffed, applyReport overnight decay).
- ✅ **Slice 8c — Active action bar / crisis decisions (B6).**
  `runShift` stays pure but now produces a `decisions[]` side array
  alongside the deterministic `entries[]`. Each decision attaches to
  a `Decision` entry whose default outcome is already applied. The
  UI replays as before, but pauses on Decision entries, lights up
  the matching action-bar slots (gated by simulator-computed flags
  like `bouncer-on-door`), and lets the player override via click or
  `[1]..[5]` keys. `applyDecisionOverride` swaps the entry's text
  and deltas in place and propagates any heatDelta to subsequent
  entries' heatAfter snapshots. Slice ships with one decision: heat
  ≥ 3.5 → "Rowdy at the bar — POUR / CUT OFF / 86 HIM (bouncer
  required)". 4 new tests.
- ✅ **Slice 8c.1 — Decisions surface in default play.** Lowered the
  heat threshold (3.5 → 2.0), added a customer-mishap trigger, capped
  decisions at 2 per shift with a 5-tick cooldown so the action bar
  fires in roughly half of normal staffed shifts.
- ✅ **Slice 8d — Health-inspector decision; bar-fight Crisis.**
  `RandomEvent.decisionOptions` lets any event become a decision.
  Health Inspector now plays as POUR (Take Fine, default) / RING UP
  (Bribe, requires cash $50) / DOOR (Charm, requires Charming on
  Floor) — finally lights up RING UP and DOOR. Added `bar_fight`
  Crisis event so the bouncer auto-defuse trait still has work for
  non-decision events. 2 new tests.
- ✅ **Slice 8e — Scene layout + ambient extras.** Recomposed the
  Phaser scene into three vertical bands (back wall / bar / floor),
  added two-row tiled bottle shelf, two ellipse tabletops, and step-
  bobbing seated regulars.
- ✅ **Slice 8f — Customers drink with friends.** Replaced the
  ambient wanderers with a real flow: arrive → wait → get served
  → walk to a free table seat (4 seats across two tables) → linger
  with a slow Steps(1) bob. Periodic VT323 chat bubbles ("Cheers!",
  "Ha!", "No way…") pop above random seated customers.
- ✅ **Slice 8g — Patience bars (C5).** Each waiting customer wears
  a stamped panel above their head: drink-preference emoji on the
  left, a thinning bar that drains stain-mint → tavern-amber →
  stain-cherry. Locked to the sprite via Phaser `update()`.
- ✅ **Slice 8h — DOOR-refusal decision.** Heat ≥ 3.5 + new arrival
  swaps the bar-rowdy framing for a door-gating one: POUR (Let In,
  default) / DOOR (Refuse, −0.8 heat). 1 new test.
- ✅ **Slice 8i — Weekly milestones (B9).** Rent of $40/day deducted
  every shift; Day 7 needs $300 cash on hand or the lease is lost
  (game over); Day 14 needs reputation 30 or rent climbs $20/day.
  `MilestoneBanner` on the planning panel; `GameOverPanel` ("Doors
  Closed for Good") matches the receipt aesthetic. 6 new tests.
- ✅ **Slice 8j — Inventory + stockouts (B5).** Drinks have
  `caseSize` and `casePrice`; player buys cases each morning. Per-
  pour cost is now $0 (paid in case purchase). Stocking out on a
  customer's preferred drink → walkout with rep + heat penalty. 2
  new tests.
- ✅ **Slice 8k — Finish the design kit.** Wired in the previously-
  unused vendored assets: `wordmark-neon.svg` is a flickering "Last
  Call" sign on the back wall; `smoke-haze.png` overlays the canvas
  via `.grit-haze`; `grain.png` gives the receipt + game-over card
  paper texture; `water-stain.png` is a faint coffee-ring corner
  accent; `etched-tile.png` adds worn-slate texture to the
  chalkboard.

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
**B5.** ✅ Inventory / restocking. Drinks have `caseSize` + `casePrice`;
player orders cases each morning, per-pour cost is paid up front,
stockouts → walkouts. Slice 8j.
**B6.** ✅ Crisis decision moments. `runShift` produces a `decisions[]`
side array; UI pauses on `Decision` entries and lights up the matching
action-bar slots. Three decisions ship: heat-rowdy, customer-mishap,
door-refusal, plus the health-inspector event-decision. Slices 8c / 8d /
8h.
**B7.** ✅ Regulars with loyalty. Implemented per-regular (not
per-archetype): named instances with their own loyalty score, persisted
across days. Spawn gated on loyalty ≥ 0; +1 on serve, -3 on walkout.
Roster visible in Planning panel with last-seen-day + loyalty meter.
**B8.** Drink crafting / signature drinks. Once you own the Cocktail
Shaker upgrade, unlock a "Recipe" screen: combine 2 base drinks →
signature with custom name, +rep on serve. Player-named signatures show up
in shift log. Touches `types.ts`, `content.ts`, new `RecipeBook.tsx`.
**B9.** ✅ Weekly milestone goals. Rent $40/day; Day 7 lease check ($300
cash) → game over on fail; Day 14 rep check (30) → +$20/day rent on
fail. `MilestoneBanner` + `GameOverPanel`. Slice 8i.

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
**C4.** ⏳ Phaser scene polish. Most done in Slices 8e/8f/8k (back-wall
+ floor bands, neon "Last Call" sign, smoke haze, two tables with seated
customers, named regulars on stools). **Still open:** jukebox sprite
that shakes on "eats a quarter", dartboard, pool table.
**C5.** ✅ Customer thought bubbles + patience bars. Drink emoji + a
thinning bar above each waiting customer's head. Slice 8g.
**C6.** Variable tick pacing. Slow ticks during events (let the player
read), faster ticks during quiet stretches, camera punch on a Crisis.
Touches `ShiftPanel.tsx` (timing), `PhaserBarScene.ts` (camera).
**C7.** ⏳ Pixel-art sprite swap. Static portraits ship in Slice 6 (the
Sepia Tavern asset drop). **Still open:** 4-frame walk cycles for
customer/staff sprites — needs new art that we don't have yet.
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
**E3.** ✅ Save migrations. `STORAGE_KEY` v1 → v2 with a forward
migrator that synthesizes new fields on legacy saves. Slice 7.
**E4.** Settings panel. Mute, music volume, reset save, credits.
**E5.** Bundle splitting. Phaser is 1.4 MB. Lazy-import on first navigation
to ShiftPanel so the planning screen loads instantly.
**E6.** Smoke tests for UI. Render `PlanningPanel`, click "Open the
doors", assert phase transitions. JSDOM + React Testing Library.

## What's still open

**Depth (B):** A5 nightly special, B2 staff mood, B8 signature drinks.
**Polish (C):** C4 (jukebox/dartboard remaining), C6 variable tick
pacing, C7 walk-cycle sprites (needs art), C8 transitions.
**Meta (D):** D1 career stats on bankruptcy, D2 starting scenarios,
D3 achievements, D4 daily seed challenge.
**Tech (E):** E1 GitHub Pages auto-deploy, E2 PWA icons, E4 settings
panel, E5 Phaser bundle splitting, E6 UI smoke tests.

## Critical files for the open items

- `src/ui/PlanningPanel.tsx` — A5, B2, B8
- `src/game/simulator.ts` — A5, B2, B8
- `src/game/types.ts` — B2, B8, D2
- `src/game/content.ts` — A5, B8 (content additions)
- `src/ui/PhaserBarScene.ts` — C4, C6, C7, C8
- `src/ui/ShiftPanel.tsx` — C6
- `src/ui/GameOverPanel.tsx` — D1
- `src/App.tsx` — D2, E5
- `vite.config.ts` — E2, E5
- new `.github/workflows/` — E1
- new `Settings.tsx` — E4

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

## Highest-leverage next moves

1. **E1 GitHub Pages auto-deploy.** Flips the project from "runs
   locally" to "shareable link." Small workflow file; big psychological
   unlock for sharing the build.
2. **D1 Career stats on bankruptcy.** The `GameOverPanel` is begging
   for it; stash a `careerStats` slice that tracks best night, biggest
   tip, longest streak across runs. Turns each run into a record-chase.
3. **B2 Staff mood.** Last fully-dead field on `HiredStaff` (`mood`).
   Mood drifts each shift; <30 amplifies trait penalties, >80 amplifies
   bonuses. Closes the staff depth loop.
