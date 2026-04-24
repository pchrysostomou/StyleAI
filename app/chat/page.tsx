'use client'

import { useState, useRef, useEffect } from 'react'

type Message = {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const QUICK_PROMPTS = [
  'Τι φοράω για casual weekend;',
  'Έχω γάμο Σάββατο — τι φοράω;',
  'Ποια χρώματα ταιριάζουν μεταξύ τους;',
  'Πώς φαίνομαι πιο ψηλός/ή;',
  'Τι φοράω για business meeting;',
  'Suggest a smart-casual outfit',
]

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Γεια! Είμαι ο AI stylist σου. Γνωρίζω τη ντουλάπα σου και το style profile σου. Πες μου τι θέλεις να φορέσεις — ή απλά ρώτα με οτιδήποτε για το στυλ σου! 👗✨',
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(text?: string) {
    const messageText = (text ?? input).trim()
    if (!messageText || loading) return

    const userMessage: Message = {
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)

    // Build history (exclude first greeting from assistant)
    const history = messages.slice(1).map((m) => ({
      role: m.role,
      content: m.content,
    }))

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageText, history }),
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Failed to get response')

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.reply,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMessage])
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong'
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Sorry, I couldn't respond: ${message}. Please try again.`,
          timestamp: new Date(),
        },
      ])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', flexDirection: 'column' }}>
      {/* Nav */}
      <nav style={{
        padding: '1rem 2rem', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', borderBottom: '1px solid var(--border)',
        background: 'rgba(8,8,8,0.9)', backdropFilter: 'blur(12px)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <span className="font-display" style={{ fontSize: '1.2rem', color: 'var(--accent)', letterSpacing: '0.05em' }}>
            StyleAI
          </span>
          <NavLinks active="chat" />
        </div>
        <form action="/api/auth/signout" method="post">
          <button className="btn btn-ghost" style={{ fontSize: '0.8rem' }}>Sign out</button>
        </form>
      </nav>

      {/* Chat layout */}
      <div style={{ flex: 1, display: 'flex', maxWidth: '800px', width: '100%', margin: '0 auto', flexDirection: 'column', padding: '0 1.5rem' }}>

        {/* Header */}
        <div style={{ padding: '1.5rem 0 1rem', borderBottom: '1px solid var(--border)', marginBottom: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '50%',
              background: 'var(--accent-glow)',
              border: '1px solid var(--accent-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.1rem',
            }}>
              ✨
            </div>
            <div>
              <h1 className="font-display" style={{ fontSize: '1.25rem', lineHeight: 1.2 }}>AI Stylist</h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                Knows your wardrobe · Always available
              </p>
            </div>
            <div style={{
              marginLeft: 'auto',
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.3rem 0.75rem',
              background: 'rgba(92,184,122,0.08)',
              border: '1px solid rgba(92,184,122,0.2)',
              borderRadius: '999px',
            }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success)', animation: 'pulse-gold 2s infinite' }} />
              <span style={{ fontSize: '0.7rem', color: 'var(--success)' }}>Online</span>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 0', display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: 0 }}>
          {messages.map((msg, i) => (
            <div
              key={i}
              className="animate-fade-in"
              style={{
                display: 'flex',
                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                gap: '0.6rem',
                alignItems: 'flex-start',
              }}
            >
              {/* Avatar */}
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: msg.role === 'user' ? 'var(--accent)' : 'var(--accent-glow)',
                border: msg.role === 'assistant' ? '1px solid var(--accent-border)' : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.8rem', flexShrink: 0,
                color: msg.role === 'user' ? '#080808' : 'var(--accent)',
              }}>
                {msg.role === 'user' ? '👤' : '✨'}
              </div>

              {/* Bubble */}
              <div style={{
                maxWidth: '72%',
                padding: '0.875rem 1.1rem',
                borderRadius: msg.role === 'user'
                  ? 'var(--radius-lg) var(--radius-md) var(--radius-md) var(--radius-lg)'
                  : 'var(--radius-md) var(--radius-lg) var(--radius-lg) var(--radius-md)',
                background: msg.role === 'user' ? 'var(--accent)' : 'var(--bg-surface)',
                color: msg.role === 'user' ? '#080808' : 'var(--text-primary)',
                border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none',
                fontSize: '0.9rem',
                lineHeight: 1.65,
              }}>
                <p style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                <p style={{
                  fontSize: '0.65rem',
                  color: msg.role === 'user' ? 'rgba(0,0,0,0.4)' : 'var(--text-muted)',
                  marginTop: '0.4rem',
                  textAlign: msg.role === 'user' ? 'left' : 'right',
                }}>
                  {msg.timestamp.toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div className="animate-fade-in" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: 'var(--accent-glow)', border: '1px solid var(--accent-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem',
              }}>
                ✨
              </div>
              <div style={{
                padding: '0.875rem 1.1rem',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md) var(--radius-lg) var(--radius-lg) var(--radius-md)',
                display: 'flex', gap: '4px', alignItems: 'center',
              }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} style={{
                    width: '6px', height: '6px', borderRadius: '50%',
                    background: 'var(--accent)',
                    animation: `pulse-gold 1.2s ease ${i * 0.2}s infinite`,
                  }} />
                ))}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick prompts */}
        {messages.length <= 2 && (
          <div style={{ paddingBottom: '1rem' }}>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
              QUICK QUESTIONS
            </p>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  disabled={loading}
                  style={{
                    padding: '0.4rem 0.8rem',
                    borderRadius: '999px',
                    border: '1px solid var(--border-strong)',
                    background: 'var(--bg-surface)',
                    color: 'var(--text-secondary)',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    fontFamily: 'Inter, sans-serif',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input area */}
        <div style={{
          borderTop: '1px solid var(--border)',
          padding: '1rem 0 1.5rem',
          display: 'flex',
          gap: '0.75rem',
          alignItems: 'flex-end',
        }}>
          <textarea
            ref={inputRef}
            id="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder='Ask your stylist... (e.g. "Τι φοράω για γάμο;")'
            rows={1}
            disabled={loading}
            style={{
              flex: 1,
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius-lg)',
              color: 'var(--text-primary)',
              fontFamily: 'Inter, sans-serif',
              fontSize: '0.9rem',
              padding: '0.875rem 1rem',
              outline: 'none',
              resize: 'none',
              minHeight: '48px',
              maxHeight: '140px',
              overflowY: 'auto',
              lineHeight: 1.5,
              transition: 'border-color 0.2s ease',
            }}
            onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--border-strong)'}
          />
          <button
            id="send-message-btn"
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="btn btn-primary"
            style={{
              padding: '0.875rem 1.25rem',
              borderRadius: 'var(--radius-lg)',
              flexShrink: 0,
              opacity: !input.trim() || loading ? 0.5 : 1,
            }}
          >
            {loading ? <SpinnerIcon size={16} /> : '→'}
          </button>
        </div>
      </div>
    </main>
  )
}

/* ─── Nav Links ─── */
function NavLinks({ active }: { active: string }) {
  const links = [
    { href: '/dashboard', label: 'Profile',  id: 'profile' },
    { href: '/wardrobe',  label: 'Wardrobe', id: 'wardrobe' },
    { href: '/outfit',    label: 'Outfit',   id: 'outfit' },
    { href: '/history',   label: 'History',  id: 'history' },
    { href: '/chat',      label: 'Stylist',  id: 'chat' },
  ]
  return (
    <div style={{ display: 'flex', gap: '0.25rem' }}>
      {links.map((l) => (
        <a
          key={l.href}
          href={l.href}
          style={{
            padding: '0.4rem 0.9rem',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.85rem',
            textDecoration: 'none',
            color: active === l.id ? 'var(--accent)' : 'var(--text-secondary)',
            background: active === l.id ? 'var(--accent-glow)' : 'transparent',
            border: active === l.id ? '1px solid var(--accent-border)' : '1px solid transparent',
            transition: 'all 0.15s ease',
          }}
        >
          {l.label}
        </a>
      ))}
    </div>
  )
}

function SpinnerIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round"
      style={{ animation: 'spin-slow 1s linear infinite', flexShrink: 0 }}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
}
