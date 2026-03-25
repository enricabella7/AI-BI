import { useRef, useEffect, useState, useCallback } from 'react'
import './LivePreview.css'

export default function LivePreview({ mode, buildStatus, htmlCode, selectingElement, onElementSelected, bindingApply }) {
  const iframeRef = useRef(null)
  const [iframeKey, setIframeKey] = useState(0)
  const [iframeReady, setIframeReady] = useState(false)
  const prevStatus = useRef(buildStatus.status)

  // Reload iframe when a build/rebuild finishes
  useEffect(() => {
    const was = prevStatus.current
    const now = buildStatus.status
    prevStatus.current = now
    if (mode === 'zip' && now === 'ready' && (was === 'building' || was === 'modifying')) {
      setIframeReady(false)
      setIframeKey(k => k + 1)
    }
  }, [mode, buildStatus.status])

  // Send ENABLE/DISABLE postMessage — only after the iframe has loaded
  useEffect(() => {
    if (!iframeReady) return
    iframeRef.current?.contentWindow?.postMessage(
      { type: selectingElement ? 'ENABLE_SELECT_MODE' : 'DISABLE_SELECT_MODE' },
      '*'
    )
  }, [selectingElement, iframeReady])

  // Apply bindings on demand: POST to server (persists for reloads) + send direct postMessage
  useEffect(() => {
    if (!bindingApply || !iframeReady) return
    const { overrides } = bindingApply
    fetch('/api/data-override', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ overrides }),
    }).catch(console.error)
    iframeRef.current?.contentWindow?.postMessage({ type: 'APPLY_OVERRIDES', overrides }, '*')
  }, [bindingApply, iframeReady])

  // Also send immediately on iframe load if pick mode is already active
  const handleIframeLoad = useCallback(() => {
    setIframeReady(true)
    if (selectingElement) {
      iframeRef.current?.contentWindow?.postMessage({ type: 'ENABLE_SELECT_MODE' }, '*')
    }
    // Re-apply bindings after iframe reload (the iframe also does a one-time fetch, but postMessage is faster)
    if (bindingApply?.overrides) {
      iframeRef.current?.contentWindow?.postMessage({ type: 'APPLY_OVERRIDES', overrides: bindingApply.overrides }, '*')
    }
  }, [selectingElement, bindingApply])

  // Listen for element-selected postMessage from iframe
  useEffect(() => {
    const handler = (e) => {
      if (e.data?.type === 'ELEMENT_SELECTED' && onElementSelected) {
        onElementSelected(e.data.selector, e.data.text, e.data.dataPoints || [])
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [onElementSelected])

  // Render HTML code directly into iframe (HTML mode)
  useEffect(() => {
    if (mode !== 'html') return
    const iframe = iframeRef.current
    if (!iframe) return
    const doc = iframe.contentDocument || iframe.contentWindow?.document
    if (!doc) return
    doc.open()
    doc.write(buildHtmlDoc(htmlCode))
    doc.close()
  }, [mode, htmlCode])

  const isBuilding = ['uploading', 'extracting', 'installing', 'building'].includes(buildStatus.status)
  const isModifying = buildStatus.status === 'modifying'
  const isReady = buildStatus.status === 'ready'
  const isError = buildStatus.status === 'error'

  return (
    <div className="live-preview">
      <div className="preview-toolbar">
        <span className="preview-label">Live Preview</span>
        <div className="preview-toolbar-right">
          <span className="preview-mode-badge">{mode === 'zip' ? 'Figma Make' : 'HTML'}</span>
          {isReady && !selectingElement && <span className="preview-ready-badge">● Live</span>}
          {selectingElement && <span className="preview-pick-badge">⊕ Click any element in the preview</span>}
          {isModifying && <span className="preview-modifying-badge">⟳ AI applying changes...</span>}
        </div>
      </div>

      <div className={`preview-frame-wrap ${selectingElement ? 'picking' : ''}`}>
        {/* ── ZIP mode ──────────────────────────────────────────────── */}
        {mode === 'zip' && (
          <>
            {(isReady || isModifying) && (
              <>
                <iframe
                  key={iframeKey}
                  ref={iframeRef}
                  className="preview-frame"
                  src="/preview/"
                  title="Figma Make Preview"
                  onLoad={handleIframeLoad}
                />
                {isModifying && (
                  <div className="modifying-overlay">
                    <span className="modifying-spinner" />AI rebuilding…
                  </div>
                )}
              </>
            )}
            {isBuilding && <BuildProgress buildStatus={buildStatus} />}
            {isError && <ErrorState error={buildStatus.error} log={buildStatus.log} />}
            {buildStatus.status === 'idle' && (
              <Placeholder icon="⬡" title="No design loaded"
                text="Upload a Figma Make ZIP file from the Design panel." />
            )}
          </>
        )}

        {/* ── HTML mode ────────────────────────────────────────────── */}
        {mode === 'html' && (
          htmlCode
            ? <iframe ref={iframeRef} className="preview-frame" title="HTML Preview"
                sandbox="allow-scripts allow-same-origin" />
            : <Placeholder icon="◇" title="No code loaded"
                text="Paste HTML in the Design panel to preview it here." />
        )}
      </div>
    </div>
  )
}

function BuildProgress({ buildStatus }) {
  const { status, log } = buildStatus
  const STEPS = [
    { key: 'uploading', label: 'Uploading' },
    { key: 'extracting', label: 'Extracting ZIP' },
    { key: 'installing', label: 'Installing packages' },
    { key: 'building', label: 'Building' },
    { key: 'ready', label: 'Ready' },
  ]
  const currentIdx = STEPS.findIndex(s => s.key === status)
  return (
    <div className="build-progress">
      <div className="build-steps">
        {STEPS.map((step, i) => {
          const done = i < currentIdx || status === 'ready'
          const active = step.key === status
          return (
            <div key={step.key} className={`build-step ${done ? 'done' : ''} ${active ? 'active' : ''}`}>
              <span className="step-dot">{done ? '✓' : active ? '◉' : '○'}</span>
              <span className="step-label">{step.label}</span>
              {active && <span className="step-spinner" />}
            </div>
          )
        })}
      </div>
      {log.length > 0 && (
        <div className="build-console">
          <p className="console-header">Build output</p>
          <div className="console-lines">
            {log.slice(-15).map((line, i) => <div key={i} className="console-line">{line}</div>)}
          </div>
        </div>
      )}
      {status === 'installing' && (
        <p className="build-note">Installing packages may take 2–5 minutes.</p>
      )}
    </div>
  )
}

function ErrorState({ error, log }) {
  return (
    <div className="build-progress">
      <div className="error-banner">✗ Build failed</div>
      {error && <p className="error-message">{error}</p>}
      {log.length > 0 && (
        <div className="build-console">
          <p className="console-header">Last output</p>
          <div className="console-lines">
            {log.slice(-20).map((line, i) => <div key={i} className="console-line">{line}</div>)}
          </div>
        </div>
      )}
    </div>
  )
}

function Placeholder({ icon, title, text }) {
  return (
    <div className="preview-placeholder">
      <div className="placeholder-icon">{icon}</div>
      <p className="placeholder-title">{title}</p>
      <p className="placeholder-text">{text}</p>
    </div>
  )
}

function buildHtmlDoc(code) {
  const styleBlocks = (code.match(/<style[^>]*>[\s\S]*?<\/style>/gi) || []).join('\n')
  return `<!DOCTYPE html><html><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0f172a;color:#e2e8f0;padding:16px;min-height:100vh}</style>
${styleBlocks}</head><body>${code}</body></html>`
}
