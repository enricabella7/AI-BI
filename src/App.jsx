import { useState, useCallback, useEffect } from 'react'
import Header from './components/Header.jsx'
import CodeUpload from './components/CodeUpload.jsx'
import LivePreview from './components/LivePreview.jsx'
import ChatPanel from './components/ChatPanel.jsx'
import DataSources from './components/DataSources.jsx'
import DataMapping from './components/DataMapping.jsx'
import './App.css'

const ACTIVE_BUILD_STATUSES = ['uploading', 'extracting', 'installing', 'building']

export default function App() {
  // 'zip' = Figma Make zip upload  |  'html' = paste HTML/JSX directly
  const [mode, setMode] = useState('zip')
  const [htmlCode, setHtmlCode] = useState('')
  const [buildStatus, setBuildStatus] = useState({ status: 'idle', log: [], error: null })

  const [dataSources, setDataSources] = useState([])
  const [mappings, setMappings] = useState({})
  const [dataElements, setDataElements] = useState([])
  const [chatOpen, setChatOpen] = useState(true)
  const [activeTab, setActiveTab] = useState('upload')

  // Poll build status while a build is in progress
  useEffect(() => {
    if (!ACTIVE_BUILD_STATUSES.includes(buildStatus.status)) return
    const id = setInterval(async () => {
      try {
        const res = await fetch('/api/status')
        const data = await res.json()
        setBuildStatus(data)
      } catch { /* network hiccup, retry */ }
    }, 1500)
    return () => clearInterval(id)
  }, [buildStatus.status])

  // ── Upload zip to server middleware ──────────────────────────────────────
  const handleZipUpload = useCallback(async (file) => {
    setBuildStatus({ status: 'uploading', log: ['Uploading zip...'], error: null })
    try {
      await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/zip' },
        body: file,
      })
      // Polling effect will take over from here
    } catch (err) {
      setBuildStatus({ status: 'error', log: ['Upload failed'], error: err.message })
    }
  }, [])

  // ── HTML mode: extract {{placeholders}} for data mapping ─────────────────
  const handleHtmlCodeChange = useCallback((code) => {
    setHtmlCode(code)
    const placeholders = [...new Set(
      (code.match(/\{\{(\w+)\}\}/g) || []).map(m => m.replace(/\{\{|\}\}/g, ''))
    )]
    setDataElements(placeholders)
  }, [])

  // ── Data sources ─────────────────────────────────────────────────────────
  const handleAddDataSource = useCallback((source) => {
    setDataSources(prev => [...prev, { ...source, id: Date.now() }])
  }, [])

  const handleRemoveDataSource = useCallback((id) => {
    setDataSources(prev => prev.filter(s => s.id !== id))
    setMappings(prev => {
      const next = { ...prev }
      for (const key of Object.keys(next)) {
        if (next[key]?.sourceId === id) delete next[key]
      }
      return next
    })
  }, [])

  const handleMapElement = useCallback((element, sourceId, column) => {
    setMappings(prev => ({ ...prev, [element]: { sourceId, column } }))
  }, [])

  // Resolve {{placeholders}} → actual values for HTML mode
  const resolvedHtml = resolveData(htmlCode, mappings, dataSources)

  return (
    <div className="app">
      <Header chatOpen={chatOpen} onToggleChat={() => setChatOpen(o => !o)} />
      <div className="app-body">

        <aside className="left-panel">
          <div className="panel-tabs">
            <button
              className={`panel-tab ${activeTab === 'upload' ? 'active' : ''}`}
              onClick={() => setActiveTab('upload')}
            >
              Design
            </button>
            <button
              className={`panel-tab ${activeTab === 'datasources' ? 'active' : ''}`}
              onClick={() => setActiveTab('datasources')}
            >
              Data Sources
            </button>
            <button
              className={`panel-tab ${activeTab === 'mapping' ? 'active' : ''}`}
              onClick={() => setActiveTab('mapping')}
              disabled={mode === 'zip'}
              title={mode === 'zip' ? 'Data mapping is available in HTML mode' : undefined}
            >
              Mapping
            </button>
          </div>
          <div className="panel-content">
            {activeTab === 'upload' && (
              <CodeUpload
                mode={mode}
                onModeChange={setMode}
                buildStatus={buildStatus}
                onZipUpload={handleZipUpload}
                htmlCode={htmlCode}
                onHtmlCodeChange={handleHtmlCodeChange}
              />
            )}
            {activeTab === 'datasources' && (
              <DataSources
                sources={dataSources}
                onAdd={handleAddDataSource}
                onRemove={handleRemoveDataSource}
              />
            )}
            {activeTab === 'mapping' && (
              <DataMapping
                dataElements={dataElements}
                dataSources={dataSources}
                mappings={mappings}
                onMap={handleMapElement}
              />
            )}
          </div>
        </aside>

        <main className="center-panel">
          <LivePreview
            mode={mode}
            buildStatus={buildStatus}
            htmlCode={resolvedHtml}
          />
        </main>

        {chatOpen && (
          <aside className="right-panel">
            <ChatPanel
              mode={mode}
              buildStatus={buildStatus}
              htmlCode={htmlCode}
              onHtmlCodeChange={handleHtmlCodeChange}
            />
          </aside>
        )}

      </div>
    </div>
  )
}

function resolveData(code, mappings, dataSources) {
  if (!code) return code
  return code.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const mapping = mappings[key]
    if (!mapping) return match
    const source = dataSources.find(s => s.id === mapping.sourceId)
    if (!source?.data?.length) return match
    const val = source.data[0][mapping.column]
    return val !== undefined ? val : match
  })
}
