# 3D Race Viewer

Interactive 3D viewer for GPX cycling routes, built for the 2026 Giro d'Italia.

## Features

- **Stage mode** — view each of the 21 stages individually with elevation profile, grade coloring, and stats
- **Overview mode** — all 21 stages rendered simultaneously on a shared coordinate system; click a stage to highlight it
- Grade-colored curtain mesh (descent → flat → steep → very steep)
- Per-stage stats: distance, elevation gain, max elevation, max gradient
- Elevation exaggeration slider
- Camera controls with reset button

## Controls

| Input | Action |
|---|---|
| Left drag | Rotate |
| Right drag | Pan |
| Scroll | Zoom |
| ← → | Switch stage |

## Dev

```bash
npm install
npm run dev
```

## Adding stages

GPX files live in `public/stages/` named `stage-N-route.gpx`. Stage metadata (name, type) is in `src/lib/stages.ts`.

GPX files sourced from [CyclingStage.com](https://www.cyclingstage.com/gpx-2026-pro-cycling-races/) — a great resource for pro cycling race routes.

## Stack

React · Vite · Three.js · @react-three/fiber · @react-three/drei
