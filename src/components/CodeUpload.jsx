import { useRef } from 'react'
import './CodeUpload.css'

export default function CodeUpload({
  mode, onModeChange,
  buildStatus,
  onZipUpload,
  htmlCode, onHtmlCodeChange,
}) {
  const zipInputRef = useRef(null)
  const isBuilding = ['uploading', 'extracting', 'installing', 'building'].includes(buildStatus.status)

  const handleZipFile = (file) => {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.zip')) {
      alert('Please upload a .zip file exported from Figma Make.')
      return
    }
    onZipUpload(file)
  }

  const handleZipInputChange = (e) => {
    handleZipFile(e.target.files?.[0])
    e.target.value = ''
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.currentTarget.classList.remove('drag-over')
    const file = e.dataTransfer.files?.[0]
    handleZipFile(file)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.currentTarget.classList.add('drag-over')
  }

  const handleDragLeave = (e) => {
    e.currentTarget.classList.remove('drag-over')
  }

  return (
    <div className="code-upload">
      {/* Mode tabs */}
      <div className="mode-tabs">
        <button
          className={`mode-tab ${mode === 'zip' ? 'active' : ''}`}
          onClick={() => onModeChange('zip')}
        >
          Figma Make ZIP
        </button>
        <button
          className={`mode-tab ${mode === 'html' ? 'active' : ''}`}
          onClick={() => onModeChange('html')}
        >
          HTML / Paste
        </button>
      </div>

      {/* ── ZIP upload mode ─────────────────────────────────────── */}
      {mode === 'zip' && (
        <div className="zip-section">
          <div
            className={`drop-zone ${isBuilding ? 'disabled' : ''}`}
            onDrop={isBuilding ? undefined : handleDrop}
            onDragOver={isBuilding ? undefined : handleDragOver}
            onDragLeave={isBuilding ? undefined : handleDragLeave}
            onClick={isBuilding ? undefined : () => zipInputRef.current?.click()}
          >
            <span className="drop-icon">⬡</span>
            <p className="drop-text">
              {isBuilding
                ? 'Build in progress...'
                : <>Drop your Figma Make <strong>.zip</strong> here, or <span className="drop-link">browse</span></>
              }
            </p>
            <p className="drop-hint">Export from Figma → Make → Download ZIP</p>
            <input
              ref={zipInputRef}
              type="file"
              accept=".zip"
              onChange={handleZipInputChange}
              hidden
            />
          </div>

          {buildStatus.status !== 'idle' && (
            <BuildLog buildStatus={buildStatus} />
          )}

          <div className="zip-instructions">
            <p className="instructions-title">How to export from Figma Make:</p>
            <ol className="instructions-list">
              <li>Open your project in Figma</li>
              <li>Click <strong>Make</strong> in the toolbar</li>
              <li>Generate your dashboard design</li>
              <li>Click <strong>Download ZIP</strong></li>
              <li>Drop the file here</li>
            </ol>
          </div>
        </div>
      )}

      {/* ── HTML / Paste mode ───────────────────────────────────── */}
      {mode === 'html' && (
        <div className="html-section">
          <div className="code-editor-wrap">
            <label className="code-label">
              HTML Editor
              <span className="code-hint">Use {'{{placeholder}}'} for data binding</span>
            </label>
            <textarea
              className="code-editor"
              value={htmlCode}
              onChange={(e) => onHtmlCodeChange(e.target.value)}
              placeholder={`Paste HTML here...\n\nUse {{placeholders}} to bind data:\n<div class="card">\n  <h3>Revenue</h3>\n  <p>{{revenue}}</p>\n</div>`}
              spellCheck={false}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function BuildLog({ buildStatus }) {
  const { status, log, error } = buildStatus

  const statusMeta = {
    uploading:   { label: 'Uploading',           color: '#6366f1' },
    extracting:  { label: 'Extracting ZIP',       color: '#6366f1' },
    installing:  { label: 'Installing packages',  color: '#f59e0b' },
    building:    { label: 'Building',             color: '#f59e0b' },
    ready:       { label: 'Ready',                color: '#22c55e' },
    error:       { label: 'Failed',               color: '#ef4444' },
  }

  const meta = statusMeta[status] || { label: status, color: '#94a3b8' }

  return (
    <div className="build-log">
      <div className="build-log-header">
        <div className="build-log-status">
          <span
            className={`build-dot ${['uploading','extracting','installing','building'].includes(status) ? 'pulse' : ''}`}
            style={{ background: meta.color }}
          />
          <span style={{ color: meta.color }}>{meta.label}</span>
        </div>
        {['uploading','extracting','installing','building'].includes(status) && (
          <span className="build-spinner" />
        )}
      </div>
      <div className="build-log-output">
        {log.map((line, i) => (
          <div key={i} className="log-line">{line}</div>
        ))}
        {error && <div className="log-line error">{error}</div>}
      </div>
    </div>
  )
}
