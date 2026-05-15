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

export function projectRoute(points: RoutePoint[]): Vec3[] {
  if (points.length === 0) return []

  const centerLat = points.reduce((s, p) => s + p.lat, 0) / points.length
  const centerLon = points.reduce((s, p) => s + p.lon, 0) / points.length
  const cosLat = Math.cos(centerLat * Math.PI / 180)

  return points.map(p => ({
    x: (p.lon - centerLon) * Math.PI / 180 * EARTH_RADIUS_M * cosLat,
    z: -(p.lat - centerLat) * Math.PI / 180 * EARTH_RADIUS_M,
    y: p.ele,
  }))
}

export interface BoundingBox {
  min: Vec3
  max: Vec3
  center: Vec3
  size: number  // largest dimension
}

export function computeBounds(points: Vec3[]): BoundingBox {
  const min = { x: Infinity, y: Infinity, z: Infinity }
  const max = { x: -Infinity, y: -Infinity, z: -Infinity }
  for (const p of points) {
    if (p.x < min.x) min.x = p.x
    if (p.y < min.y) min.y = p.y
    if (p.z < min.z) min.z = p.z
    if (p.x > max.x) max.x = p.x
    if (p.y > max.y) max.y = p.y
    if (p.z > max.z) max.z = p.z
  }
  const center = {
    x: (min.x + max.x) / 2,
    y: (min.y + max.y) / 2,
    z: (min.z + max.z) / 2,
  }
  const size = Math.max(max.x - min.x, max.y - min.y, max.z - min.z)
  return { min, max, center, size }
}
