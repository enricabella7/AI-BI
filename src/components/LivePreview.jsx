import { useRef, useEffect, useState } from 'react'
import './LivePreview.css'

export default function LivePreview({ mode, buildStatus, htmlCode }) {
  const iframeRef = useRef(null)
  const [iframeKey, setIframeKey] = useState(0)

  // When zip build becomes ready, refresh the iframe
  useEffect(() => {
    if (mode === 'zip' && buildStatus.status === 'ready') {
      setIframeKey(k => k + 1)
    }
  }, [mode, buildStatus.status])

  // Render HTML code directly into iframe
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

  // ── Zip mode ───────────────────────────────────────────────────────────
  if (mode === 'zip') {
    return (
      <div className="live-preview">
        <PreviewToolbar mode={mode} buildStatus={buildStatus} />
        <div className="preview-frame-wrap">
          {buildStatus.status === 'ready' ? (
            <iframe
              key={iframeKey}
              className="preview-frame"
              src="/preview/"
              title="Figma Make Preview"
            />
          ) : buildStatus.status === 'idle' ? (
            <Placeholder
              icon="⬡"
              title="No design loaded"
              text="Upload a Figma Make ZIP file from the Design panel to see your dashboard here."
            />
          ) : (
            <BuildProgress buildStatus={buildStatus} />
          )}
        </div>
      </div>
    )
  }

  // ── HTML mode ──────────────────────────────────────────────────────────
  return (
    <div className="live-preview">
      <PreviewToolbar mode={mode} buildStatus={buildStatus} />
      <div className="preview-frame-wrap">
        {htmlCode ? (
          <iframe
            ref={iframeRef}
            className="preview-frame"
            title="HTML Preview"
            sandbox="allow-scripts allow-same-origin"
          />
        ) : (
          <Placeholder
            icon="◇"
            title="No code loaded"
            text="Switch to HTML mode and paste your HTML/JSX code in the Design panel."
          />
        )}
      </div>
    </div>
  )
}

function PreviewToolbar({ mode, buildStatus }) {
  return (
    <div className="preview-toolbar">
      <span className="preview-label">Live Preview</span>
      <div className="preview-toolbar-right">
        <span className="preview-mode-badge">
          {mode === 'zip' ? 'Figma Make' : 'HTML'}
        </span>
        {buildStatus.status === 'ready' && (
          <span className="preview-ready-badge">● Live</span>
        )}
      </div>
    </div>
  )
}

function BuildProgress({ buildStatus }) {
  const { status, log } = buildStatus

  const STEPS = [
    { key: 'uploading',   label: 'Uploading'            },
    { key: 'extracting',  label: 'Extracting ZIP'       },
    { key: 'installing',  label: 'Installing packages'  },
    { key: 'building',    label: 'Building'             },
    { key: 'ready',       label: 'Ready'                },
  ]

  const currentIdx = STEPS.findIndex(s => s.key === status)

  return (
    <div className="build-progress">
      <div className="build-steps">
        {STEPS.map((step, i) => {
          const done = i < currentIdx || status === 'ready'
          const active = step.key === status
          const failed = status === 'error' && i === currentIdx
          return (
            <div
              key={step.key}
              className={`build-step ${done ? 'done' : ''} ${active ? 'active' : ''} ${failed ? 'failed' : ''}`}
            >
              <span className="step-dot">
                {done ? '✓' : active ? '◉' : '○'}
              </span>
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
            {log.slice(-15).map((line, i) => (
              <div key={i} className="console-line">{line}</div>
            ))}
          </div>
        </div>
      )}

      {status === 'installing' && (
        <p className="build-note">
          Installing packages may take 2–5 minutes depending on your internet speed.
        </p>
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
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #e2e8f0; padding: 16px; min-height: 100vh; }
</style>
${styleBlocks}
</head>
<body>${code}</body>
</html>`
}
