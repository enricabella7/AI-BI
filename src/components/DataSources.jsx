import { useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import './DataSources.css'

export default function DataSources({ sources, onAdd, onRemove }) {
  const fileRef = useRef(null)
  const [pbiUrl, setPbiUrl] = useState('')
  const [showPbiInput, setShowPbiInput] = useState(false)

  const handleExcelUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'array' })
        const sheetName = wb.SheetNames[0]
        const sheet = wb.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(sheet)
        const columns = jsonData.length > 0 ? Object.keys(jsonData[0]) : []

        onAdd({
          name: file.name,
          type: 'excel',
          columns,
          data: jsonData,
          rowCount: jsonData.length,
        })
      } catch {
        alert('Failed to parse Excel file. Please check the format.')
      }
    }
    reader.readAsArrayBuffer(file)
    e.target.value = ''
  }

  const handlePbiConnect = () => {
    if (!pbiUrl.trim()) return
    onAdd({
      name: `Power BI: ${pbiUrl.trim().slice(0, 40)}`,
      type: 'powerbi',
      columns: ['metric', 'value', 'date', 'category'],
      data: [
        { metric: 'Revenue', value: 24500, date: '2024-01', category: 'Sales' },
        { metric: 'Users', value: 18340, date: '2024-01', category: 'Growth' },
        { metric: 'Conversion', value: 4.7, date: '2024-01', category: 'Marketing' },
      ],
      rowCount: 3,
    })
    setPbiUrl('')
    setShowPbiInput(false)
  }

  return (
    <div className="data-sources">
      <div className="ds-actions">
        <button className="ds-btn" onClick={() => fileRef.current?.click()}>
          <span className="ds-btn-icon">📊</span> Upload Excel
        </button>
        <button className="ds-btn" onClick={() => setShowPbiInput(v => !v)}>
          <span className="ds-btn-icon">⚡</span> Connect Power BI
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleExcelUpload}
          hidden
        />
      </div>

      {showPbiInput && (
        <div className="pbi-connect">
          <input
            className="pbi-input"
            type="text"
            placeholder="Paste Power BI dataset URL or workspace ID..."
            value={pbiUrl}
            onChange={(e) => setPbiUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handlePbiConnect()}
          />
          <button className="pbi-btn" onClick={handlePbiConnect}>Connect</button>
        </div>
      )}

      {sources.length === 0 ? (
        <div className="ds-empty">
          <p className="ds-empty-title">No data sources</p>
          <p className="ds-empty-text">
            Upload an Excel file or connect Power BI to bind live data to your dashboard design.
          </p>
        </div>
      ) : (
        <ul className="ds-list">
          {sources.map((src) => (
            <li key={src.id} className="ds-item">
              <div className="ds-item-header">
                <span className={`ds-type-badge ${src.type}`}>
                  {src.type === 'excel' ? 'XLS' : 'PBI'}
                </span>
                <span className="ds-item-name">{src.name}</span>
                <button className="ds-remove" onClick={() => onRemove(src.id)} title="Remove">
                  ×
                </button>
              </div>
              <div className="ds-item-meta">
                <span>{src.columns.length} columns</span>
                <span>{src.rowCount} rows</span>
              </div>
              <div className="ds-columns">
                {src.columns.map((col) => (
                  <span key={col} className="ds-col-tag">{col}</span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
