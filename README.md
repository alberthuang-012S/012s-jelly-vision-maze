# Jelly Vision Maze｜晶亮迷宮

A dependency-free browser game about exploring foggy mazes with Jelly. Six fixed routes span two chapters, with keyboard and touch controls, a following camera, and local progress.

## Run

Requires Node.js 22 or later. No package installation is needed.

```powershell
npm run dev
```

Open `http://localhost:4173`. To run beside another Jelly project:

```powershell
$env:JELLY_PORT = '4185'
npm run dev
```

Open `http://localhost:4185`.

## Controls

- WASD / arrow keys: move; on touchscreens, hold the D-pad.
- Q / 脈衝: illuminate a seven-cell, 72-degree cone in the direction Jelly faces for exactly two seconds. The origin and direction are fixed when fired; movement or turning does not steer an active pulse. Roads and objects in the cone become visible, with only a dim explored trace retained after expiry. Start with two charges; an ECHO or beacon restores one, up to two. There is a 1.2-second cooldown.
- Esc / pause button: pause or resume. Leaving the tab or window pauses automatically; resume explicitly.
- R / restart button: restart the current route.
- Camera button: switch between following Jelly and the explored map. Phones default to following. Follow mode automatically widens and frames the full illuminated area, including vision boosts and directional pulses. It accounts for both viewport dimensions, widens immediately, and eases back in after the effect ends.
- Sound button: toggle synthesized sound effects; the preference is saved.

## Campaign

All routes are available immediately. Chapter buttons keep the route selector compact. The expandable field guide explains pulses, beacons, and stars. A journey suggestion selects the first unfinished route, then the first route below three stars once every route is cleared. Results show the exact collection shortfall for the next attempt and celebrate improved star records independently from score records.

| Chapter | Route | Objective |
| --- | --- | --- |
| 微光初旅 | 01 Soft Start / 微光花園 | Find the exit |
| 微光初旅 | 02 Blue Detour / 藍色水道 | Find the exit |
| 微光初旅 | 03 Glow Divide / 水晶迴廊 | Find the exit |
| 信標遠征 | 04 Amber Signal / 琥珀信標 | Light 1 beacon, then reach the exit |
| 信標遠征 | 05 Moss Circuit / 苔光環路 | Light 2 beacons, then reach the exit |
| 信標遠征 | 06 Aurora Nexus / 極光交匯 | Light 3 beacons, then reach the exit |

The expedition routes use fixed seeds to create repeatable branching mazes with alternate paths. Their exits occupy terminal corridors, so collecting everything does not force an early clear. Each new route includes four supplies and six to eight ECHOs. Beacons activate automatically on approach. Until every beacon is lit, the exit remains closed and visibly marked. The pulse illuminates the area ahead, including walls and objects, using the same through-wall visibility convention as normal vision. It does not select a destination or calculate a route.

Normal vision has a three-cell radius. Chocolate expands it to six cells for eight seconds. A drink adds eight seconds to an active chocolate boost, or provides a weaker 4.5-cell view for eight seconds. Explored cells retain a quiet memory trace. Exploration percentage counts walkable cells only.

Route 1 remains a safe tutorial. Routes 2–6 add 2/3/4/4/4 ink traps, and routes 3–6 add 1/1/2/3 shadow creatures. Traps repeat a six-second cycle: 3.2 seconds resting, 0.8 seconds of gold warning, then two seconds of ink. Creatures patrol fixed connected corridors at 0.85 cells/second, much slower than Jelly. Hazards stay away from the spawn, exit, and pickups. Contact reduces vision to 1.65 cells for three seconds and grants five seconds of protection from that hit; it cannot stack. Supplies clear ink immediately. Existing boost timers continue and any remaining boost returns after ink expires. Ink never erases exploration or removes stars.

At firing time, Q seals traps in its cone for four seconds and stuns creatures for three seconds, alongside its two-second illumination. This works through walls like the light cone. The HUD shows ink/protection countdowns; dashed rings indicate protection. Only currently visible creatures are drawn, while explored traps keep a muted location marker. Pause freezes all hazard timers and patrols; restart resets them. Follow mode never zooms closer than its normal vision framing during ink. Clearing a hazard route without contact earns an extra result badge.

ECHOs are optional pickups with an eight-second chain window: each awards `80 + chain × 40` points; finding them all adds 250. Every activated beacon adds 150. Clearing awards 1000, supplies award 100 each, and a time bonus of up to 420 uses a level-specific budget. The budget only affects score; there is no time limit or failure for exploring slowly. Products are game-only supplies with no health or medical claims.

## Stars and saved progress

Each run earns one star for clearing, one for every ECHO, and one for every supply. Best stars, best score, fastest clear, and ECHO completion persist independently per route in this browser. Three stars require both collections in the same run. The journal shows completed routes and up to 18 stars. Existing v1 records preserve scores/times and infer only stars supported by saved data. Blocked storage falls back to session memory.

## Implementation

- `Game.js`: scene lifecycle, pause, scoring, and rendering.
- `levelConfig.js` / `expeditionLevels.js`: campaign data and deterministic expedition layouts.
- `Maze.js` / `Player.js` / `Camera.js`: collision, exploration memory, movement, and adaptive camera.
- `VisionSystem.js` / `SupplySystem.js` / `EchoSystem.js`: temporary vision, pickups, and chains.
- `BeaconSystem.js`: activation, exit locks, and beacon rendering.
- `HazardSystem.js` / `hazardLayout.js`: deterministic encounters, trap warnings, patrols, pulse suppression, and contact protection.
- `ScanSystem.js`: directional illumination, two-second lifetime, charges, cooldown, and pulse rendering.
- `HUD.js` / `main.js` / `ProgressStore.js`: UI, chapter navigation, results, and saved progress.

Canvas resolution adapts up to 2× display density. Ambient effects respect reduced-motion preferences. Paused scenes stop requesting animation frames. Older sibling-game modules are preserved but are not imported by this game's runtime.

## Validation and deployment

```powershell
npm test
npm run build
```

The 32 regression tests cover real movement through all six routes with full collections and scoring, collision, pause/restart/input cleanup, camera bounds, illuminated-area framing across aspect ratios and directions, smooth return zoom, exploration, vision expiry, ECHO chains, repeatable layouts, locked exits, pulse direction/visibility/recharge/expiry, keyboard shortcuts, storage migration, hazard placement, patrol collision, trap warnings, ink recovery and protection, pulse suppression, and frozen hazard timers on pause. Browser checks cover desktop and mobile game layout and controls.

The build validates every runtime module's syntax and relative imports, map widths, and the reachability of exits, supplies, ECHOs, and beacons. It runs tests before writing `dist/`. GitHub Pages deploys that validated directory; running the build does not publish it.



