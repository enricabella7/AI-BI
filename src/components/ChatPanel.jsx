import { useState, useRef, useEffect } from 'react'
import './ChatPanel.css'

const GREETINGS = {
  zip: "Hi! Upload a Figma Make ZIP to get started. Once it's rendered, I can help you iterate on the design — changing colors, layout, components, and connecting data.",
  html: "Hi! Paste your HTML code in the Design panel, then describe changes you'd like to make. You can also add {{placeholder}} syntax and connect data sources.",
}

export default function ChatPanel({ mode, buildStatus, htmlCode, onHtmlCodeChange }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: GREETINGS[mode] }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const prevMode = useRef(mode)

  // Update greeting when mode changes
  useEffect(() => {
    if (prevMode.current !== mode) {
      prevMode.current = mode
      setMessages([{ role: 'assistant', text: GREETINGS[mode] }])
    }
  }, [mode])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = () => {
    const text = input.trim()
    if (!text) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text }])
    setLoading(true)
    setTimeout(() => {
      const response = generateResponse(text, mode, buildStatus, htmlCode)
      setMessages(prev => [...prev, { role: 'assistant', text: response.message }])
      if (response.updatedCode) onHtmlCodeChange(response.updatedCode)
      setLoading(false)
    }, 600 + Math.random() * 600)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <span className="chat-title">Design Assistant</span>
        <span className="chat-status">
          <span className="status-dot" /> Online
        </span>
      </div>

      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`chat-msg ${msg.role}`}>
            {msg.role === 'assistant' && <span className="msg-avatar">AI</span>}
            <div className="msg-bubble">
              <p>{msg.text}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="chat-msg assistant">
            <span className="msg-avatar">AI</span>
            <div className="msg-bubble typing">
              <span /><span /><span />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="chat-input-area">
        <textarea
          className="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            mode === 'zip'
              ? buildStatus.status === 'ready'
                ? 'Describe a change to the design...'
                : 'Upload a ZIP to start iterating...'
              : 'Describe changes or ask a question...'
          }
          rows={2}
          disabled={loading}
        />
        <button
          className="chat-send"
          onClick={sendMessage}
          disabled={loading || !input.trim()}
        >
          Send
        </button>
      </div>
    </div>
  )
}

function generateResponse(userMsg, mode, buildStatus, htmlCode) {
  const msg = userMsg.toLowerCase()

  // ── Zip mode responses ────────────────────────────────────────────────
  if (mode === 'zip') {
    if (buildStatus.status !== 'ready') {
      return {
        message: 'Please wait until the ZIP is fully built and the preview is ready before requesting changes.',
      }
    }

    if (msg.includes('color') || msg.includes('theme') || msg.includes('dark') || msg.includes('light')) {
      return {
        message: "To change colors/theme: edit the CSS variables in the extracted project's `src/styles/theme.css`, then re-upload the ZIP. I can generate the specific CSS changes for you — just tell me the target color palette.",
      }
    }

    if (msg.includes('data') || msg.includes('connect') || msg.includes('excel') || msg.includes('real')) {
      return {
        message: "To connect live data: go to the Data Sources tab to upload an Excel file or connect Power BI. Then switch to HTML mode to use {{placeholder}} bindings, or modify the TypeScript files in the ZIP to fetch from your API before re-uploading.",
      }
    }

    if (msg.includes('add') || msg.includes('remove') || msg.includes('change') || msg.includes('modify') || msg.includes('update')) {
      return {
        message: `To make structural changes to the design:\n\n1. Extract the ZIP\n2. Edit the TypeScript/TSX files (main component is in src/app/App.tsx)\n3. Re-zip the project folder\n4. Re-upload here\n\nConnect an LLM API to enable me to generate the exact code changes automatically.`,
      }
    }

    if (msg.includes('component') || msg.includes('chart') || msg.includes('table') || msg.includes('card')) {
      return {
        message: "The Figma Make project uses Recharts for charts and shadcn/ui for cards and tables. I can generate new component code for you — just describe what you need and I'll write the TSX that you can add to the project.",
      }
    }

    return {
      message: `I see you want to "${userMsg}". The preview is live above. To modify this design programmatically, I can generate code snippets for you to add to the project's TypeScript files. What specific change would you like to make?`,
    }
  }

  // ── HTML mode responses ───────────────────────────────────────────────
  if (!htmlCode) {
    return {
      message: "Please paste some HTML in the Design panel first, then I can help you modify it.",
    }
  }

  if (msg.includes('data') || msg.includes('bind') || msg.includes('placeholder') || msg.includes('connect')) {
    return {
      message: "To bind data: add {{placeholder}} in your HTML where values should appear (e.g. {{revenue}}), then go to Data Sources tab to upload an Excel file, and use the Mapping tab to link each placeholder to a column.",
    }
  }

  if (msg.includes('color') || msg.includes('background') || msg.includes('theme')) {
    return {
      message: "To change colors, edit the CSS in your HTML's <style> block. For example, change `background: #0f172a` to your preferred color. You can also add CSS variables at the top of your stylesheet for easy theming.",
    }
  }

  if (msg.includes('layout') || msg.includes('grid') || msg.includes('flex') || msg.includes('column')) {
    return {
      message: "For layout changes, use CSS Grid or Flexbox. A responsive dashboard grid: `display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem;`",
    }
  }

  return {
    message: `To "${userMsg}", I'd recommend editing the relevant section in your HTML/CSS. Connect an LLM API endpoint to enable me to make direct code edits. What part of the design is this about?`,
  }
}
