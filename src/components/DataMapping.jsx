import { useState } from 'react'
import './DataMapping.css'

// ── HTML mode: placeholder-based mapping ─────────────────────────────────────
function HtmlMapping({ dataElements, dataSources, mappings, onMap }) {
  if (dataElements.length === 0 && dataSources.length === 0) {
    return (
      <div className="dm-empty">
        <p className="dm-empty-title">No data to map</p>
        <p className="dm-empty-text">
          Use <code>{'{{placeholder}}'}</code> in your HTML to define data elements,
          then connect a data source.
        </p>
      </div>
    )
  }

  if (dataElements.length === 0) {
    return (
      <div className="dm-empty">
        <p className="dm-empty-title">No placeholders found</p>
        <p className="dm-empty-text">
          Add <code>{'{{placeholder}}'}</code> in your HTML code. E.g.{' '}
          <code>{'{{revenue}}'}</code>
        </p>
      </div>
    )
  }

  if (dataSources.length === 0) {
    return (
      <div className="dm-empty">
        <p className="dm-empty-title">No data sources</p>
        <p className="dm-empty-text">
          Found {dataElements.length} placeholder(s). Connect a data source in the
          Data Sources tab.
        </p>
        <div className="dm-tags">
          {dataElements.map(el => (
            <span key={el} className="dm-tag">{`{{${el}}}`}</span>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="dm-list">
      {dataElements.map(element => {
        const mapping = mappings[element]
        return (
          <div key={element} className="dm-row">
            <span className="dm-element">{`{{${element}}}`}</span>
            <span className="dm-arrow">→</span>
            <div className="dm-selectors">
              <select
                className="dm-select"
                value={mapping?.sourceId || ''}
                onChange={e => {
                  const id = Number(e.target.value)
                  if (id) {
                    const src = dataSources.find(s => s.id === id)
                    onMap(element, id, src?.columns[0] || '')
                  } else {
                    onMap(element, null, null)
                  }
                }}
              >
                <option value="">Source...</option>
                {dataSources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              {mapping?.sourceId && (
                <select
                  className="dm-select"
                  value={mapping.column || ''}
                  onChange={e => onMap(element, mapping.sourceId, e.target.value)}
                >
                  {dataSources.find(s => s.id === mapping.sourceId)?.columns.map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              )}
            </div>
            {mapping?.sourceId && mapping?.column && (
              <span className="dm-mapped-badge">✓</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── ZIP mode: CSS-selector-based binding ──────────────────────────────────────
function ZipMapping({ zipBindings, dataSources, onAddBinding, onRemoveBinding, onUpdateBinding, onStartPick }) {
  const [newLabel, setNewLabel] = useState('')

  const addBinding = () => {
    const label = newLabel.trim() || `Element ${zipBindings.length + 1}`
    onAddBinding({ id: Date.now().toString(), selector: '', label, sourceId: null, column: null })
    setNewLabel('')
  }

  if (dataSources.length === 0) {
    return (
      <div className="dm-empty">
        <p className="dm-empty-title">No data sources</p>
        <p className="dm-empty-text">
          Connect an Excel file or Power BI source in the Data Sources tab, then come
          back to map elements from your dashboard.
        </p>
      </div>
    )
  }

  return (
    <div className="zip-mapping">
      <p className="dm-info">
        Click <strong>Pick</strong> to select an element in the preview, then map it
        to a data column. Changes apply instantly without rebuilding.
      </p>

      {zipBindings.map(binding => (
        <div key={binding.id} className="zip-binding">
          <div className="zip-binding-header">
            <span className="zip-binding-label">{binding.label}</span>
            <button className="zip-binding-remove" onClick={() => onRemoveBinding(binding.id)}>×</button>
          </div>

          <div className="zip-binding-selector-row">
            <input
              className="selector-input"
              placeholder="CSS selector (e.g. .metric-value)"
              value={binding.selector}
              onChange={e => onUpdateBinding(binding.id, { selector: e.target.value })}
            />
            <button
              className="pick-btn"
              onClick={() => onStartPick(binding.id)}
              title="Click an element in the preview to capture its CSS selector"
            >
              Pick
            </button>
          </div>

          <div className="zip-binding-source-row">
            <select
              className="dm-select"
              value={binding.sourceId || ''}
              onChange={e => {
                const id = Number(e.target.value)
                if (id) {
                  const src = dataSources.find(s => s.id === id)
                  onUpdateBinding(binding.id, { sourceId: id, column: src?.columns[0] || null })
                } else {
                  onUpdateBinding(binding.id, { sourceId: null, column: null })
                }
              }}
            >
              <option value="">Select source...</option>
              {dataSources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>

            {binding.sourceId && (
              <select
                className="dm-select"
                value={binding.column || ''}
                onChange={e => onUpdateBinding(binding.id, { column: e.target.value })}
              >
                {dataSources.find(s => s.id === binding.sourceId)?.columns.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            )}
          </div>

          {binding.selector && binding.sourceId && binding.column && (
            <div className="zip-binding-preview-row">
              <span className="dm-mapped-badge">✓ Mapped</span>
              <span className="zip-binding-selector-preview">{binding.selector}</span>
            </div>
          )}
        </div>
      ))}

      <div className="add-binding-row">
        <input
          className="add-binding-input"
          placeholder="Label for new binding..."
          value={newLabel}
          onChange={e => setNewLabel(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addBinding()}
        />
        <button className="add-binding-btn" onClick={addBinding}>+ Add</button>
      </div>
    </div>
  )
}

// ── Root export ───────────────────────────────────────────────────────────────
export default function DataMapping({
  mode,
  // HTML mode props
  dataElements, mappings, onMap,
  // ZIP mode props
  zipBindings, onAddBinding, onRemoveBinding, onUpdateBinding, onStartPick,
  // shared
  dataSources,
}) {
  return (
    <div className="data-mapping">
      {mode === 'html' ? (
        <HtmlMapping
          dataElements={dataElements}
          dataSources={dataSources}
          mappings={mappings}
          onMap={onMap}
        />
      ) : (
        <ZipMapping
          zipBindings={zipBindings}
          dataSources={dataSources}
          onAddBinding={onAddBinding}
          onRemoveBinding={onRemoveBinding}
          onUpdateBinding={onUpdateBinding}
          onStartPick={onStartPick}
        />
      )}
    </div>
  )
}
