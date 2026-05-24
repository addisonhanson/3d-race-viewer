import { useMemo } from 'react'
import type { Vec3 } from '../lib/gpx'
import { computeRouteDistancesKm, interpolateOnRoute } from '../lib/gpx'

interface Props {
  points: Vec3[]
  currentKm: number
  elevationScale: number
  stageSize: number
}

export function RiderDot({ points, currentKm, elevationScale, stageSize }: Props) {
  const distances = useMemo(() => computeRouteDistancesKm(points), [points])
  const pos = useMemo(
    () => interpolateOnRoute(points, distances, currentKm, elevationScale),
    [points, distances, currentKm, elevationScale],
  )

  if (points.length === 0) return null

  const r = stageSize * 0.008

  return (
    <group position={[pos.x, pos.y + r, pos.z]}>
      <mesh>
        <sphereGeometry args={[r * 1.8, 16, 16]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.15} depthWrite={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[r, 16, 16]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </group>
  )
}
