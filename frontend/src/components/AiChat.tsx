// Copyright (c) 1998-2026 Nick Antonov (nick.antonov1@gmail.com) / Borodachamba Studio. All rights reserved.
import { useState, useRef, useEffect } from 'react'
import { useStore } from '../store'

export default function AiChat() {
  const { aiMessages, aiLoading, addAiMessage, setAiLoading, currentTask, code, toggleAi } = useStore()
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [aiMessages])

  const send = async (text?: string) => {
    const msg = text || input.trim()
    if (!msg || aiLoading) return
    setInput('')
    addAiMessage({ role: 'user', text: msg })
    setAiLoading(true)

    try {
      const resp = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, task_id: currentTask?.id, code }),
      })
      const data = await resp.json()
      addAiMessage({ role: 'ai', text: data.reply || 'Помилка API' })
    } catch {
      addAiMessage({ role: 'ai', text: '⚠️ Не вдалося з\'єднатися з AI' })
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <aside className="w-80 flex-shrink-0 glass flex flex-col overflow-hidden animate-slide-up" style={{ borderLeft: '1px solid var(--border)' }}>
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center text-xs" style={{ background: 'var(--gradient-1)' }}>🤖</div>
          <span className="text-xs font-semibold">AI Викладач</span>
        </div>
        <button onClick={toggleAi} className="btn-ghost !p-1.5 !rounded-lg">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {aiMessages.length === 0 && (
          <div className="text-center py-12 animate-float">
            <div className="text-4xl mb-3">💬</div>
            <div className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Запитай щось</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>AI-викладач допоможе зрозуміти</div>
          </div>
        )}

        {aiMessages.map((msg, i) => (
          <div key={i} className={`animate-slide-up ${msg.role === 'user' ? 'ml-6' : 'mr-6'}`}>
            <div className="rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed" style={{
              background: msg.role === 'user' ? 'var(--accent)' : 'var(--bg-surface)',
              color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
              borderBottomRightRadius: msg.role === 'user' ? '4px' : '16px',
              borderBottomLeftRadius: msg.role === 'ai' ? '4px' : '16px',
            }}>
              <pre className="whitespace-pre-wrap font-sans">{msg.text}</pre>
            </div>
          </div>
        ))}

        {aiLoading && (
          <div className="mr-6 animate-slide-up">
            <div className="rounded-2xl px-3.5 py-2.5 text-xs" style={{ background: 'var(--bg-surface)', borderBottomLeftRadius: '4px' }}>
              <div className="flex gap-1">
                <span className="animate-bounce" style={{ animationDelay: '0ms' }}>●</span>
                <span className="animate-bounce" style={{ animationDelay: '150ms' }}>●</span>
                <span className="animate-bounce" style={{ animationDelay: '300ms' }}>●</span>
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="px-2 py-1.5 flex gap-1 flex-wrap" style={{ borderTop: '1px solid var(--border)' }}>
        {[
          { text: '📝 Поясни', msg: 'Поясни це завдання простими словами' },
          { text: '💡 Підказка', msg: 'Дай підказку, але не рішення' },
          { text: '🔍 Debug', msg: 'Що не так з моїм кодом?' },
        ].map((btn) => (
          <button key={btn.text} onClick={() => send(btn.msg)} className="text-[10px] px-2.5 py-1 rounded-lg glass-surface hover:border-[var(--accent)] border border-transparent transition-all">
            {btn.text}
          </button>
        ))}
      </div>

      <div className="p-2.5 flex gap-2" style={{ borderTop: '1px solid var(--border)' }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Запитання..."
          className="flex-1 !rounded-xl !text-xs"
        />
        <button onClick={() => send()} className="btn-primary !py-2 !px-3 !rounded-xl !text-xs">
          →
        </button>
      </div>
    </aside>
  )
}
