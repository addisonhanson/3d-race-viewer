import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import type { Vec3 } from '../lib/gpx'

interface Props {
  points: Vec3[]
  elevationScale: number
  opacity?: number
}

function gradeToColor(grade: number): THREE.Color {
  const c = new THREE.Color()
  if (grade <= 0) {
    c.lerpColors(new THREE.Color('#4ade80'), new THREE.Color('#60a5fa'), Math.min(1, -grade / 8))
  } else if (grade < 4) {
    c.lerpColors(new THREE.Color('#4ade80'), new THREE.Color('#facc15'), grade / 4)
  } else if (grade < 8) {
    c.lerpColors(new THREE.Color('#facc15'), new THREE.Color('#f97316'), (grade - 4) / 4)
  } else {
    c.lerpColors(new THREE.Color('#f97316'), new THREE.Color('#ef4444'), Math.min(1, (grade - 8) / 6))
  }
  return c
}

function computeBlockColors(points: Vec3[]): THREE.Color[] {
  const n = points.length
  const rawGrades: number[] = []
  for (let i = 0; i < n - 1; i++) {
    const p0 = points[i], p1 = points[i + 1]
    const horiz = Math.sqrt((p1.x - p0.x) ** 2 + (p1.z - p0.z) ** 2)
    rawGrades.push(horiz > 0 ? ((p1.y - p0.y) / horiz) * 100 : 0)
  }

  const hw = Math.min(40, Math.max(10, Math.floor(rawGrades.length * 0.015)))
  const smoothed = rawGrades.map((_, i) => {
    const lo = Math.max(0, i - hw), hi = Math.min(rawGrades.length - 1, i + hw)
    let sum = 0
    for (let j = lo; j <= hi; j++) sum += rawGrades[j]
    return sum / (hi - lo + 1)
  })

  // Group consecutive segments whose smoothed grade stays within threshold of block average
  const GRADE_THRESHOLD = 2.0
  const pointColors = new Array<THREE.Color>(n)
  let bStart = 0, bSum = smoothed[0], bCount = 1

  const flushBlock = (endPt: number) => {
    const color = gradeToColor(bSum / bCount)
    for (let i = bStart; i <= endPt; i++) pointColors[i] = color
  }

  for (let i = 1; i < smoothed.length; i++) {
    if (Math.abs(smoothed[i] - bSum / bCount) > GRADE_THRESHOLD) {
      flushBlock(i)
      bStart = i; bSum = smoothed[i]; bCount = 1
    } else {
      bSum += smoothed[i]; bCount++
    }
  }
  flushBlock(n - 1)

  return pointColors
}

function buildGeometry(points: Vec3[], elevationScale: number) {
  const colors = computeBlockColors(points)
  const n = points.length

  const linePos = new Float32Array(n * 3)
  const lineCol = new Float32Array(n * 3)
  points.forEach((p, i) => {
    linePos[i * 3] = p.x
    linePos[i * 3 + 1] = p.y * elevationScale
    linePos[i * 3 + 2] = p.z
    const c = colors[i]
    lineCol[i * 3] = c.r; lineCol[i * 3 + 1] = c.g; lineCol[i * 3 + 2] = c.b
  })
  const lineGeom = new THREE.BufferGeometry()
  lineGeom.setAttribute('position', new THREE.BufferAttribute(linePos, 3))
  lineGeom.setAttribute('color', new THREE.BufferAttribute(lineCol, 3))

  const curtainPos = new Float32Array(n * 2 * 3)
  const curtainCol = new Float32Array(n * 2 * 3)
  for (let i = 0; i < n; i++) {
    const p = points[i], y = p.y * elevationScale
    const c = colors[i]
    curtainPos[i * 6] = p.x;     curtainPos[i * 6 + 1] = y; curtainPos[i * 6 + 2] = p.z
    curtainPos[i * 6 + 3] = p.x; curtainPos[i * 6 + 4] = 0; curtainPos[i * 6 + 5] = p.z
    curtainCol[i * 6] = c.r;           curtainCol[i * 6 + 1] = c.g;           curtainCol[i * 6 + 2] = c.b
    curtainCol[i * 6 + 3] = c.r * 0.2; curtainCol[i * 6 + 4] = c.g * 0.2;   curtainCol[i * 6 + 5] = c.b * 0.2
  }
  const indices: number[] = []
  for (let i = 0; i < n - 1; i++) {
    const t0 = i * 2, b0 = i * 2 + 1, t1 = (i + 1) * 2, b1 = (i + 1) * 2 + 1
    indices.push(t0, b0, t1, b0, b1, t1)
  }
  const curtainGeom = new THREE.BufferGeometry()
  curtainGeom.setAttribute('position', new THREE.BufferAttribute(curtainPos, 3))
  curtainGeom.setAttribute('color', new THREE.BufferAttribute(curtainCol, 3))
  curtainGeom.setIndex(indices)
  curtainGeom.computeVertexNormals()

  return { lineGeom, curtainGeom }
}

export function Route3D({ points, elevationScale, opacity = 1 }: Props) {
  const line = useMemo(() => new THREE.Line(
    new THREE.BufferGeometry(),
    new THREE.LineBasicMaterial({ vertexColors: true, transparent: true })
  ), [])
  const curtain = useMemo(() => new THREE.Mesh(
    new THREE.BufferGeometry(),
    new THREE.MeshStandardMaterial({ vertexColors: true, transparent: true, side: THREE.DoubleSide })
  ), [])

  useEffect(() => {
    const { lineGeom, curtainGeom } = buildGeometry(points, elevationScale)
    line.geometry.dispose()
    curtain.geometry.dispose()
    line.geometry = lineGeom
    curtain.geometry = curtainGeom
  }, [points, elevationScale, line, curtain])

  useEffect(() => {
    line.material.opacity = opacity
    ;(curtain.material as THREE.MeshStandardMaterial).opacity = opacity * 0.65
  }, [opacity, line, curtain])

  useEffect(() => () => {
    line.geometry.dispose()
    curtain.geometry.dispose()
    line.material.dispose()
    ;(curtain.material as THREE.Material).dispose()
  }, [line, curtain])

  return (
    <>
      <primitive object={line} />
      <primitive object={curtain} />
    </>
  )
}
