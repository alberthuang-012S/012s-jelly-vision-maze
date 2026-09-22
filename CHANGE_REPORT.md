# Jelly Vision Maze｜核心體驗優化變更報告

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
