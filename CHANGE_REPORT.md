# Jelly Vision Maze｜核心體驗與探索辨識優化變更報告

## Scope

This pass focuses on the first-play experience without changing the campaign identity of routes 4–6.

- Reworked routes 1–3 as authored, reachable branch networks with a clear teaching arc: safe vision discovery, supply timing, then risk-versus-safety routing.
- Added `rulesVersion: 2` to the revised routes and kept old progress records in the same `jellyVisionMaze.progress.v1` storage key. Current bests are compared within the active rules version; historical stars and completion remain visible.
- Localized route names, supplies, HUD status, scan text, pickup effects, exit feedback, and confirmation copy in Chinese.
- Added confirmation flows for partial exit, restart, and leaving an active run. Confirmation states freeze animation, timers, hazards, and input; cancellation restores the previous paused/playing state.
- Rebalanced the game screen for small phones: compact status, collapsed explanation panel, 48px movement controls, 64px pulse control, minimum maze heights, and a landscape side-control layout.

## Route changes

| Route | New teaching purpose | Authored content |
| --- | --- | --- |
| 01 第一次看見 | Learn vision and branching without hazards | 1 chocolate, 3 ECHOs, no traps or monsters |
| 02 視野接力 | Learn that supplies can be planned as a sequence | Chocolate-to-drink alternate route, 2 traps, 3 ECHOs |
| 03 看見風險 | Compare a short risky route with a longer safe route | Trap/patrol risk lane, hazard-free long route, 3 supplies, 4 ECHOs |

Routes 4–6 keep their existing generated maps, seeds, beacon requirements, supplies, and hazard plans.

## Verification

- `npm test` — 38/38 passing.
- `npm run build` — passing; runtime imports, map dimensions, reachability, and tests validated before `dist/` output.
- Browser checks performed against the local app at desktop size, 390×844, 375×667, 360×640, and landscape mobile size. The three portrait checks measured maze heights of 440px, 302px, and 280px respectively, with 48px movement controls and a 64px pulse control.
- Pause, restart, and leave dialogs were inspected in the browser. Authored route movement, supply effects, ECHO chaining, partial-exit freeze/cancel/re-arm, and versioned progress separation are covered by automated tests.

## Environment limits

- No physical-device session was available; mobile validation used browser viewport emulation and DOM geometry checks.
- Existing local services occupied ports 4173 and 4185, so the running app was verified on the already available local 4185 instance. No external deployment or push was performed.

## Exploration recognition pass

This follow-up adds exploration memory without conflating “seen”, “visited”, and “currently visible”.

- `Maze.explored` remains the exposed-area record and continues to drive the percentage. `Maze.visited` is a separate per-cell set populated only when Jelly physically occupies an already-exposed walkable cell. Reveal effects, pulse light, pause, camera changes, and the memory toggle never add visited cells.
- Supplies have per-object `discovered` state. The state is committed only while the supply is currently visible through normal vision or the active pulse cone. Echo reveal alone does not discover a supply. A collected supply is removed from the active memory layer.
- The canvas order keeps bright current objects separate from low-alpha memory layers. Explored terrain is drawn by `Maze`; small dot footprints are drawn by `Maze.drawFootprints`; discovered-but-hidden supplies use hollow dashed outlines; landmarks use low-alpha dashed thematic outlines. No memory layer adds a counter or changes scoring.
- `LandmarkSystem` provides exactly two fixed, walkable, non-colliding landmarks on each of routes 1–3. They are scene cues only and have no pickup, hazard, exit, collision, or scoring behavior. Routes 4–6 normalize to an empty landmark list.

### Fixed landmark table

| Route | Landmark | Cell | Intended reading |
| --- | --- | --- | --- |
| 01 微光花園 | Flower bed | (8, 1) | Upper branch hub / first orientation cue |
| 01 微光花園 | Plant border | (15, 8) | Exit-side return junction |
| 02 藍色水道 | Water ripple | (7, 7) | Central split where the two supply routes meet |
| 02 藍色水道 | Stone bank | (19, 7) | Exit-side waterway split |
| 03 水晶迴廊 | Crystal cluster | (5, 3) | Upper branch landmark before the risk lane |
| 03 水晶迴廊 | Cracked pillar | (17, 13) | Lower convergence landmark near the finish route |

### Information surface and preview rules

- The existing folded `探索資訊／玩法說明` panel now contains the exploration legend, a soft-outline orientation-landmark cue, and `顯示探索記憶` toggle. It does not add another always-visible metrics row.
- Opening the panel silently pauses gameplay, timers, hazard movement, and input without opening the modal pause dialog. Closing it resumes the same run. Escape closes the panel first; the ordinary pause button remains available when the panel is closed.
- Leaving copy explicitly states that unsettled mid-run exploration progress is not retained; already saved historical records are unaffected. Restart and leave reset the run-local visited/discovery sets.
- Route cards show a thematic abstract preview while the selected route has no completion under its current rules version. The full map preview appears only after current-version completion; legacy records alone do not unlock it.

## Verification for this pass

- `npm test` — **43/43 passing**.
- `npm run build` — **passing**; 6 levels, 21 runtime modules, and 14 required files validated.
- Browser checks — **passing in the local Codex browser** at `http://localhost:4185/` for 360×640, 375×667, 390×844, 430×932, 844×390, and 1366×768. Portrait maze heights measured 280px, 302px, 440px, and 440px; touch direction buttons measured 48×48px; pulse controls measured 64px high. Landscape and desktop captures showed no visible viewport overflow. The expanded information panel stayed visible, held `#time-value` at `00:11` across a 650ms observation, and left the modal pause dialog closed. The route-1 preview exposed the abstract thematic canvas with `aria-label="尚未完成目前規則版本的主題示意圖"`; the game capture showed the directional pulse cone and cooldown state.
- Screenshots — **inline browser captures verified during this run; no persistent screenshot files were created**. The visual checkpoints were the home abstract preview, desktop game canvas, expanded exploration panel, and active pulse state.
- Physical devices — **not verified**; these are emulated browser viewports, so no real-device claim is made.
- Deployment — **not performed**; no push, GitHub Pages publish, or external service mutation was made.
