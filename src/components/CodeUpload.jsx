import { useRef } from 'react'
import './CodeUpload.css'

export default function CodeUpload({ code, onCodeChange }) {
  const fileInputRef = useRef(null)

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      onCodeChange(evt.target.result)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.currentTarget.classList.remove('drag-over')
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      onCodeChange(evt.target.result)
    }
    reader.readAsText(file)
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
      <div
        className="drop-zone"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <span className="drop-icon">↑</span>
        <p className="drop-text">
          Drop Figma-generated file here, or <span className="drop-link">browse</span>
        </p>
        <p className="drop-hint">.jsx, .html, .tsx files supported</p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".jsx,.html,.tsx,.js,.ts,.css"
          onChange={handleFileUpload}
          hidden
        />
      </div>

      <div className="code-editor-wrap">
        <label className="code-label">
          Code Editor
          <span className="code-hint">
            Use {'{{placeholder}}'} for data binding
          </span>
        </label>
        <textarea
          className="code-editor"
          value={code}
          onChange={(e) => onCodeChange(e.target.value)}
          placeholder={`Paste your Figma-generated code here...\n\nExample:\n<div class="dashboard">\n  <div class="metric-card">\n    <h3>Revenue</h3>\n    <p>{{revenue}}</p>\n  </div>\n</div>`}
          spellCheck={false}
        />
      </div>
    </div>
  )
}
