import { useRef, useEffect } from 'react'
import './LivePreview.css'

export default function LivePreview({ code }) {
  const iframeRef = useRef(null)

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return

    const doc = iframe.contentDocument || iframe.contentWindow?.document
    if (!doc) return

    // Build a full HTML document with the user's code rendered inside
    const html = buildPreviewHtml(code)
    doc.open()
    doc.write(html)
    doc.close()
  }, [code])

  return (
    <div className="live-preview">
      <div className="preview-toolbar">
        <span className="preview-label">Live Preview</span>
        {!code && <span className="preview-empty-hint">Upload or paste code to see a preview</span>}
      </div>
      <div className="preview-frame-wrap">
        {code ? (
          <iframe
            ref={iframeRef}
            className="preview-frame"
            title="Live Preview"
            sandbox="allow-scripts allow-same-origin"
          />
        ) : (
          <div className="preview-placeholder">
            <div className="placeholder-icon">◇</div>
            <p className="placeholder-title">No design loaded</p>
            <p className="placeholder-text">
              Upload a Figma-generated file or paste your HTML/JSX code in the Code panel to preview your dashboard design here.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function buildPreviewHtml(code) {
  // Detect if the code looks like JSX (contains className=, or import/export)
  const isJsx = /className\s*=/.test(code) || /import\s/.test(code) || /<\w+\s[^>]*\/>/.test(code)

  // For JSX, strip imports/exports and convert className → class for basic rendering
  let renderable = code
  if (isJsx) {
    renderable = code
      .replace(/^import\s.*$/gm, '')
      .replace(/^export\s+default\s+/gm, '')
      .replace(/^export\s+/gm, '')
      .replace(/className=/g, 'class=')
      // Remove function wrapper if it's a component
      .replace(/function\s+\w+\s*\([^)]*\)\s*\{/, '')
      .replace(/const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*\{?/, '')
      .replace(/const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*\(/, '')
      // Remove return statement wrapping
      .replace(/^\s*return\s*\(\s*/gm, '')
      .replace(/^\s*\);\s*$/gm, '')
      .replace(/^\s*\}\s*$/gm, '')
      // Self-closing tags without content
      .replace(/\{\/\*.*?\*\/\}/g, '')
  }

  // Extract inline <style> blocks if any
  const styleMatch = renderable.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || []
  const styles = styleMatch.map(s => s).join('\n')

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #0f172a;
    color: #e2e8f0;
    padding: 16px;
    min-height: 100vh;
  }
  /* Sensible defaults for common Figma-exported elements */
  .frame, .component, [class*="frame"], [class*="Frame"] {
    display: flex;
  }
</style>
${styles}
</head>
<body>
${renderable}
</body>
</html>`
}
