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
- ✅ **Slice 9 — Nightly special (A5).** `state.nightlySpecialDrinkId`
  is live: +20% pick weight when the customer prefers it, +1 rep on
  serve. New "Tonight's special" pill row in PlanningPanel.
- ✅ **Slice 10 — Staff mood (B2).** `HiredStaff.mood` drifts each
  shift (Quick gains busy, Lazy drains, walkouts dock customer-facing
  staff, mishaps dock the named culprit). Below 30 amplifies harmful
  traits + dampens beneficial ones; above 80 reverses. Per-staff
  trait math (Charming/Surly tip mult, Quick capacity, Klutz drop
  chance, Chatty patience). Mood meter on staff cards.
- ✅ **Slice 11a — Recipe book (B8).** New Cocktail Shaker upgrade
  ($250) gates a recipe screen. Players author named `Signature`
  drinks from two base drinks; persisted via save migration v2 → v3.
- ✅ **Slice 11b — Signatures get poured (B8).** Customers whose
  preferred list overlaps a signature's bases sometimes order it.
  Each pour consumes one unit of EACH base; stockout on either →
  walkout naming the missing ingredient. +2 rep + 20% tip multiplier
  on signature serves. Newspaper calls them out by name.
- ✅ **Slice 12 — Career stats on bankruptcy (D1).** Cross-run
  ledger in `bargame.career.v1`: runsPlayed, daysSurvivedTotal,
  bestRunDays, bestRunCash, biggestTip, busiestNight. Updated on
  shift end (recordShift) and run end (recordRunEnd, fired on lease
  loss or manual reset). New CAREER LEDGER card on GameOverPanel.
  5 new tests.
- ✅ **Slice 13 — Jukebox (C4 partial).** Small upright jukebox
  between the floor tables: lit amber screen flickers every 4s,
  cabinet shakes for a beat when an 'eats a quarter' Event fires.
- ✅ **Slice 14 — Variable tick pacing (C6).** Cinematic timing per
  entry kind: Event 600 ms, Mishap 500 ms, phase Note 500 ms, Wages
  200 ms, default 220 ms. Crisis-flavored Events (inspector / fight /
  scrap / brawl) trigger a 220 ms camera shake + 120 ms amber flash.
- ✅ **Slice 15 — Starting scenarios (D2).** Three pickable starts:
  Inherited Dive (default), Bought a Wreck (tighter cash + higher
  rent), Pop-Up Bar (no rent, no regulars). New scenario picker on
  GameOverPanel. `state.scenarioId` records which run is active.
- ✅ **Slice 16 — Phaser bundle split (E5).** ShiftPanel dynamic-
  imports Phaser + BarScene on first navigation. Main bundle 1.65 MB
  → 204 KB; planning + game-over screens load instantly.
- ✅ **Slice 17 — Animated transitions (C8).** 700 ms dolly overlay
  on planning → shift; 500 ms lights-up cut on shift → results.
- ✅ **Slice 18 — Achievements (D3).** Seven starter unlocks
  (First Night, Crowded House, Lease Survivor, Big Tipper, Stockout
  King, Mixologist, Spotless). Persisted across runs in
  `careerStats.unlockedAchievements`. Newly-unlocked banner on the
  results screen; N / M progress on the CAREER LEDGER.
- ✅ **Slice 19 — Settings sheet (E4).** Modal opened from a gear
  button in the planning header: Sound toggle, Volume slider (with
  audio.ts volume multiplier), Reset save (confirm-gated), credits.
- ✅ **Slice 20 — PWA icons + branding (E2).** Manifest pointed at
  missing `icon-192.png` / `icon-512.png`; replaced with the
  existing `favicon.svg` (sizes: 'any', maskable). Renamed app:
  BarGame → The Dive; theme color updated to tavern-soot.
- ✅ **Slice 21 — Wall dartboard (C4 finish).** Three concentric
  circles + three cherry dart marks, mounted on the back wall right
  of the door. Pool table skipped — floor already crowded.
- ✅ **Slice 22 — Daily seed challenge (D4).** Fourth scenario
  with a UTC-date-derived djb2 RNG seed; new dailyShareText helper
  + Copy-result button on GameOverPanel.
- ✅ **Slice 23 — UI smoke tests (E6).** RTL + JSDOM coverage of
  the React shell — planning load, shift transition, skip → results
  → lock up, settings open/close. Phaser mocked to no-op stubs.

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
**A5.** ✅ Nightly special. `state.nightlySpecialDrinkId` lights up:
+20% pick weight + +1 rep per serve. Slice 9.

### B. Depth — interlocking systems (the replayability axis)
**B1.** ✅ Staff traits actually fire in sim.
**B2.** ✅ Staff mood matters. `HiredStaff.mood` drifts per shift; per-
staff trait magnitudes scale via `moodScale(mood, kind)`. UI mood meter
on each staff card. Slice 10.
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
**B8.** ✅ Drink crafting / signature drinks. Cocktail Shaker upgrade
gates a recipe screen; signatures consume one unit of each base on serve;
+2 rep + 20% tip multiplier; named in receipt. Slices 11a + 11b.
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
**C4.** ⏳ Phaser scene polish. Done across Slices 8e / 8f / 8k / 13 /
21: back-wall + floor bands, neon "Last Call" sign, smoke haze, two
tables with seated customers, named regulars on stools, jukebox that
shakes on "eats a quarter", wall dartboard. **Still open:** pool
table (floor's already busy — flagged as low priority).
**C5.** ✅ Customer thought bubbles + patience bars. Drink emoji + a
thinning bar above each waiting customer's head. Slice 8g.
**C6.** ✅ Variable tick pacing. Per-entry ms in `tickMsFor`; Crisis
events trigger a camera shake + amber flash. Slice 14.
**C7.** ⏳ Pixel-art sprite swap. Static portraits ship in Slice 6 (the
Sepia Tavern asset drop). **Still open:** 4-frame walk cycles for
customer/staff sprites — needs new art that we don't have yet.
**C8.** ✅ Animated transitions. 700 ms dolly overlay (planning → shift)
+ 500 ms lights-up cut (shift → results). Slice 17.

### D. Meta / replayability (after first run is fun)
**D1.** ✅ Career stats screen on bankruptcy. CAREER LEDGER card on
GameOverPanel with runsPlayed / bestRunDays / bestRunCash /
biggestTip / busiestNight / lifetimeDays. Slice 12.
**D2.** ✅ Multiple starting scenarios. Inherited Dive / Bought a Wreck /
Pop-Up Bar. Picker on game-over screen. Slice 15.
**D3.** ✅ Achievement-style milestones. Seven authored, unlocked-once
list persisted on `careerStats.unlockedAchievements`. Slice 18.
**D4.** ✅ Daily seed challenge. UTC-date djb2 seed; share-text Copy
button on GameOverPanel. Slice 22.

### E. Tech & infra
**E2.** ✅ Real PWA icons. Manifest now references the existing
`favicon.svg` with `sizes: 'any'` + `purpose: 'any maskable'`. App
renamed BarGame → The Dive. Slice 20.
**E3.** ✅ Save migrations. `STORAGE_KEY` v1 → v2 → v3 with forward
migrators that synthesize new fields on legacy saves. Slices 7 + 11a.
**E4.** ✅ Settings panel. Sheet opened from a gear in the planning
header: sound toggle, volume slider, reset save, credits. Slice 19.
**E5.** ✅ Bundle splitting. Phaser dynamic-imports on first ShiftPanel
mount. Main bundle 1.65 MB → 204 KB. Slice 16.
**E6.** ✅ Smoke tests for UI. RTL + JSDOM coverage of the React
shell with Phaser mocked. Slice 23.

## What's still open from A–E

Two known gaps remain from the original punch list:

- **C4 — pool table** on the floor. Skipped during 21; floor is busy.
- **C7 — walk-cycle sprites.** Needs new pixel-art (4-frame walk
  cycles per archetype + named staff). Asset blocker.

## F. Future ideas (post-A–E)

Brainstorming bin. Items are sized roughly: **S** (single short slice),
**M** (one focused session), **L** (multi-slice or needs design pass).
Pick what's interesting; many of these are mutually independent.

### F1. Content additions
- **F1.1.** More drinks (Margarita, Manhattan, Old Fashioned, Hot Toddy). Each with caseSize/casePrice + tip multiplier feel. **S**
- **F1.2.** More customer archetypes — Off-Duty Cop (high tip, low patience, neutralizes Crisis events), Hipster (tips well for signature drinks specifically), Snowed-In Trucker (low rep gate, big drinker). **M**
- **F1.3.** More named regulars — extend the roster from 4 to ~10 so the bar feels populated even after a few walkouts. **S**
- **F1.4.** More events — power outage (-rep but +heat decay), big-game-on-TV (boosts rowdy spawn), snowstorm (everyone's patience +2 because nowhere else to go). **M**
- **F1.5.** More upgrades — Better Lights (rep +1 per night), Velvet Rope (door staff effectiveness +20%), Late-Night Menu (unlocks 2 new drinks at rep 25+). **M**
- **F1.6.** More achievements — 8–10 more (Rep 50, no-mishap-week, all-signatures-served-in-one-night, etc.). **S**

### F2. Mechanics depth
- **F2.1.** Drink quality matters. `Drink.quality` is currently dead; fold it into tip math (high-quality drinks tip ~15% more). **S**
- **F2.2.** Reputation tiers visible. Unlock a rep "title" each 20 points: Nobody's Bar → Neighborhood Spot → The Place → Legendary. Show on planning header. **S**
- **F2.3.** Drink prep time. `Drink.prepTicks` is dead; bartender can only serve one drink per `prepTicks` window. Lets Quick trait matter more. **M**
- **F2.4.** Tip jar mechanic. Server-station staff get a separate tip pool; player can add it to next-day cash or distribute as a mood boost. **M**
- **F2.5.** Pricing pressure. Customers walk if a drink's price ≥ N× its suggested. Currently free margin dial. **S**
- **F2.6.** Heat contagion. A rowdy customer raises the heat contribution of nearby customers; clustering on stools matters. **M**
- **F2.7.** Cover charge at the door. Optional flat fee on entry (slows arrivals, guarantees revenue). **S**
- **F2.8.** Loyalty perks. Every Nth serve to a regular is on the house — they tip extra next time. **M**
- **F2.9.** Group orders. Wedding Party orders 4 drinks at once, eats more capacity. **S**
- **F2.10.** Health code score. Damage events accumulate to a "health code" hidden stat; high values force the inspector to fire harder. **M**

### F3. Visual / juice
- **F3.1.** Phase transition flourish. Big "PRIME TIME" / "LAST CALL" banner sweeps across the canvas at phase boundaries instead of just a chalkboard label change. **S**
- **F3.2.** Per-customer cash popups in the canvas. Today the cash toast floats from the right side; emit it from the customer's position so you see who tipped who. **S**
- **F3.3.** Marv yells at the rowdy. During a heat decision, briefly tween the camera onto the troublemaker; speech bubble shows Marv's prompt. **M**
- **F3.4.** End-of-night flourish. Marv waves; lights dim; receipt slides up. Plays before the typewriter receipt. **S**
- **F3.5.** Per-scenario bar decor. Pop-Up Bar has a different back wall (string lights instead of bottle shelf). Bought a Wreck has visible water-stain damage. **M**
- **F3.6.** Crowd density visualization. When >5 customers waiting, draw silhouettes in the queue beyond the visible 5 to imply pressure. **S**
- **F3.7.** Receipt printer animation. The receipt rolls down from the top of the screen on game-over instead of fading in. **S**

### F4. UX / quality of life
- **F4.1.** First-run tutorial overlay. Tooltips on each section the very first time the player sees the planning panel. **M**
- **F4.2.** HUD tooltips. Hover (or tap-and-hold) on TILL / HEAT / DAMAGE for one-line explanations. **S**
- **F4.3.** Milestone progress bar. Visual fill toward the lease target on the banner instead of just numbers. **S**
- **F4.4.** Confirm before firing staff. The fire-× is one click; add a confirm. **S**
- **F4.5.** Replay last shift button. From the game-over or planning, watch the cinematic again to diagnose the night. **M**
- **F4.6.** Compact-vs-detailed log toggle. Filter the shift log to just decisions / mishaps / serves. **S**
- **F4.7.** Keyboard shortcut on planning. Space → Open the doors. **S**
- **F4.8.** Pause button mid-shift. The cinematic pauses on decisions today; add an explicit pause for reading the log. **S**

### F5. Meta / progression
- **F5.1.** Run history log. Last 10 runs with date, scenario, days survived, final cash. Lives on the title screen behind a "History" disclosure. **M**
- **F5.2.** Persistent unlocks. Spend career-stat currency on permanent perks (start with +$50, mood +5, etc.). **L** — needs a small currency loop.
- **F5.3.** Local leaderboard. Top 5 best runs by days survived; surfaced on the title screen + game-over. **S**
- **F5.4.** Difficulty modifiers. Per-scenario knobs the player picks: rent-up, fewer-regulars, no-bouncer-allowed. Increases the daily-challenge surface area. **M**

### F6. Sound design
- **F6.1.** Procedural ambient bar chatter loop. Generated via Web Audio (multiple low-volume tone-buffer sources at random pitches). No asset dep. **M**
- **F6.2.** Per-decision SFX. Distinct cues for POUR (bottle pour), CUT OFF (whistle), 86 HIM (door slam). **S**
- **F6.3.** Real music tracks. Two short loops (CC0) — quiet for Early/Prime, louder for Last Call. Adds Howler dep. **L** — asset hunt + loop-point selection.

### F7. Tech & infra
- **F7.1.** Error boundary. Catch runtime errors with a "fresh start" button instead of white-screening. **S**
- **F7.2.** Service worker update prompt. When `vite-plugin-pwa` detects a new version, surface a "Refresh for the latest" toast. **S**
- **F7.3.** Localization-ready. Move user-facing strings into a single dictionary so future translation is mechanical. **M**
- **F7.4.** Color-blind alt palette. A toggle in Settings to swap stain-cherry / stain-mint to texture-coded variants. **M**
- **F7.5.** Performance pass. Profile the shift cinematic on a low-end Android; trim Phaser draw calls if needed. **M**

### F8. Stretch — bigger directions
- **F8.1.** Multi-bar tycoon mode. Once you survive 30 days you can buy a second venue with shared career stats but separate runs. **L**
- **F8.2.** Story / narrative thread. Letters from the landlord, a shady investor, a romantic regular. Threaded across runs as small newspaper inserts. **L**
- **F8.3.** Card-pull deck of nightly modifiers. Before each shift, pick 1 of 3 face-up cards from a deck (e.g. "Bachelor party in town", "Blizzard"). Player feels agency over the random side. **L**
- **F8.4.** Wholesaler relationships. Multiple suppliers per drink, cheaper bulk rates after N orders, occasional shortages. **L**
- **F8.5.** Real PNG icons + screenshots. Generate proper 192/512 PNG icons (currently SVG-only) and a few launch screenshots for richer install metadata. **S**

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

Picks from F that punch above their weight:

1. **Content sprint** = F1.1 + F1.2 + F1.4 (drinks, archetypes, events)
   in one slice. Pure additions to `src/game/content.ts`, plus 2 new
   tests. The most visible per line of code.
2. **F2.1 — Drink quality matters.** Single-line fix to the tip math
   that revives a dead field; high-quality drinks suddenly feel
   different to make. Smallest depth-feeling change.
3. **F2.2 — Reputation tier title** on the planning header
   ("Neighborhood Spot", "Legendary"). Reads as long-arc progress
   without a UI rework.
4. **F4.2 — HUD tooltips.** Tap-and-hold/hover explanations for
   TILL / HEAT / DAMAGE — kills the "what does this mean?" friction
   without a full tutorial.
5. **F6.1 — Procedural ambient bar chatter loop.** Layers under the
   existing SFX with no new dependency. The shift goes from "list
   of pings" to "you're in a bar."
6. **F4.1 — First-run tutorial.** Less critical now that the title
   screen sets context, but still smooths the first 60 seconds for
   a stranger.

Bigger directions (F8) are on the menu when the moment-to-moment
game feels solid. Tuning is best done in your hand, not in a
plan — keep playing and notice where your attention goes.
