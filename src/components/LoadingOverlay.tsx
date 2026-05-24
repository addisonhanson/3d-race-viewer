import { STAGES } from '../lib/stages'

type LoadingOverlayProps = {
  loadedCount: number
}

export function LoadingOverlay({ loadedCount }: LoadingOverlayProps) {
  return (
    <div className="loading-overlay">
      <div className="spinner" />
      <div className="loading-text">
        Loading stages… {loadedCount}/{STAGES.length}
      </div>
    </div>
  )
}
