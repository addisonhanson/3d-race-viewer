# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A React + Three.js viewer that renders professional cycling race routes (GPX tracks) in 3D, with elevation exaggeration, grade-based coloring, and a world map backdrop. Originally built for the 2026 Giro d'Italia; GPX data for the 2026 Tour de France and Vuelta a España has since been added under `public/stages/` but there's no race selector yet — the app only loads the Giro (see "Known in-progress state" below).

## Commands

```bash
npm install       # install deps
npm run dev       # start Vite dev server
npm run build      # tsc -b (project references) + vite build
npm run lint       # eslint .
npm run preview    # preview production build
```

There is no test suite configured. To sanity-check stage classification (flat/hilly/mountain/tt) against the hardcoded values in `src/lib/stages.ts`, run:

```bash
npx tsx scripts/classify-stages.ts
```

This script reads GPX files directly from `public/stages/giro-2026/`, computes distance/elevation/gradient stats with a standalone GPX parser (not `src/lib/gpx.ts`), and diffs the auto-classification against the `CURRENT` map hardcoded in the script.

## Architecture

**Data flow:** `public/stages/**/*.gpx` → fetched at runtime → parsed by `gpxparser` (`src/lib/gpx.ts`) → projected from lat/lon to local 3D meters → rendered by Three.js via `@react-three/fiber`.

- **`src/lib/stages.ts`** — hardcoded list of `STAGES` (number, name, type, GPX filename) and the `TYPE_BADGE` color/label map for stage types (`flat`, `hilly`, `mountain`, `tt`). This is the single source of truth for which stages exist and their display metadata; there's no dynamic directory listing.
- **`src/lib/gpx.ts`** — pure functions, no React/Three deps:
  - `parseGpx` — GPX XML → `RoutePoint[]` (lat/lon/ele).
  - Equirectangular projection centered on the route (or a shared center across all routes, via `getSharedProjectionParams`/`getProjectionParams`) converts lat/lon to local `Vec3` (x/z in meters, y = raw elevation). Distances are small enough that this flat projection is accurate.
  - `computeStats` — distance, elevation gain, max elevation, max gradient (used for stat display and stage classification).
  - `classifyStage` — heuristic thresholds on gain/km and elevation gain to assign a `StageType`; this logic is duplicated (not imported) in `scripts/classify-stages.ts` for offline batch checking.
  - `computeRouteDistancesKm` / `interpolateOnRoute` — arc-length parameterization used to animate the rider dot along the route by "current km" rather than by point index.
- **`src/lib/useRouteData.ts`** — the central data hook. Fetches every stage's GPX in parallel on mount (`allRoutes`), computes one **shared** projection origin across all loaded routes (so stage and overview modes share the same world coordinates), memoizes per-stage and global bounding boxes, and derives `loading`/`loadedCount` for the loading overlay.
- **`App.tsx`** — top-level state: `mode` (`'stage' | 'overview'`), `stageIndex`, `focusedInOverview`, `elevationScale`, `currentKm`, and a `resetKey` that increments whenever mode/stage changes to force the camera to re-home (see `CameraController`). Camera position/target/far are derived from whichever bounds are active (`stageBounds` in stage mode, `globalBounds` in overview mode) via `cameraForBounds`.
- **Rendering components** (`src/components/`):
  - `Route3D` — builds two geometries per route: a colored line (the track) and a "curtain" mesh dropping from the track down to y=0, colored by locally-smoothed gradient (grouped into constant-color blocks so color transitions aren't noisy per-point). `elevationScale` scales the y-axis only; x/z stay in real meters.
  - `WorldMap` — renders country outlines from `world-atlas`/`topojson-client`, projected through the same shared projection params so it lines up with the routes.
  - `RiderDot` — a marker interpolated along the active stage's route at `currentKm`, driven by `BottomBar`'s elevation-profile scrubber.
  - `CameraController` — wraps drei's `OrbitControls`; re-homes the camera only when `resetKey` changes (intentionally excluded from its own effect deps).
  - `TopBar` / `LeftPanel` / `BottomBar` / `ColorLegend` / `StageLabels` / `LoadingOverlay` — UI chrome; stage stats and elevation profile are computed from the hook/lib layer, not recomputed in components.
- **Modes:** in `stage` mode, only the active stage's `Route3D` + `RiderDot` render. In `overview` mode, all stages render simultaneously in the shared coordinate system; clicking a stage dot in `TopBar` sets `focusedInOverview`, dimming (not hiding) the others via `opacity`.

## Known in-progress state

- GPX files live in per-race subdirectories (`public/stages/giro-2026/`, `tour-2026/`, `vuelta-2026/`). `src/lib/stages.ts` currently hardcodes `file` paths to the `giro-2026/` prefix, so the app only loads the Giro. `useRouteData.ts`'s fetch (`/stages/${s.file}`) works as long as `file` includes the race segment. Wiring in an actual race selector (switching the prefix / building separate `STAGES` per race) is unfinished work, referenced in recent commits as "the stage and phase qualifier engine."
- `scripts/classify-stages.ts` has its own copy of GPX parsing and `classifyStage`/`computeStats` logic (regex-based, not using `src/lib/gpx.ts`) and is hardcoded to the `giro-2026` directory — keep this in mind if extending classification logic, since a fix in `src/lib/gpx.ts` won't propagate here.

## Adding/editing stages

GPX files go under `public/stages/<race>/`. Stage display metadata (name, type, filename) is declared in `src/lib/stages.ts`. GPX source: [CyclingStage.com](https://www.cyclingstage.com/gpx-2026-pro-cycling-races/).
