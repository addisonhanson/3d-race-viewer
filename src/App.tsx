import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Text } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { Route3D } from './components/Route3D'
import { WorldMap } from './components/WorldMap'
import { RiderDot } from './components/RiderDot'
import { ElevationProfile } from './components/ElevationProfile'
import {
  parseGpx, projectRoute, computeBounds, getSharedProjectionParams,
  computeStats, type RoutePoint, type StageStats, type ProjectionParams, type Vec3,
} from './lib/gpx'
import { STAGES, TYPE_BADGE } from './lib/stages'

type Mode = 'stage' | 'overview'

function fmt(n: number, decimals = 0) { return n.toFixed(decimals) }

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
      <span style={{ opacity: 0.55, fontSize: 11 }}>{label}</span>
      <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 12 }}>{value}</span>
    </div>
  )
}

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

function CameraController({ position, target, far, resetKey }: {
  position: [number, number, number]
  target: [number, number, number]
  far: number
  resetKey: number
}) {
  const { camera } = useThree()
  const controls = useRef<OrbitControlsImpl>(null)

  useEffect(() => {
    camera.position.set(...position)
    camera.far = far
    camera.updateProjectionMatrix()
    if (controls.current) {
      controls.current.target.set(...target)
      controls.current.update()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey])

  return <OrbitControls ref={controls} />
}

function StageLabels({ allProjected }: { allProjected: Vec3[][] }) {
  return (
    <>
      {STAGES.map((stage, i) => {
        const pts = allProjected[i]
        if (!pts || pts.length === 0) return null
        const start = pts[0]
        return (
          <Text
            key={stage.number}
            position={[start.x, start.y * 8 + 12000, start.z]}
            fontSize={8000}
            color="white"
            anchorX="center"
            anchorY="middle"
            outlineWidth={800}
            outlineColor="#0f172a"
          >
            {stage.number}
          </Text>
        )
      })}
    </>
  )
}

const COLOR_LEGEND = [
  { label: 'Descent', color: '#60a5fa' },
  { label: '0–4%',   color: '#4ade80' },
  { label: '4–8%',   color: '#facc15' },
  { label: '8–12%',  color: '#f97316' },
  { label: '>12%',   color: '#ef4444' },
]

function App() {
  const [mode, setMode] = useState<Mode>('stage')
  const [stageIndex, setStageIndex] = useState(0)
  const [focusedInOverview, setFocusedInOverview] = useState<number | null>(null)
  const [allRoutes, setAllRoutes] = useState<(RoutePoint[] | null)[]>(() => Array(STAGES.length).fill(null))
  const [sharedParams, setSharedParams] = useState<ProjectionParams | null>(null)
  const [stats, setStats] = useState<StageStats | null>(null)
  const [loadedCount, setLoadedCount] = useState(0)
  const [elevationScale, setElevationScale] = useState(8)
  const [resetKey, setResetKey] = useState(0)
  const [currentKm, setCurrentKm] = useState(0)
  const [hoveredDot, setHoveredDot] = useState<{ index: number; x: number; y: number } | null>(null)

  const loading = loadedCount < STAGES.length

  useEffect(() => {
    let cancelled = false
    let count = 0

    const fetches = STAGES.map(async (s, i) => {
      try {
        const res = await fetch(`/stages/${s.file}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const parsed = parseGpx(await res.text())
        if (!cancelled) {
          setAllRoutes(prev => { const next = [...prev]; next[i] = parsed; return next })
          count++
          setLoadedCount(count)
        }
        return parsed
      } catch (err) {
        console.error(`Failed to load ${s.file}:`, err)
        if (!cancelled) { count++; setLoadedCount(count) }
        return null
      }
    })

    Promise.all(fetches).then(routes => {
      if (cancelled) return
      const loaded = routes.filter((r): r is RoutePoint[] => r !== null)
      if (loaded.length > 0) setSharedParams(getSharedProjectionParams(loaded))
    })

    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const r = allRoutes[stageIndex]
    setStats(r ? computeStats(r) : null)
  }, [allRoutes, stageIndex])

  useEffect(() => {
    setCurrentKm(0)
  }, [stageIndex])

  const allProjected = useMemo(
    () => sharedParams
      ? allRoutes.map(r => r ? projectRoute(r, sharedParams) : [])
      : allRoutes.map(() => []),
    [allRoutes, sharedParams],
  )

  const stageBounds = useMemo(() => {
    const pts = allProjected[stageIndex]
    return pts.length > 0 ? computeBounds(pts) : null
  }, [allProjected, stageIndex])

  const globalBounds = useMemo(() => {
    const all = allProjected.flat()
    return all.length > 0 ? computeBounds(all) : null
  }, [allProjected])

  const activeBounds = mode === 'overview' ? globalBounds : stageBounds
  const cam = activeBounds ? cameraForBounds(activeBounds) : null

  const prevMode = useRef(mode)
  const prevStageIndex = useRef(stageIndex)
  useEffect(() => {
    if (mode !== prevMode.current || (mode === 'stage' && stageIndex !== prevStageIndex.current)) {
      setResetKey(k => k + 1)
    }
    prevMode.current = mode
    prevStageIndex.current = stageIndex
  }, [mode, stageIndex])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft')  setStageIndex(i => Math.max(0, i - 1))
      if (e.key === 'ArrowRight') setStageIndex(i => Math.min(STAGES.length - 1, i + 1))
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleDotClick = useCallback((i: number) => {
    if (mode === 'overview') {
      setFocusedInOverview(prev => prev === i ? null : i)
      setStageIndex(i)
    } else {
      setStageIndex(i)
    }
  }, [mode])

  const handleModeSwitch = useCallback((m: Mode) => {
    setMode(m)
    setFocusedInOverview(null)
  }, [])

  const stage = STAGES[stageIndex]
  const badge = TYPE_BADGE[stage.type]

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: '#0f172a' }}>

      {/* Stage dot tooltip */}
      {hoveredDot !== null && (() => {
        const s = STAGES[hoveredDot.index]
        const b = TYPE_BADGE[s.type]
        return (
          <div style={{
            position: 'fixed', left: hoveredDot.x, top: hoveredDot.y - 8,
            transform: 'translate(-50%, -100%)',
            zIndex: 50, pointerEvents: 'none',
            background: 'rgba(0,0,0,0.92)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 6, padding: '5px 10px',
            color: '#fff', fontFamily: 'system-ui', fontSize: 12, whiteSpace: 'nowrap',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ fontWeight: 700 }}>Stage {s.number}</span>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 99,
              background: b.color + '33', color: b.color,
            }}>{b.label}</span>
          </div>
        )
      })()}

      {/* Top bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 52, zIndex: 10,
        background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(8px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center',
        padding: '0 16px', gap: 14,
        color: '#fff', fontFamily: 'system-ui', userSelect: 'none',
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
          Giro d'Italia
        </span>

        <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.12)', flexShrink: 0 }} />

        {/* Stage navigator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <button
            onClick={() => setStageIndex(i => Math.max(0, i - 1))}
            disabled={mode !== 'stage' || stageIndex === 0}
            style={navBtn}
          >‹</button>
          <div style={{ minWidth: 150, textAlign: 'center' }}>
            {mode === 'overview' && focusedInOverview === null ? (
              <span style={{ fontSize: 14, fontWeight: 600 }}>All Stages</span>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{stage.name}</span>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 99,
                  background: badge.color + '33', color: badge.color,
                }}>{badge.label}</span>
              </div>
            )}
          </div>
          <button
            onClick={() => setStageIndex(i => Math.min(STAGES.length - 1, i + 1))}
            disabled={mode !== 'stage' || stageIndex === STAGES.length - 1}
            style={navBtn}
          >›</button>
        </div>

        <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.12)', flexShrink: 0 }} />

        {/* Stage dots */}
        <div style={{ display: 'flex', gap: 4, flex: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          {STAGES.map((s, i) => {
            const isActive = i === stageIndex
            const isFocused = focusedInOverview === i
            const color = TYPE_BADGE[s.type].color
            return (
              <button
                key={s.number}
                onClick={() => handleDotClick(i)}
                onMouseEnter={e => {
                  const r = e.currentTarget.getBoundingClientRect()
                  setHoveredDot({ index: i, x: r.left + r.width / 2, y: r.top })
                }}
                onMouseLeave={() => setHoveredDot(null)}
                style={{
                  width: 9, height: 9, borderRadius: '50%', border: 'none',
                  cursor: 'pointer', padding: 0, transition: 'background 0.15s',
                  background: (mode === 'stage' && isActive) || isFocused
                    ? color
                    : allRoutes[i] ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)',
                  boxShadow: isActive || isFocused ? `0 0 5px ${color}` : 'none',
                }}
              />
            )
          })}
        </div>

        {loading && (
          <span style={{ fontSize: 10, opacity: 0.4, whiteSpace: 'nowrap', flexShrink: 0 }}>
            {loadedCount}/{STAGES.length}
          </span>
        )}

        <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.12)', flexShrink: 0 }} />

        {/* Mode toggle */}
        <div style={{
          display: 'flex', borderRadius: 6, overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.15)', flexShrink: 0,
        }}>
          {(['stage', 'overview'] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => handleModeSwitch(m)}
              style={{
                background: mode === m ? 'rgba(255,255,255,0.15)' : 'transparent',
                border: 'none', color: '#fff', fontSize: 11, padding: '4px 10px',
                cursor: 'pointer', fontFamily: 'system-ui', textTransform: 'capitalize',
              }}
            >{m}</button>
          ))}
        </div>
      </div>

      {/* Left panel */}
      <div style={{
        position: 'absolute', top: 68, left: 16, zIndex: 10,
        background: 'rgba(0,0,0,0.72)', borderRadius: 10, padding: '14px 16px',
        display: 'flex', flexDirection: 'column', gap: 12,
        color: '#fff', fontFamily: 'system-ui', userSelect: 'none',
        minWidth: 200, backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}>
        {stats && (mode === 'stage' || focusedInOverview !== null) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <StatRow label="Distance"       value={`${fmt(stats.distanceKm, 1)} km`} />
            <StatRow label="Elevation gain" value={`${fmt(stats.elevationGainM)} m`} />
            <StatRow label="Max elevation"  value={`${fmt(stats.maxElevationM)} m`} />
            <StatRow label="Max gradient"   value={`${fmt(stats.maxGradePct, 1)}%`} />
          </div>
        )}

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 10 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11, opacity: 0.55 }}>
              Elevation ×{elevationScale.toFixed(1)}
            </span>
            <input
              type="range" min={1} max={20} step={0.5}
              value={elevationScale}
              onChange={e => setElevationScale(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </label>
        </div>

        <button
          onClick={() => setResetKey(k => k + 1)}
          style={{
            background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 6, color: 'rgba(255,255,255,0.7)', fontSize: 11,
            padding: '5px 0', cursor: 'pointer', fontFamily: 'system-ui',
          }}
        >
          Reset camera
        </button>
      </div>

      {/* Controls cheat sheet */}
      <div style={{
        position: 'absolute', top: 68, right: 16, zIndex: 10,
        background: 'rgba(0,0,0,0.65)', borderRadius: 8, padding: '8px 12px',
        color: '#fff', fontFamily: 'system-ui', fontSize: 11,
        backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', flexDirection: 'column', gap: 4, lineHeight: 1.5,
      }}>
        {[
          ['Left drag',  'Rotate'],
          ['Right drag', 'Pan'],
          ['Scroll',     'Zoom'],
          ['← →',       'Switch stage'],
        ].map(([key, action]) => (
          <div key={key} style={{ display: 'flex', gap: 10 }}>
            <span style={{ opacity: 0.45, minWidth: 68, textAlign: 'right' }}>{key}</span>
            <span style={{ opacity: 0.8 }}>{action}</span>
          </div>
        ))}
      </div>

      {/* Bottom bar: elevation profile + km readout (stage mode only) */}
      {mode === 'stage' && allProjected[stageIndex].length > 0 && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10,
          background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(8px)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          padding: '12px 20px',
          display: 'flex', alignItems: 'center', gap: 20,
          color: '#fff', fontFamily: 'system-ui', userSelect: 'none',
        }}>
          <div style={{ flexShrink: 0, minWidth: 52 }}>
            <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
              {fmt(currentKm, 1)}
            </div>
            <div style={{ fontSize: 10, opacity: 0.4 }}>km</div>
          </div>

          <div style={{ flex: 1, height: 64 }}>
            <ElevationProfile
              points={allProjected[stageIndex]}
              currentKm={currentKm}
              onSeek={setCurrentKm}
            />
          </div>
        </div>
      )}

      {/* Color legend in overview mode */}
      {mode === 'overview' && (
        <div style={{
          position: 'absolute', bottom: 16, left: 16, zIndex: 10,
          background: 'rgba(0,0,0,0.65)', borderRadius: 8, padding: '8px 12px',
          color: '#fff', fontFamily: 'system-ui', fontSize: 11,
          backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', gap: 10, alignItems: 'center',
        }}>
          {COLOR_LEGEND.map(({ label, color }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
              <span style={{ opacity: 0.75 }}>{label}</span>
            </div>
          ))}
        </div>
      )}

      {loading && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 14,
          pointerEvents: 'none', zIndex: 5,
        }}>
          <div className="spinner" />
          <div style={{ color: '#94a3b8', fontSize: 13, fontFamily: 'system-ui' }}>
            Loading stages… {loadedCount}/{STAGES.length}
          </div>
        </div>
      )}

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

        {mode === 'overview' && (
          <StageLabels allProjected={allProjected} />
        )}
      </Canvas>
    </div>
  )
}

const navBtn: React.CSSProperties = {
  background: 'rgba(255,255,255,0.1)',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 6, color: '#fff', fontSize: 20,
  width: 32, height: 32, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  lineHeight: 1, padding: 0, transition: 'background 0.15s', flexShrink: 0,
}

export default App
