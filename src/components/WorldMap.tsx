import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { mesh } from 'topojson-client'
import worldData from 'world-atlas/countries-110m.json'
import { projectGeoPoint, type ProjectionParams } from '../lib/gpx'

interface Props {
  projectionParams: ProjectionParams
}

function buildGeometry(params: ProjectionParams): THREE.BufferGeometry {
  const landMesh = mesh(worldData, worldData.objects.land)
  const positions: number[] = []
  for (const line of landMesh.coordinates) {
    for (let i = 0; i < line.length - 1; i++) {
      const [lon0, lat0] = line[i] as [number, number]
      const [lon1, lat1] = line[i + 1] as [number, number]
      const p0 = projectGeoPoint(lat0, lon0, params)
      const p1 = projectGeoPoint(lat1, lon1, params)
      positions.push(p0.x, 0, p0.z, p1.x, 0, p1.z)
    }
  }
  const geom = new THREE.BufferGeometry()
  geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3))
  return geom
}

export function WorldMap({ projectionParams }: Props) {
  const linesObj = useMemo(() => new THREE.LineSegments(
    new THREE.BufferGeometry(),
    new THREE.LineBasicMaterial({ color: '#2d4a6b', opacity: 0.7, transparent: true })
  ), [])

  useEffect(() => {
    linesObj.geometry.dispose()
    linesObj.geometry = buildGeometry(projectionParams)
  }, [projectionParams, linesObj])

  useEffect(() => () => {
    linesObj.geometry.dispose()
    linesObj.material.dispose()
  }, [linesObj])

  return <primitive object={linesObj} />
}
