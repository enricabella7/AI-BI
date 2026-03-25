import { useState, useEffect } from 'react'
import './ChartPanel.css'

function generateBars(count = 12) {
  return Array.from({ length: count }, (_, i) => ({
    label: `W${i + 1}`,
    value: 30 + Math.round(Math.random() * 70),
  }))
}

export default function ChartPanel({ view }) {
  const [bars, setBars] = useState(() => generateBars())

  useEffect(() => {
    setBars(generateBars())
  }, [view])

  const max = Math.max(...bars.map((b) => b.value))

  return (
    <div className="chart-panel">
      <div className="panel-header">
        <span className="panel-title">Performance Trend</span>
        <span className="panel-subtitle">{view} — Last 12 weeks</span>
      </div>
      <div className="bar-chart">
        {bars.map((bar) => (
          <div key={bar.label} className="bar-col">
            <div
              className="bar-fill"
              style={{ height: `${(bar.value / max) * 100}%` }}
              title={`${bar.value}%`}
            />
            <span className="bar-label">{bar.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
