import { useState, useCallback, useEffect, useRef } from 'react'
import Header from './components/Header.jsx'
import CodeUpload from './components/CodeUpload.jsx'
import LivePreview from './components/LivePreview.jsx'
import ChatPanel from './components/ChatPanel.jsx'
import DataSources from './components/DataSources.jsx'
import DataMapping from './components/DataMapping.jsx'
import './App.css'

const ACTIVE_BUILD = ['uploading', 'extracting', 'installing', 'building', 'modifying']

export default function App() {
  const [mode, setMode] = useState('zip')
  const [htmlCode, setHtmlCode] = useState('')
  const [buildStatus, setBuildStatus] = useState({ status: 'idle', log: [], error: null })

  // Data sources (shared between modes)
  const [dataSources, setDataSources] = useState([])

  // HTML mode: placeholder-based mappings
  const [dataElements, setDataElements] = useState([])
  const [mappings, setMappings] = useState({})

  // ZIP mode: CSS-selector-based bindings
  const [zipBindings, setZipBindings] = useState([])

  // Element pick mode coordination between DataMapping ↔ LivePreview
  const [selectingForId, setSelectingForId] = useState(null)

  const [chatOpen, setChatOpen] = useState(true)
  const [activeTab, setActiveTab] = useState('upload')

  // ── Build status polling ─────────────────────────────────────────────────
  useEffect(() => {
    if (!ACTIVE_BUILD.includes(buildStatus.status)) return
    const id = setInterval(async () => {
      try {
        const res = await fetch('/api/status')
        setBuildStatus(await res.json())
      } catch { /* retry */ }
    }, 1500)
    return () => clearInterval(id)
  }, [buildStatus.status])

  // ── ZIP upload ───────────────────────────────────────────────────────────
  const handleZipUpload = useCallback(async (file) => {
    setBuildStatus({ status: 'uploading', log: ['Uploading zip...'], error: null })
    setZipBindings([])
    try {
      await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/zip' },
        body: file,
      })
    } catch (err) {
      setBuildStatus({ status: 'error', log: ['Upload failed'], error: err.message })
    }
  }, [])

  // ── HTML code + placeholder extraction ──────────────────────────────────
  const handleHtmlCodeChange = useCallback((code) => {
    setHtmlCode(code)
    const placeholders = [...new Set(
      (code.match(/\{\{(\w+)\}\}/g) || []).map(m => m.replace(/\{\{|\}\}/g, ''))
    )]
    setDataElements(placeholders)
  }, [])

  // ── Data sources ─────────────────────────────────────────────────────────
  const handleAddSource = useCallback((src) => {
    setDataSources(prev => [...prev, { ...src, id: Date.now() }])
  }, [])

  const handleRemoveSource = useCallback((id) => {
    setDataSources(prev => prev.filter(s => s.id !== id))
    setMappings(prev => {
      const next = { ...prev }
      for (const k of Object.keys(next)) if (next[k]?.sourceId === id) delete next[k]
      return next
    })
    setZipBindings(prev => prev.map(b => b.sourceId === id ? { ...b, sourceId: null, column: null } : b))
  }, [])

  // ── HTML mode mapping ────────────────────────────────────────────────────
  const handleMap = useCallback((element, sourceId, column) => {
    setMappings(prev => ({ ...prev, [element]: { sourceId, column } }))
  }, [])

  // ── ZIP mode bindings ────────────────────────────────────────────────────
  const handleAddBinding = useCallback((binding) => {
    setZipBindings(prev => [...prev, binding])
  }, [])

  const handleRemoveBinding = useCallback((id) => {
    setZipBindings(prev => prev.filter(b => b.id !== id))
  }, [])

  const handleUpdateBinding = useCallback((id, patch) => {
    setZipBindings(prev => prev.map(b => b.id === id ? { ...b, ...patch } : b))
  }, [])

  // ── Element pick coordination ─────────────────────────────────────────────
  const handleStartPick = useCallback((bindingId) => {
    setSelectingForId(bindingId)
  }, [])

  const handleElementSelected = useCallback((selector, text) => {
    if (!selectingForId) return
    setZipBindings(prev => prev.map(b =>
      b.id === selectingForId
        ? { ...b, selector, label: text || b.label }
        : b
    ))
    setSelectingForId(null)
  }, [selectingForId])

  // ── Sync ZIP bindings → server data overrides ───────────────────────────
  useEffect(() => {
    if (mode !== 'zip' || buildStatus.status !== 'ready') return
    const overrides = {}
    for (const binding of zipBindings) {
      if (!binding.selector || !binding.sourceId || !binding.column) continue
      const src = dataSources.find(s => s.id === binding.sourceId)
      if (!src?.data?.length) continue
      const val = src.data[0][binding.column]
      if (val !== undefined) overrides[binding.selector] = String(val)
    }
    fetch('/api/data-override', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ overrides }),
    }).catch(console.error)
  }, [mode, buildStatus.status, zipBindings, dataSources])

  // HTML mode: resolve placeholders for live preview
  const resolvedHtml = resolveData(htmlCode, mappings, dataSources)

  return (
    <div className="app">
      <Header chatOpen={chatOpen} onToggleChat={() => setChatOpen(o => !o)} />
      <div className="app-body">

        <aside className="left-panel">
          <div className="panel-tabs">
            {['upload', 'datasources', 'mapping'].map(tab => (
              <button
                key={tab}
                className={`panel-tab ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'upload' ? 'Design' : tab === 'datasources' ? 'Data Sources' : 'Mapping'}
              </button>
            ))}
          </div>
          <div className="panel-content">
            {activeTab === 'upload' && (
              <CodeUpload
                mode={mode} onModeChange={setMode}
                buildStatus={buildStatus}
                onZipUpload={handleZipUpload}
                htmlCode={htmlCode} onHtmlCodeChange={handleHtmlCodeChange}
              />
            )}
            {activeTab === 'datasources' && (
              <DataSources
                sources={dataSources}
                onAdd={handleAddSource}
                onRemove={handleRemoveSource}
              />
            )}
            {activeTab === 'mapping' && (
              <DataMapping
                mode={mode}
                dataElements={dataElements}
                mappings={mappings}
                onMap={handleMap}
                zipBindings={zipBindings}
                onAddBinding={handleAddBinding}
                onRemoveBinding={handleRemoveBinding}
                onUpdateBinding={handleUpdateBinding}
                onStartPick={handleStartPick}
                dataSources={dataSources}
              />
            )}
          </div>
        </aside>

        <main className="center-panel">
          <LivePreview
            mode={mode}
            buildStatus={buildStatus}
            htmlCode={resolvedHtml}
            selectingElement={selectingForId !== null}
            onElementSelected={handleElementSelected}
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
    const m = mappings[key]
    if (!m) return match
    const src = dataSources.find(s => s.id === m.sourceId)
    if (!src?.data?.length) return match
    const val = src.data[0][m.column]
    return val !== undefined ? val : match
  })
}
