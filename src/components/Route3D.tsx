import { useMemo } from 'react'
import * as THREE from 'three'
import type { Vec3 } from '../lib/gpx'

interface Props {
  points: Vec3[]
}

export function Route3D({ points }: Props) {
  const geometry = useMemo(() => {
    const geom = new THREE.BufferGeometry()
    const positions = new Float32Array(points.length * 3)
    points.forEach((p, i) => {
      positions[i * 3] = p.x
      positions[i * 3 + 1] = p.y
      positions[i * 3 + 2] = p.z
    })
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return geom
  }, [points])

  return (
    <line>
      <primitive object={geometry} attach="geometry" />
      <lineBasicMaterial color="orange" />
    </line>
  )
}