const ITEMS = [
  { label: 'Descent', color: '#60a5fa' },
  { label: '0–4%',   color: '#4ade80' },
  { label: '4–8%',   color: '#facc15' },
  { label: '8–12%',  color: '#f97316' },
  { label: '>12%',   color: '#ef4444' },
]

export function ColorLegend() {
  return (
    <div className="color-legend">
      {ITEMS.map(({ label, color }) => (
        <div key={label} className="color-legend-item">
          <div className="color-legend-swatch" style={{ background: color }} />
          <span className="color-legend-label">{label}</span>
        </div>
      ))}
    </div>
  )
}
