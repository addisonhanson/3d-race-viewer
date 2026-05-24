import type { StageStats } from '../lib/gpx'
import type { Mode } from '../lib/types'

function fmt(n: number, decimals = 0) { return n.toFixed(decimals) }

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-row">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
    </div>
  )
}

type LeftPanelProps = {
  stats: StageStats | null
  mode: Mode
  focusedInOverview: number | null
  elevationScale: number
  onElevationScaleChange: (n: number) => void
  onResetCamera: () => void
}

export function LeftPanel({
  stats, mode, focusedInOverview, elevationScale, onElevationScaleChange, onResetCamera,
}: LeftPanelProps) {
  return (
    <div className="left-panel">
      {stats && (mode === 'stage' || focusedInOverview !== null) && (
        <div className="stats-section">
          <StatRow label="Distance"       value={`${fmt(stats.distanceKm, 1)} km`} />
          <StatRow label="Elevation gain" value={`${fmt(stats.elevationGainM)} m`} />
          <StatRow label="Max elevation"  value={`${fmt(stats.maxElevationM)} m`} />
          <StatRow label="Max gradient"   value={`${fmt(stats.maxGradePct, 1)}%`} />
        </div>
      )}

      <div className="elevation-divider">
        <label className="elevation-label">
          <span className="elevation-label-text">
            Elevation ×{elevationScale.toFixed(1)}
          </span>
          <input
            type="range" min={1} max={20} step={0.5}
            value={elevationScale}
            onChange={e => onElevationScaleChange(Number(e.target.value))}
            className="elevation-slider"
          />
        </label>
      </div>

      <button onClick={onResetCamera} className="reset-camera-btn">
        Reset camera
      </button>
    </div>
  )
}
