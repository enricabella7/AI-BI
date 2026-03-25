import './MetricCard.css'

export default function MetricCard({ label, value, change, unit }) {
  const positive = change >= 0

  return (
    <div className="metric-card">
      <p className="metric-label">{label}</p>
      <p className="metric-value">{value}</p>
      <div className="metric-footer">
        <span className={`metric-change ${positive ? 'up' : 'down'}`}>
          {positive ? '▲' : '▼'} {Math.abs(change)}%
        </span>
        <span className="metric-unit">{unit}</span>
      </div>
    </div>
  )
}
