import './Header.css'

export default function Header({ chatOpen, onToggleChat }) {
  return (
    <header className="header">
      <div className="header-left">
        <span className="header-logo">◆</span>
        <h1 className="header-title">AI-BI</h1>
        <span className="header-subtitle">Design → Dashboard</span>
      </div>
      <div className="header-right">
        <span className="header-badge">AI-Powered</span>
        <button className="header-btn" onClick={onToggleChat}>
          {chatOpen ? 'Hide Chat' : 'Show Chat'}
        </button>
      </div>
    </header>
  )
}
