#!/usr/bin/env node
// Reads all stage GPX files, computes stats, and prints classification results
// vs. the current hardcoded types in stages.ts

import { readFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const STAGES_DIR = join(__dirname, '../public/stages/giro-2026')

const EARTH_RADIUS_M = 6_371_000

interface GpxPoint {
  lat: number
  lon: number
  ele: number
}

interface StageStats {
  distanceKm: number
  elevationGainM: number
  maxElevationM: number
  phases: RacePhaseType[]
}

// overall stage type and/or finish type
type StageType = 
  'sprint'          |
  'hill_sprint'     |
  'hills'           |
  'medium_mountain' |
  'high_mountain' 

// type of a specific section of the race
type RacePhaseType =
  'hills'           |
  'cobbles'         |
  'valley'          |
  'rolling'         |
  'false_flat_up'   |
  'false_flat_down' |
  'none'

function parseGpxManual(text: string): GpxPoint[] {
  const points: GpxPoint[] = []
  const re = /<trkpt\s+lat="([^"]+)"\s+lon="([^"]+)"[^>]*>\s*(?:<ele>([^<]*)<\/ele>)?/g
  let m
  while ((m = re.exec(text)) !== null) {
    points.push({
      lat: parseFloat(m[1]),
      lon: parseFloat(m[2]),
      ele: m[3] != null ? parseFloat(m[3]) : 0,
    })
  }
  return points
}

function computeStats(points: GpxPoint[]): StageStats {
  let distanceM = 0
  let elevationGainM = 0
  let maxElevationM = points.length > 0 ? points[0].ele : 0
  const phases: RacePhaseType[] = []
 
  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1], p1 = points[i]
    const dlat = (p1.lat - p0.lat) * Math.PI / 180 * EARTH_RADIUS_M
    const dlon = (p1.lon - p0.lon) * Math.PI / 180 * EARTH_RADIUS_M * Math.cos(p0.lat * Math.PI / 180)
    const horiz = Math.sqrt(dlat * dlat + dlon * dlon)
    distanceM += horiz
    const dEle = p1.ele - p0.ele
    if (dEle > 0) elevationGainM += dEle
    maxElevationM = Math.max(maxElevationM, p1.ele)
  }

  return {
    distanceKm: distanceM / 1000,
    elevationGainM,
    maxElevationM,
    phases 
  }
}

function classifyStage(stats: StageStats): StageType {
  if (stats.distanceKm < 60) return 'tt'
  const gainPerKm = stats.elevationGainM / stats.distanceKm
  if (gainPerKm > 22 || (stats.elevationGainM > 3500 && stats.maxElevationM > 1500)) return 'mountain'
  if (gainPerKm > 11) return 'hilly'
  return 'flat'
}

const CURRENT: Record<number, StageType | string> = {
  1: 'hilly', 2: 'tt', 3: 'hilly', 4: 'flat', 5: 'hilly',
  6: 'hilly', 7: 'hilly', 8: 'mountain', 9: 'mountain', 10: 'flat',
  11: 'mountain', 12: 'hilly', 13: 'flat', 14: 'mountain', 15: 'mountain',
  16: 'flat', 17: 'mountain', 18: 'hilly', 19: 'mountain', 20: 'tt', 21: 'flat',
}

const files = readdirSync(STAGES_DIR)
  .filter(f => f.match(/^stage-\d+-route\.gpx$/))
  .sort((a, b) => {
    const na = parseInt(a.match(/\d+/)?.[0] ?? '0')
    const nb = parseInt(b.match(/\d+/)?.[0] ?? '0')
    return na - nb
  })

console.log('Stage  Dist(km)  Gain(m)  MaxEle(m)  Gain/km  Auto       Current    Match?')
console.log('─'.repeat(80))

let mismatches = 0
for (const file of files) {
  const num = parseInt(file.match(/\d+/)?.[0] ?? '0')
  const text = readFileSync(join(STAGES_DIR, file), 'utf8')
  const points = parseGpxManual(text)
  const stats = computeStats(points)
  const auto = classifyStage(stats)
  const cur = CURRENT[num] ?? '?'
  const match = auto === cur ? '✓' : '✗'
  if (auto !== cur) mismatches++
  console.log(
    `  ${String(num).padEnd(3)}  ${stats.distanceKm.toFixed(1).padStart(8)}  ${Math.round(stats.elevationGainM).toString().padStart(7)}  ${Math.round(stats.maxElevationM).toString().padStart(9)}  ${(stats.elevationGainM / stats.distanceKm).toFixed(1).padStart(7)}  ${auto.padEnd(9)}  ${cur.padEnd(9)}  ${match}`
  )
}
console.log('─'.repeat(80))
console.log(`${mismatches} mismatch(es)`)
