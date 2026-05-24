import type { Vec3 } from '../lib/gpx'
import { ElevationProfile } from './ElevationProfile'

function fmt(n: number, decimals = 0) { return n.toFixed(decimals) }

type BottomBarProps = {
  points: Vec3[]
  currentKm: number
  onSeek: (km: number) => void
}

export function BottomBar({ points, currentKm, onSeek }: BottomBarProps) {
  return (
    <div className="bottom-bar">
      <div className="bottom-bar-km">
        <div className="bottom-bar-km-number">{fmt(currentKm, 1)}</div>
        <div className="bottom-bar-km-label">km</div>
      </div>

      <div className="bottom-bar-profile">
        <ElevationProfile points={points} currentKm={currentKm} onSeek={onSeek} />
      </div>
    </div>
  )
}
