import GpxParser from 'gpxparser'

export interface RoutePoint {
  lat: number
  lon: number
  ele: number
}

export function parseGpx(gpxText: string): RoutePoint[] {
  const gpx = new GpxParser()
  gpx.parse(gpxText)
  const track = gpx.tracks[0]
  if (!track) throw new Error('No track found in GPX')
  return track.points.map(p => ({
    lat: p.lat,
    lon: p.lon,
    ele: p.ele ?? 0,
  }))
}

export interface Vec3 {
  x: number
  y: number
  z: number
}

const EARTH_RADIUS_M = 6_371_000

export interface ProjectionParams {
  centerLat: number
  centerLon: number
  cosLat: number
}

export function getProjectionParams(points: RoutePoint[]): ProjectionParams {
  const centerLat = points.reduce((s, p) => s + p.lat, 0) / points.length
  const centerLon = points.reduce((s, p) => s + p.lon, 0) / points.length
  return { centerLat, centerLon, cosLat: Math.cos(centerLat * Math.PI / 180) }
}

export function getSharedProjectionParams(allRoutes: RoutePoint[][]): ProjectionParams {
  let minLat = Infinity, maxLat = -Infinity
  let minLon = Infinity, maxLon = -Infinity
  for (const points of allRoutes) {
    for (const p of points) {
      if (p.lat < minLat) minLat = p.lat
      if (p.lat > maxLat) maxLat = p.lat
      if (p.lon < minLon) minLon = p.lon
      if (p.lon > maxLon) maxLon = p.lon
    }
  }
  const centerLat = (minLat + maxLat) / 2
  const centerLon = (minLon + maxLon) / 2
  return { centerLat, centerLon, cosLat: Math.cos(centerLat * Math.PI / 180) }
}

export function projectGeoPoint(lat: number, lon: number, p: ProjectionParams): { x: number; z: number } {
  return {
    x: (lon - p.centerLon) * Math.PI / 180 * EARTH_RADIUS_M * p.cosLat,
    z: -(lat - p.centerLat) * Math.PI / 180 * EARTH_RADIUS_M,
  }
}

export function projectRoute(points: RoutePoint[], params?: ProjectionParams): Vec3[] {
  if (points.length === 0) return []
  const p = params ?? getProjectionParams(points)
  return points.map(pt => {
    const { x, z } = projectGeoPoint(pt.lat, pt.lon, p)
    return { x, z, y: pt.ele }
  })
}

export function computeBounds(points: Vec3[]): { center: Vec3; size: number } {
  const xs = points.map(p => p.x)
  const zs = points.map(p => p.z)
  const minX = Math.min(...xs), maxX = Math.max(...xs)
  const minZ = Math.min(...zs), maxZ = Math.max(...zs)
  return {
    center: { x: (minX + maxX) / 2, y: 0, z: (minZ + maxZ) / 2 },
    size: Math.max(maxX - minX, maxZ - minZ),
  }
}

export interface StageStats {
  distanceKm: number
  elevationGainM: number
  maxElevationM: number
  maxGradePct: number
}

export function computeStats(points: RoutePoint[]): StageStats {
  let distanceM = 0
  let elevationGainM = 0
  let maxElevationM = -Infinity
  let maxGradePct = 0

  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1], p1 = points[i]
    const dlat = (p1.lat - p0.lat) * Math.PI / 180 * EARTH_RADIUS_M
    const dlon = (p1.lon - p0.lon) * Math.PI / 180 * EARTH_RADIUS_M * Math.cos(p0.lat * Math.PI / 180)
    const horiz = Math.sqrt(dlat * dlat + dlon * dlon)
    distanceM += horiz
    const dEle = p1.ele - p0.ele
    if (dEle > 0) elevationGainM += dEle
    if (horiz > 0) maxGradePct = Math.max(maxGradePct, (dEle / horiz) * 100)
    maxElevationM = Math.max(maxElevationM, p1.ele)
  }
  if (points.length > 0) maxElevationM = Math.max(maxElevationM, points[0].ele)

  return {
    distanceKm: distanceM / 1000,
    elevationGainM,
    maxElevationM,
    maxGradePct,
  }
}

export function computeRouteDistancesKm(points: Vec3[]): number[] {
  const dists = [0]
  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1], p1 = points[i]
    const dx = p1.x - p0.x, dz = p1.z - p0.z
    dists.push(dists[i - 1] + Math.sqrt(dx * dx + dz * dz) / 1000)
  }
  return dists
}

export function interpolateOnRoute(
  points: Vec3[],
  distancesKm: number[],
  targetKm: number,
  elevationScale: number,
): Vec3 {
  if (points.length === 0) return { x: 0, y: 0, z: 0 }
  const clamped = Math.max(0, Math.min(targetKm, distancesKm[distancesKm.length - 1]))
  let lo = 0, hi = distancesKm.length - 1
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1
    if (distancesKm[mid] <= clamped) lo = mid
    else hi = mid
  }
  const segLen = distancesKm[hi] - distancesKm[lo]
  const t = segLen > 0 ? (clamped - distancesKm[lo]) / segLen : 0
  const p0 = points[lo], p1 = points[hi]
  return {
    x: p0.x + (p1.x - p0.x) * t,
    y: (p0.y + (p1.y - p0.y) * t) * elevationScale,
    z: p0.z + (p1.z - p0.z) * t,
  }
}

