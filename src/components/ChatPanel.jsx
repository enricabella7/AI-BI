import { useState, useRef, useEffect } from 'react'
import './ChatPanel.css'

const SYSTEM_GREETING = {
  role: 'assistant',
  text: "Hi! I'm your AI design assistant. Paste or upload your Figma code, then tell me what changes you'd like — colors, layout, new elements, data bindings, and more.",
}

export default function ChatPanel({ code, onCodeChange }) {
  const [messages, setMessages] = useState([SYSTEM_GREETING])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = () => {
    const text = input.trim()
    if (!text) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text }])
    setLoading(true)

    // Simulate AI response — in production this would call an LLM API
    setTimeout(() => {
      const response = generateResponse(text, code)
      setMessages(prev => [...prev, { role: 'assistant', text: response.message }])
      if (response.updatedCode) {
        onCodeChange(response.updatedCode)
      }
      setLoading(false)
    }, 800 + Math.random() * 700)
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
          placeholder="Describe changes to your design..."
          rows={2}
        />
        <button className="chat-send" onClick={sendMessage} disabled={loading || !input.trim()}>
          Send
        </button>
      </div>
    </div>
  )
}

function generateResponse(userMessage, currentCode) {
  const msg = userMessage.toLowerCase()

  if (!currentCode) {
    return {
      message: "I don't see any code loaded yet. Please upload or paste your Figma-generated code first, then I can help you iterate on the design.",
    }
  }

  // Color change requests
  if (msg.includes('color') || msg.includes('blue') || msg.includes('red') || msg.includes('green') || msg.includes('dark') || msg.includes('light') || msg.includes('theme')) {
    return {
      message: "I've noted your color/theme request. In production, I would modify the CSS variables and color values in your code. For now, try editing the code directly or connect to an LLM API for full AI-powered edits.",
    }
  }

  // Layout requests
  if (msg.includes('layout') || msg.includes('grid') || msg.includes('column') || msg.includes('row') || msg.includes('flex') || msg.includes('sidebar') || msg.includes('responsive')) {
    return {
      message: "Layout changes noted! I can adjust flexbox/grid properties, column counts, spacing, and responsive breakpoints. Connect an LLM API key in the settings to enable full code transformation.",
    }
  }

  // Data binding
  if (msg.includes('data') || msg.includes('bind') || msg.includes('connect') || msg.includes('excel') || msg.includes('power bi') || msg.includes('placeholder')) {
    return {
      message: "To bind data: 1) Add {{placeholders}} in your code where dynamic values should appear, 2) Go to the Data Sources tab to upload an Excel file or connect Power BI, 3) Use the Mapping tab to link each placeholder to a data column.",
    }
  }

  // Add element
  if (msg.includes('add') || msg.includes('new') || msg.includes('insert') || msg.includes('create')) {
    return {
      message: "I can help add new elements to your design — cards, charts, tables, headers, etc. Connect an LLM API for automatic code generation, or describe what you need and I'll provide code snippets you can paste.",
    }
  }

  return {
    message: `I understand you want to "${userMessage}". To make AI-powered code changes automatically, configure an LLM API endpoint in the app settings. In the meantime, I can guide you on how to make this change manually in the code editor.`,
  }
}
