import { useState, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { FilePicker } from './components/FilePicker'
import { Route3D } from './components/Route3D'
import { parseGpx, projectRoute, computeBounds, type RoutePoint } from './lib/gpx'

function App() {
  const [route, setRoute] = useState<RoutePoint[] | null>(null)

  const projected = useMemo(
    () => (route ? projectRoute(route) : []),
    [route]
  )
  const bounds = useMemo(
    () => (projected.length > 0 ? computeBounds(projected) : null),
    [projected]
  )

  const handleFileLoaded = (text: string) => {
    try {
      const points = parseGpx(text)
      console.log(`Loaded ${points.length} points`)
      setRoute(points)
    } catch (err) {
      console.error('Failed to parse GPX:', err)
    }
  }

  const cameraPosition: [number, number, number] = bounds
    ? [bounds.center.x + bounds.size, bounds.center.y + bounds.size * 0.6, bounds.center.z + bounds.size]
    : [5, 5, 5]

  const target: [number, number, number] = bounds
    ? [bounds.center.x, bounds.center.y, bounds.center.z]
    : [0, 0, 0]

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <FilePicker onFileLoaded={handleFileLoaded} />
      <Canvas
        key={bounds ? 'route' : 'empty'}
        camera={{ position: cameraPosition, fov: 60, near: 0.1, far: bounds ? bounds.size * 10 : 1000 }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} />
        {projected.length > 0 ? (
          <Route3D points={projected} />
        ) : (
          <mesh>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="orange" />
          </mesh>
        )}
        <OrbitControls target={target} />
      </Canvas>
    </div>
  )
}

export default App