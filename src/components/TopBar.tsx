import { useState, useEffect } from 'react'
import type { RoutePoint } from '../lib/gpx'
import type { Mode } from '../lib/types'
import { STAGES, TYPE_BADGE } from '../lib/stages'

type HoveredDot = { index: number; x: number; y: number }

type TopBarProps = {
  mode: Mode
  stageIndex: number
  focusedInOverview: number | null
  allRoutes: (RoutePoint[] | null)[]
  loadedCount: number
  loading: boolean
  onPrevStage: () => void
  onNextStage: () => void
  onDotClick: (i: number) => void
  onModeSwitch: (m: Mode) => void
}

export function TopBar({
  mode, stageIndex, focusedInOverview, allRoutes,
  loadedCount, loading,
  onPrevStage, onNextStage, onDotClick, onModeSwitch,
}: TopBarProps) {
  const [hoveredDot, setHoveredDot] = useState<HoveredDot | null>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft')  onPrevStage()
      if (e.key === 'ArrowRight') onNextStage()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onPrevStage, onNextStage])
  const stage = STAGES[stageIndex]
  const badge = TYPE_BADGE[stage.type]

  return (
    <>
      {hoveredDot !== null && (() => {
        const s = STAGES[hoveredDot.index]
        const b = TYPE_BADGE[s.type]
        return (
          <div
            className="stage-tooltip"
            style={{ left: hoveredDot.x, top: hoveredDot.y + 8 }}
          >
            <span className="stage-tooltip-name">Stage {s.number}</span>
            <span className="badge" style={{ background: b.color + '33', color: b.color }}>{b.label}</span>
          </div>
        )
      })()}

      <div className="top-bar">
        <span className="top-bar-title">Giro d'Italia</span>

        <div className="divider" />

        <div className="stage-navigator">
          <button
            onClick={onPrevStage}
            disabled={mode !== 'stage' || stageIndex === 0}
            className="nav-btn"
          >‹</button>
          <div className="stage-name-container">
            {mode === 'overview' && focusedInOverview === null ? (
              <span className="all-stages-label">All Stages</span>
            ) : (
              <div className="stage-name-row">
                <span className="stage-name">{stage.name}</span>
                <span className="badge" style={{ background: badge.color + '33', color: badge.color }}>{badge.label}</span>
              </div>
            )}
          </div>
          <button
            onClick={onNextStage}
            disabled={mode !== 'stage' || stageIndex === STAGES.length - 1}
            className="nav-btn"
          >›</button>
        </div>

        <div className="divider" />

        <div className="stage-dots">
          {STAGES.map((s, i) => {
            const isActive = i === stageIndex
            const isFocused = focusedInOverview === i
            const color = TYPE_BADGE[s.type].color
            return (
              <button
                key={s.number}
                onClick={() => onDotClick(i)}
                onMouseEnter={e => {
                  const r = e.currentTarget.getBoundingClientRect()
                  setHoveredDot({ index: i, x: r.left + r.width / 2, y: r.bottom })
                }}
                onMouseLeave={() => setHoveredDot(null)}
                className="stage-dot"
                style={{
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
          <span className="loading-count">{loadedCount}/{STAGES.length}</span>
        )}

        <div className="divider" />

        <div className="mode-toggle">
          {(['stage', 'overview'] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => onModeSwitch(m)}
              className={`mode-btn${mode === m ? ' active' : ''}`}
            >{m}</button>
          ))}
        </div>
      </div>
    </>
  )
}
