import { useState } from 'react'
import Dashboard from './components/Dashboard.jsx'
import Sidebar from './components/Sidebar.jsx'
import './App.css'

const VIEWS = ['Overview', 'Analytics', 'Insights', 'Reports']

export default function App() {
  const [activeView, setActiveView] = useState('Overview')

  return (
    <div className="app-layout">
      <Sidebar views={VIEWS} activeView={activeView} onViewChange={setActiveView} />
      <main className="main-content">
        <header className="top-bar">
          <h1 className="page-title">{activeView}</h1>
          <div className="top-bar-right">
            <span className="badge">AI-Powered</span>
            <div className="avatar">EN</div>
          </div>
        </header>
        <Dashboard view={activeView} />
      </main>
    </div>
  )
}
