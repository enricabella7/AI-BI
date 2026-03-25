import MetricCard from './MetricCard.jsx'
import ChartPanel from './ChartPanel.jsx'
import InsightsFeed from './InsightsFeed.jsx'
import './Dashboard.css'

const METRICS = {
  Overview: [
    { label: 'Total Revenue', value: '$2.4M', change: +12.5, unit: 'vs last month' },
    { label: 'Active Users', value: '18,340', change: +8.2, unit: 'vs last month' },
    { label: 'Conversion Rate', value: '4.7%', change: -1.1, unit: 'vs last month' },
    { label: 'Avg. Session', value: '3m 42s', change: +5.4, unit: 'vs last month' },
  ],
  Analytics: [
    { label: 'Page Views', value: '1.2M', change: +18.3, unit: 'vs last week' },
    { label: 'Bounce Rate', value: '38.4%', change: -3.7, unit: 'vs last week' },
    { label: 'New Visitors', value: '9,210', change: +22.1, unit: 'vs last week' },
    { label: 'Event Triggers', value: '54,890', change: +11.0, unit: 'vs last week' },
  ],
  Insights: [
    { label: 'AI Predictions', value: '92.1%', change: +0.8, unit: 'accuracy' },
    { label: 'Anomalies Found', value: '7', change: -2, unit: 'vs last run' },
    { label: 'Segments', value: '24', change: +4, unit: 'active' },
    { label: 'Model Score', value: '0.934', change: +0.012, unit: 'F1 score' },
  ],
  Reports: [
    { label: 'Reports Generated', value: '142', change: +19, unit: 'this month' },
    { label: 'Scheduled', value: '31', change: +5, unit: 'active' },
    { label: 'Shared', value: '67', change: +12, unit: 'this month' },
    { label: 'Exports', value: '98', change: +8, unit: 'this month' },
  ],
}

export default function Dashboard({ view }) {
  const metrics = METRICS[view] || METRICS.Overview

  return (
    <div className="dashboard">
      <div className="metrics-grid">
        {metrics.map((m) => (
          <MetricCard key={m.label} {...m} />
        ))}
      </div>
      <div className="panels-grid">
        <ChartPanel view={view} />
        <InsightsFeed view={view} />
      </div>
    </div>
  )
}
