import './Sidebar.css'

const NAV_ICONS = {
  Overview: '◈',
  Analytics: '▲',
  Insights: '✦',
  Reports: '▣',
}

export default function Sidebar({ views, activeView, onViewChange }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span className="logo-icon">◆</span>
        <span className="logo-text">AI-BI</span>
      </div>
      <nav className="sidebar-nav">
        {views.map((view) => (
          <button
            key={view}
            className={`nav-item ${activeView === view ? 'active' : ''}`}
            onClick={() => onViewChange(view)}
          >
            <span className="nav-icon">{NAV_ICONS[view]}</span>
            <span>{view}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="ai-status">
          <span className="status-dot" />
          AI Engine Active
        </div>
      </div>
    </aside>
  )
}
