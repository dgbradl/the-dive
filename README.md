# BarGame

A fun, whimsical, turn-based mobile bar management game. Start as a dive,
hire cooky staff, serve crazy customers, weather mishaps. Built as a
React + TypeScript + Phaser PWA so it runs in any mobile browser and
installs as an app.

## Stack
- **React + TypeScript + Vite** — UI shell, state, build tooling
- **Phaser 3** — animated bar scene during the shift "cinematic"
- **vite-plugin-pwa** — installable on phones, works offline
- **vitest** — fast unit tests for the simulator

## Develop

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # run unit tests
npm run typecheck    # tsc strict mode
npm run build        # production build to dist/
npm run preview      # serve the built bundle
```

To test the PWA on your phone, run `npm run dev -- --host` and open the LAN
URL in your phone's browser; "Add to Home Screen" installs it.

## Architecture

```
src/
  game/         pure TypeScript — the simulator and content data
    types.ts    Station, GameState, ShiftReport, etc.
    content.ts  drinks, customers, staff, events, upgrades — all const data
    rng.ts      seeded RNG (mulberry32)
    simulator.ts  pure function: (state, seed) -> ShiftReport
    save.ts     localStorage save/load
    __tests__/  vitest tests
  ui/           React components
    App.tsx     state machine: Planning -> Shift -> Results -> Planning
    PlanningPanel.tsx
    ShiftPanel.tsx       (mounts the Phaser game, scrolls the log)
    ResultsPanel.tsx
    PhaserBarScene.ts    Phaser scene that animates the report
  main.tsx      React entry
  index.css     base styles
```

The simulator is a **pure function** — no DOM, no Phaser, no React. That's
what makes it deterministic, testable, and trivially portable if we ever
move engines again.

## Game loop

1. **Morning Planning** — view cash/rep, see your staff. (Hire, prices, and
   upgrades land in subsequent slices.)
2. **Shift** — Phaser scene plays out the night; React panel scrolls the log
   alongside.
3. **Results** — earnings, rep delta, wages, headline. Tap to advance.
4. Save on every Results screen → next day.
