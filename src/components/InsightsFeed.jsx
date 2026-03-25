import './InsightsFeed.css'

const INSIGHTS = {
  Overview: [
    { type: 'positive', text: 'Revenue up 12.5% — strongest month in Q1.' },
    { type: 'warning', text: 'Conversion rate dipped 1.1%; checkout funnel review recommended.' },
    { type: 'info', text: 'Session duration increased — content engagement improving.' },
    { type: 'positive', text: 'Active user base grew by 8.2% month-over-month.' },
  ],
  Analytics: [
    { type: 'positive', text: 'Page views surged 18.3% week-over-week.' },
    { type: 'positive', text: 'Bounce rate reduced by 3.7% — UX changes effective.' },
    { type: 'info', text: '22% more new visitors acquired via organic search.' },
    { type: 'warning', text: 'Mobile event triggers 14% lower than desktop average.' },
  ],
  Insights: [
    { type: 'positive', text: 'AI model accuracy reached 92.1% — new high.' },
    { type: 'info', text: '7 anomalies detected in payment flow; review suggested.' },
    { type: 'positive', text: 'F1 score improved to 0.934 after retraining.' },
    { type: 'info', text: '4 new audience segments auto-identified this week.' },
  ],
  Reports: [
    { type: 'info', text: '142 reports generated; 31 running on schedule.' },
    { type: 'positive', text: 'Report sharing up 21% among team leads.' },
    { type: 'warning', text: '3 scheduled reports failed last night — check data source.' },
    { type: 'info', text: 'PDF export most popular format at 64% usage.' },
  ],
}

const TYPE_COLORS = {
  positive: '#22c55e',
  warning: '#f59e0b',
  info: '#6366f1',
}

export default function InsightsFeed({ view }) {
  const items = INSIGHTS[view] || INSIGHTS.Overview

  return (
    <div className="insights-feed">
      <div className="panel-header">
        <span className="panel-title">AI Insights</span>
      </div>
      <ul className="insights-list">
        {items.map((item, i) => (
          <li key={i} className="insight-item">
            <span
              className="insight-dot"
              style={{ background: TYPE_COLORS[item.type] }}
            />
            <p className="insight-text">{item.text}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
