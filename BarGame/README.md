# BarGame — Whimsical Bar Management

A turn-based mobile bar management game. Start with a dive bar, hire cooky staff,
serve crazy customers, weather mishaps, build it up.

## Status

MVP scaffold — all runtime C# scripts in place. Scene, prefabs, and
ScriptableObject `.asset` instances must be created in the Unity Editor (see
**First-time setup** below).

## Open in Unity

1. Install **Unity Hub** and **Unity 6 LTS (6000.0.x)** with the **Android Build Support** module.
2. In Unity Hub: **Add → Add project from disk** → select this `BarGame/` folder.
3. Open the project. First open will take a few minutes (Unity generates `Library/`).
4. If your installed Unity version differs from `6000.0.23f1` in
   `ProjectSettings/ProjectVersion.txt`, Unity Hub will offer to upgrade — accept.

## First-time setup (in Unity Editor)

The repo contains code only. After Unity finishes importing, you need to create
the runtime assets it references:

1. **Scene** — `File → New Scene → 2D (Built-in Render Pipeline)`. Save as `Assets/Scenes/Main.unity`.
2. **GameManager** — In the scene, `GameObject → Create Empty`, name it
   `GameManager`, attach `Scripts/Core/GameManager.cs`.
3. **Canvas** — `GameObject → UI → Canvas`. On the Canvas Scaler, set
   `UI Scale Mode = Scale With Screen Size`, reference resolution **1080×1920**,
   match **0.5**.
4. **Panels** — under the Canvas, create three empty UI panels: `PlanningPanel`,
   `ShiftPanel`, `ResultsPanel`. Attach the matching scripts from `Scripts/UI/`.
5. **UIRouter** — on the Canvas, attach `UIRouter.cs` and drag the three panels
   into its inspector slots.
6. **Catalog assets** — In `Assets/ScriptableObjects/`, right-click → `Create → BarGame → ...`
   to author at least:
   - 3 Drinks (`PBR`, `Whiskey Sour`, `House Special`)
   - 3 Customer Archetypes (`Dive Regular`, `Lost Tourist`, `Rowdy College Kid`)
   - 3 Staff (`Marv the Bartender`, `Skeeter the Bouncer`, `Dee the Server`)
   - 5 Events (`Jukebox eats a quarter`, `Singalong erupts`, `Health inspector!`, `Toilet overflows`, `Regular brings friends`)
   - 2 Upgrades (`Better Stools`, `New Sign`)
7. **GameCatalog** — `Create → BarGame → GameCatalog`, drag your authored assets into its lists. Drag the catalog onto `GameManager`.
8. **Build target** — `File → Build Settings → Android → Switch Platform`.
9. **Player Settings** — set orientation to **Portrait**, Company/Product names as you like.

## Run

`Edit → Play`. You should land on the Planning panel for Day 1.

## Tests

`Window → General → Test Runner → EditMode → Run All`.

## Architecture

```
Assets/Scripts/
  Core/   GameState, GameManager, SaveSystem, GameCatalog, Station
  Data/   ScriptableObject types — content authored in the Editor
  Sim/    Pure-C# turn-based shift simulator (no MonoBehaviour, no Unity API)
  UI/     UIRouter + three panel MonoBehaviours
Assets/Tests/EditMode/
          ShiftSimulatorTests — deterministic seeded sim tests
```

The shift simulator is pure C# so it's deterministic, replayable, and
unit-testable. UI just animates the resulting `ShiftReport`.

## Save

JSON saved to `Application.persistentDataPath/save.json`. One slot.
