import { useState, useEffect, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { Route3D } from './components/Route3D'
import { WorldMap } from './components/WorldMap'
import { RiderDot } from './components/RiderDot'
import { TopBar } from './components/TopBar'
import { LeftPanel } from './components/LeftPanel'
import { BottomBar } from './components/BottomBar'
import { ColorLegend } from './components/ColorLegend'
import { LoadingOverlay } from './components/LoadingOverlay'
import { CameraController } from './components/CameraController'
import { StageLabels } from './components/StageLabels'
import { useRouteData } from './lib/useRouteData'
import type { Vec3 } from './lib/gpx'
import { STAGES } from './lib/stages'
import type { Mode } from './lib/types'
import './App.css'

function cameraForBounds(bounds: { center: Vec3; size: number }) {
  return {
    position: [
      bounds.center.x + bounds.size,
      bounds.size * 0.6,
      bounds.center.z + bounds.size,
    ] as [number, number, number],
    target: [bounds.center.x, 0, bounds.center.z] as [number, number, number],
    far: bounds.size * 30,
  }
}

function App() {
  const [mode, setMode] = useState<Mode>('stage')
  const [stageIndex, setStageIndex] = useState(0)
  const [focusedInOverview, setFocusedInOverview] = useState<number | null>(null)
  const [elevationScale, setElevationScale] = useState(8)
  const [resetKey, setResetKey] = useState(0)
  const [currentKm, setCurrentKm] = useState(0)

  const { allRoutes, sharedParams, loadedCount, loading, stats, allProjected, stageBounds, globalBounds } =
    useRouteData(stageIndex)

  useEffect(() => { setCurrentKm(0) }, [stageIndex])

  const prevMode = useRef(mode)
  const prevStageIndex = useRef(stageIndex)
  useEffect(() => {
    if (mode !== prevMode.current || (mode === 'stage' && stageIndex !== prevStageIndex.current)) {
      setResetKey(k => k + 1)
    }
    prevMode.current = mode
    prevStageIndex.current = stageIndex
  }, [mode, stageIndex])

  const activeBounds = mode === 'overview' ? globalBounds : stageBounds
  const cam = activeBounds ? cameraForBounds(activeBounds) : null

  return (
    <div className="app-root">
      <TopBar
        mode={mode}
        stageIndex={stageIndex}
        focusedInOverview={focusedInOverview}
        allRoutes={allRoutes}
        loadedCount={loadedCount}
        loading={loading}
        onPrevStage={() => setStageIndex(i => Math.max(0, i - 1))}
        onNextStage={() => setStageIndex(i => Math.min(STAGES.length - 1, i + 1))}
        onDotClick={i => {
          if (mode === 'overview') setFocusedInOverview(prev => prev === i ? null : i)
          setStageIndex(i)
        }}
        onModeSwitch={m => { setMode(m); setFocusedInOverview(null) }}
      />

      <LeftPanel
        stats={stats}
        mode={mode}
        focusedInOverview={focusedInOverview}
        elevationScale={elevationScale}
        onElevationScaleChange={setElevationScale}
        onResetCamera={() => setResetKey(k => k + 1)}
      />

      <div className="controls-panel">
        {[
          ['Left drag',  'Rotate'],
          ['Right drag', 'Pan'],
          ['Scroll',     'Zoom'],
          ['← →',       'Switch stage'],
        ].map(([key, action]) => (
          <div key={key} className="controls-row">
            <span className="controls-key">{key}</span>
            <span className="controls-action">{action}</span>
          </div>
        ))}
      </div>

      {mode === 'stage' && allProjected[stageIndex].length > 0 && (
        <BottomBar
          points={allProjected[stageIndex]}
          currentKm={currentKm}
          onSeek={setCurrentKm}
        />
      )}

      {mode === 'overview' && <ColorLegend />}

      {loading && <LoadingOverlay loadedCount={loadedCount} />}

      <Canvas
        camera={{ position: cam?.position ?? [5, 5, 5], fov: 60, near: 1, far: cam?.far ?? 1000 }}
        style={{ background: '#0f172a' }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[0.5, 1, 0.3]} intensity={0.8} />

        {sharedParams && <WorldMap projectionParams={sharedParams} />}

        {cam && (
          <CameraController
            position={cam.position}
            target={cam.target}
            far={cam.far}
            resetKey={resetKey}
          />
        )}

        {mode === 'stage' && allProjected[stageIndex].length > 0 && (
          <>
            <Route3D points={allProjected[stageIndex]} elevationScale={elevationScale} />
            {stageBounds && (
              <RiderDot
                points={allProjected[stageIndex]}
                currentKm={currentKm}
                elevationScale={elevationScale}
                stageSize={stageBounds.size}
              />
            )}
          </>
        )}

        {mode === 'overview' && allProjected.map((pts, i) => {
          if (pts.length === 0) return null
          const dimmed = focusedInOverview !== null && focusedInOverview !== i
          return (
            <Route3D
              key={i}
              points={pts}
              elevationScale={elevationScale}
              opacity={dimmed ? 0.12 : 1}
            />
          )
        })}

        {mode === 'overview' && <StageLabels allProjected={allProjected} />}
      </Canvas>
    </div>
  )
}

export default App
