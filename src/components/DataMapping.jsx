import { useState } from 'react'
import './DataMapping.css'

// ── Number formatting ─────────────────────────────────────────────────────────
export function formatValue(raw, fmt) {
  if (!fmt || fmt.type === 'none') return String(raw)
  const num = parseFloat(String(raw).replace(/[^0-9.-]/g, ''))
  if (isNaN(num)) return String(raw)

  const { type, decimals = 0, abbreviate = false, prefix = '', suffix = '' } = fmt

  let value = num
  let abbSuffix = ''
  if (abbreviate) {
    if (Math.abs(num) >= 1e9)      { value = num / 1e9; abbSuffix = 'B' }
    else if (Math.abs(num) >= 1e6) { value = num / 1e6; abbSuffix = 'M' }
    else if (Math.abs(num) >= 1e3) { value = num / 1e3; abbSuffix = 'K' }
  }

  const localeStr = value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })

  switch (type) {
    case 'currency':   return `${prefix || '$'}${localeStr}${abbSuffix}${suffix}`
    case 'percentage': return `${prefix}${localeStr}${abbSuffix}${suffix || '%'}`
    default:           return `${prefix}${localeStr}${abbSuffix}${suffix}`
  }
}

// ── Suggest default format from detected data type ────────────────────────────
function defaultFormat(detectedType) {
  switch (detectedType) {
    case 'currency':      return { type: 'currency',   decimals: 0, abbreviate: false, prefix: '$', suffix: '' }
    case 'percentage':    return { type: 'percentage', decimals: 1, abbreviate: false, prefix: '',  suffix: '%' }
    case 'abbreviated_k':
    case 'abbreviated_m':
    case 'abbreviated_b': return { type: 'decimal',    decimals: 1, abbreviate: true,  prefix: '',  suffix: '' }
    case 'integer':       return { type: 'integer',    decimals: 0, abbreviate: false, prefix: '',  suffix: '' }
    default:              return { type: 'decimal',    decimals: 2, abbreviate: false, prefix: '',  suffix: '' }
  }
}

// ── FormatPicker ──────────────────────────────────────────────────────────────
function FormatPicker({ format, onChange }) {
  const fmt = format || { type: 'none' }
  return (
    <div className="format-picker">
      <div className="format-row">
        <label>Format</label>
        <select className="fmt-select" value={fmt.type || 'none'}
          onChange={e => onChange({ ...fmt, type: e.target.value })}>
          <option value="none">None (raw value)</option>
          <option value="currency">Currency  $1,234</option>
          <option value="integer">Integer  1,234</option>
          <option value="decimal">Decimal  1,234.56</option>
          <option value="percentage">Percentage  12.5%</option>
        </select>
      </div>

      {fmt.type && fmt.type !== 'none' && (
        <>
          <div className="format-row">
            <label>Decimals</label>
            <input className="fmt-num" type="number" min={0} max={6}
              value={fmt.decimals ?? 0}
              onChange={e => onChange({ ...fmt, decimals: Math.max(0, Math.min(6, +e.target.value)) })} />
          </div>

          <div className="format-row">
            <label>Abbreviate</label>
            <label className="fmt-checkbox-label">
              <input type="checkbox" checked={fmt.abbreviate ?? false}
                onChange={e => onChange({ ...fmt, abbreviate: e.target.checked })} />
              <span>K / M / B</span>
            </label>
          </div>

          {fmt.type === 'currency' && (
            <div className="format-row">
              <label>Symbol</label>
              <input className="fmt-text" type="text" maxLength={4}
                value={fmt.prefix ?? '$'}
                onChange={e => onChange({ ...fmt, prefix: e.target.value })} />
            </div>
          )}

          {(fmt.type === 'integer' || fmt.type === 'decimal') && (
            <div className="format-row">
              <label>Prefix</label>
              <input className="fmt-text" type="text" maxLength={6}
                value={fmt.prefix ?? ''}
                onChange={e => onChange({ ...fmt, prefix: e.target.value })}
                placeholder="e.g. €" />
            </div>
          )}

          <div className="format-row">
            <label>Suffix</label>
            <input className="fmt-text" type="text" maxLength={6}
              value={fmt.suffix ?? ''}
              onChange={e => onChange({ ...fmt, suffix: e.target.value })}
              placeholder="e.g. pts" />
          </div>
        </>
      )}
    </div>
  )
}

// ── HTML mode: placeholder-based mapping ─────────────────────────────────────
function HtmlMapping({ dataElements, dataSources, mappings, onMap }) {
  if (!dataElements.length) {
    return (
      <div className="dm-empty">
        <p className="dm-empty-title">No placeholders found</p>
        <p className="dm-empty-text">
          Add <code>{'{{placeholder}}'}</code> in your HTML. E.g. <code>{'{{revenue}}'}</code>
        </p>
      </div>
    )
  }
  if (!dataSources.length) {
    return (
      <div className="dm-empty">
        <p className="dm-empty-title">No data sources</p>
        <p className="dm-empty-text">Found {dataElements.length} placeholder(s). Connect a data source first.</p>
        <div className="dm-tags">
          {dataElements.map(el => <span key={el} className="dm-tag">{`{{${el}}}`}</span>)}
        </div>
      </div>
    )
  }
  return (
    <div className="dm-list">
      {dataElements.map(element => {
        const m = mappings[element]
        return (
          <div key={element} className="dm-row">
            <span className="dm-element">{`{{${element}}}`}</span>
            <span className="dm-arrow">→</span>
            <div className="dm-selectors">
              <select className="dm-select" value={m?.sourceId || ''}
                onChange={e => {
                  const id = Number(e.target.value)
                  if (id) onMap(element, id, dataSources.find(s => s.id === id)?.columns[0] || '')
                  else onMap(element, null, null)
                }}>
                <option value="">Source…</option>
                {dataSources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              {m?.sourceId && (
                <select className="dm-select" value={m.column || ''}
                  onChange={e => onMap(element, m.sourceId, e.target.value)}>
                  {dataSources.find(s => s.id === m.sourceId)?.columns.map(col =>
                    <option key={col} value={col}>{col}</option>
                  )}
                </select>
              )}
            </div>
            {m?.sourceId && m?.column && <span className="dm-mapped-badge">✓</span>}
          </div>
        )
      })}
    </div>
  )
}

// ── ZIP mode: CSS-selector binding ────────────────────────────────────────────
function ZipBinding({ binding, dataSources, onUpdate, onRemove, onStartPick }) {
  const [showFormat, setShowFormat] = useState(false)
  const src = dataSources.find(s => s.id === binding.sourceId)
  const isMapped = binding.selector && binding.sourceId && binding.column

  return (
    <div className={`zip-binding ${isMapped ? 'mapped' : ''}`}>
      <div className="zip-binding-header">
        <span className="zip-binding-label">{binding.label}</span>
        <div className="zip-binding-actions">
          {isMapped && (
            <button className="fmt-toggle-btn" onClick={() => setShowFormat(v => !v)}
              title="Number format">
              {showFormat ? '▲ Format' : '▼ Format'}
            </button>
          )}
          <button className="zip-binding-remove" onClick={() => onRemove(binding.id)}>×</button>
        </div>
      </div>

      <div className="zip-binding-selector-row">
        <input className="selector-input"
          placeholder="CSS selector — or use Pick to click an element"
          value={binding.selector}
          onChange={e => onUpdate(binding.id, { selector: e.target.value })} />
        <button className="pick-btn" onClick={() => onStartPick(binding.id)}>
          ⊕ Pick
        </button>
      </div>

      <div className="zip-binding-source-row">
        <select className="dm-select" value={binding.sourceId || ''}
          onChange={e => {
            const id = Number(e.target.value)
            if (id) onUpdate(binding.id, { sourceId: id, column: dataSources.find(s => s.id === id)?.columns[0] || null })
            else onUpdate(binding.id, { sourceId: null, column: null })
          }}>
          <option value="">Select data source…</option>
          {dataSources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        {binding.sourceId && (
          <select className="dm-select" value={binding.column || ''}
            onChange={e => onUpdate(binding.id, { column: e.target.value })}>
            {src?.columns.map(col => <option key={col} value={col}>{col}</option>)}
          </select>
        )}
      </div>

      {isMapped && (
        <div className="binding-status-row">
          <span className="dm-mapped-badge">✓ Mapped</span>
          <span className="binding-selector-preview">{binding.selector}</span>
        </div>
      )}

      {showFormat && isMapped && (
        <FormatPicker
          format={binding.format}
          onChange={fmt => onUpdate(binding.id, { format: fmt })}
        />
      )}
    </div>
  )
}

function ZipMapping({ zipBindings, suggestedPoints, dataSources, onAddBinding, onRemoveBinding, onUpdateBinding, onStartPick, onClearSuggestions, onApply }) {
  const [newLabel, setNewLabel] = useState('')

  const addBinding = (label = '', selector = '', detectedType = null) => {
    onAddBinding({
      id: Date.now().toString(),
      selector,
      label: label || `Element ${zipBindings.length + 1}`,
      sourceId: null,
      column: null,
      format: detectedType ? defaultFormat(detectedType) : { type: 'none' },
    })
  }

  if (!dataSources.length) {
    return (
      <div className="dm-empty">
        <p className="dm-empty-title">No data sources</p>
        <p className="dm-empty-text">
          Connect an Excel or Power BI source first, then map elements from your dashboard.
        </p>
      </div>
    )
  }

  return (
    <div className="zip-mapping">
      <div className="dm-apply-bar">
        <p className="dm-info">
          Click <strong>⊕ Pick</strong> to select an element in the preview, map it to a column, then hit Apply.
        </p>
        <button className="apply-bindings-btn" onClick={onApply}
          disabled={!zipBindings.some(b => b.selector && b.sourceId && b.column)}>
          ▶ Apply Bindings
        </button>
      </div>

      {/* Suggested data points from last pick */}
      {suggestedPoints.length > 0 && (
        <div className="suggestions-box">
          <div className="suggestions-header">
            <span>Detected data points</span>
            <button className="suggestions-dismiss" onClick={onClearSuggestions}>✕</button>
          </div>
          {suggestedPoints.map((pt, i) => (
            <div key={i} className="suggestion-row">
              <span className="suggestion-text">{pt.text}</span>
              <span className="suggestion-type">{pt.type}</span>
              <button className="suggestion-add" onClick={() => {
                addBinding(pt.text, pt.selector, pt.type)
                onClearSuggestions()
              }}>
                + Map
              </button>
            </div>
          ))}
        </div>
      )}

      {zipBindings.map(binding => (
        <ZipBinding
          key={binding.id}
          binding={binding}
          dataSources={dataSources}
          onUpdate={onUpdateBinding}
          onRemove={onRemoveBinding}
          onStartPick={onStartPick}
        />
      ))}

      <div className="add-binding-row">
        <input className="add-binding-input"
          placeholder="Label (e.g. Revenue)..."
          value={newLabel}
          onChange={e => setNewLabel(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { addBinding(newLabel); setNewLabel('') } }} />
        <button className="add-binding-btn" onClick={() => { addBinding(newLabel); setNewLabel('') }}>
          + Add
        </button>
      </div>
    </div>
  )
}

// ── Root export ───────────────────────────────────────────────────────────────
export default function DataMapping({
  mode,
  dataElements, mappings, onMap,
  zipBindings, suggestedPoints, onAddBinding, onRemoveBinding, onUpdateBinding, onStartPick, onClearSuggestions,
  dataSources, onApply,
}) {
  return (
    <div className="data-mapping">
      {mode === 'html'
        ? <HtmlMapping dataElements={dataElements} dataSources={dataSources} mappings={mappings} onMap={onMap} />
        : <ZipMapping zipBindings={zipBindings} suggestedPoints={suggestedPoints} dataSources={dataSources}
            onAddBinding={onAddBinding} onRemoveBinding={onRemoveBinding} onUpdateBinding={onUpdateBinding}
            onStartPick={onStartPick} onClearSuggestions={onClearSuggestions} onApply={onApply} />
      }
    </div>
  )
}
