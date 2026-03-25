import { useState, useRef, useEffect } from 'react'
import './ChatPanel.css'

export default function ChatPanel({ mode, buildStatus, htmlCode, onHtmlCodeChange }) {
  const [messages, setMessages] = useState([{
    role: 'assistant',
    text: mode === 'zip'
      ? "Hi! Upload a Figma Make ZIP to get started. Once rendered, I can directly modify the design — change colors, add components, update layouts, and more. I need your Anthropic API key to make live edits."
      : "Hi! Paste your HTML in the Design panel, then describe what you'd like to change. I can also help you connect data sources using {{placeholder}} bindings."
  }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('ai-bi-api-key') || '')
  const [showApiKey, setShowApiKey] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const saveApiKey = (key) => {
    setApiKey(key)
    localStorage.setItem('ai-bi-api-key', key)
  }

  const isZipReady = mode === 'zip' && (buildStatus.status === 'ready' || buildStatus.status === 'modifying')

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text }])
    setLoading(true)

    try {
      // Use real AI for ZIP mode (modify the actual project), or give guidance for HTML mode
      if (mode === 'zip' && isZipReady) {
        if (!apiKey.trim()) {
          setMessages(prev => [...prev, {
            role: 'assistant',
            text: '⚠️ Please enter your Anthropic API key above to enable live design edits.',
          }])
          setLoading(false)
          return
        }

        const res = await fetch('/api/ai-modify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey, request: text }),
        })
        const data = await res.json()

        if (!res.ok || data.error) {
          setMessages(prev => [...prev, { role: 'assistant', text: `✗ ${data.error}` }])
        } else {
          setMessages(prev => [...prev, {
            role: 'assistant',
            text: '✓ Request sent to Claude. Modifying the source files and rebuilding... the preview will refresh automatically when done.',
          }])
        }
      } else {
        // Guidance mode (no API key or HTML mode or zip not built yet)
        const reply = getGuidanceReply(text, mode, buildStatus, htmlCode)
        setMessages(prev => [...prev, { role: 'assistant', text: reply }])
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', text: `✗ Error: ${err.message}` }])
    }
    setLoading(false)
  }

  // Show AI modifying status in chat
  useEffect(() => {
    if (buildStatus.status === 'modifying') {
      // Don't add duplicate messages
    }
    if (buildStatus.status === 'ready') {
      const last = messages[messages.length - 1]
      if (last?.text?.includes('Modifying the source files')) {
        setMessages(prev => [...prev, { role: 'assistant', text: '✓ Design updated! Check the preview.' }])
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildStatus.status])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <span className="chat-title">Design Assistant</span>
        <button className="api-key-toggle" onClick={() => setShowApiKey(v => !v)}>
          {apiKey ? '🔑 Key set' : '🔑 Add key'}
        </button>
      </div>

      {showApiKey && (
        <div className="api-key-area">
          <p className="api-key-label">Anthropic API Key</p>
          <p className="api-key-hint">Required for live design edits. Stored locally in your browser.</p>
          <div className="api-key-row">
            <input
              className="api-key-input"
              type="password"
              placeholder="sk-ant-..."
              value={apiKey}
              onChange={e => saveApiKey(e.target.value)}
            />
            {apiKey && <span className="api-key-set">✓</span>}
          </div>
        </div>
      )}

      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`chat-msg ${msg.role}`}>
            {msg.role === 'assistant' && <span className="msg-avatar">AI</span>}
            <div className="msg-bubble"><p>{msg.text}</p></div>
          </div>
        ))}
        {loading && (
          <div className="chat-msg assistant">
            <span className="msg-avatar">AI</span>
            <div className="msg-bubble typing"><span /><span /><span /></div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="chat-input-area">
        <textarea
          className="chat-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            !isZipReady && mode === 'zip'
              ? 'Upload a ZIP to enable AI edits...'
              : 'Describe a change (e.g. "make the header dark blue", "add a profit margin card")'
          }
          rows={2}
          disabled={loading}
        />
        <button className="chat-send" onClick={sendMessage} disabled={loading || !input.trim()}>
          Send
        </button>
      </div>
    </div>
  )
}

function getGuidanceReply(msg, mode, buildStatus, htmlCode) {
  const m = msg.toLowerCase()

  if (mode === 'zip' && buildStatus.status !== 'ready') {
    return 'Please wait until the ZIP finishes building before requesting changes.'
  }

  if (mode === 'zip') {
    return 'Enter your Anthropic API key (click "🔑 Add key" above) to enable live AI edits. Once set, I can directly modify the TypeScript source files and rebuild the preview.'
  }

  if (!htmlCode) return 'Paste some HTML in the Design panel first, then describe your changes.'

  if (m.includes('data') || m.includes('bind') || m.includes('connect')) {
    return 'To bind data: add {{placeholder}} in your HTML where values should appear, then go to Data Sources to upload Excel/Power BI, and use the Mapping tab to link each placeholder to a column.'
  }
  if (m.includes('color') || m.includes('theme') || m.includes('background')) {
    return 'Edit CSS colors in your HTML\'s <style> block. Use CSS variables (--primary-color: #...) in :root for easy theming across components.'
  }
  if (m.includes('layout') || m.includes('grid') || m.includes('flex')) {
    return 'Use CSS Grid for dashboards: `display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem;` wraps cards responsively.'
  }
  return `To make that change, edit the relevant HTML/CSS in the Design panel. Add your Anthropic API key and switch to Figma Make ZIP mode to enable fully automated AI edits.`
}
