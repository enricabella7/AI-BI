import { useState, useCallback } from 'react'
import Header from './components/Header.jsx'
import CodeUpload from './components/CodeUpload.jsx'
import LivePreview from './components/LivePreview.jsx'
import ChatPanel from './components/ChatPanel.jsx'
import DataSources from './components/DataSources.jsx'
import DataMapping from './components/DataMapping.jsx'
import './App.css'

export default function App() {
  const [code, setCode] = useState('')
  const [activeTab, setActiveTab] = useState('upload') // upload | datasources | mapping
  const [dataSources, setDataSources] = useState([])
  const [mappings, setMappings] = useState({})
  const [chatOpen, setChatOpen] = useState(true)
  const [dataElements, setDataElements] = useState([])

  const handleCodeChange = useCallback((newCode) => {
    setCode(newCode)
    // Extract data placeholders from the code (e.g. {{revenue}}, {{users}})
    const placeholders = [...new Set(
      (newCode.match(/\{\{(\w+)\}\}/g) || []).map(m => m.replace(/\{\{|\}\}/g, ''))
    )]
    setDataElements(placeholders)
  }, [])

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
    setMappings(prev => ({
      ...prev,
      [element]: { sourceId, column }
    }))
  }, [])

  // Resolve data: replace {{placeholder}} with actual values from mapped sources
  const resolvedCode = resolveDataInCode(code, mappings, dataSources)

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
              Code
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
            >
              Mapping
            </button>
          </div>
          <div className="panel-content">
            {activeTab === 'upload' && (
              <CodeUpload code={code} onCodeChange={handleCodeChange} />
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
          <LivePreview code={resolvedCode} />
        </main>

        {chatOpen && (
          <aside className="right-panel">
            <ChatPanel code={code} onCodeChange={handleCodeChange} />
          </aside>
        )}
      </div>
    </div>
  )
}

function resolveDataInCode(code, mappings, dataSources) {
  if (!code) return code
  return code.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const mapping = mappings[key]
    if (!mapping) return match
    const source = dataSources.find(s => s.id === mapping.sourceId)
    if (!source || !source.data || source.data.length === 0) return match
    // Use first row as sample data for preview
    const row = source.data[0]
    return row[mapping.column] !== undefined ? row[mapping.column] : match
  })
}
