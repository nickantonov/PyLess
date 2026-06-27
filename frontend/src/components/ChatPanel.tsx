import { useState, useEffect, useRef } from 'react'
import { useStore } from '../store'

interface Contact {
  id: number
  name: string
  avatar: string
  last_message: string
  last_time: string
  unread: number
}

interface Message {
  id: number
  from: number
  to: number
  text: string
  read: boolean
  time: string
}

export default function ChatPanel({ onClose }: { onClose: () => void }) {
  const { token, user } = useStore()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEnd = useRef<HTMLDivElement>(null)
  const pollRef = useRef<any>(null)

  const headers: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {}

  useEffect(() => {
    fetchContacts()
    pollRef.current = setInterval(fetchContacts, 5000)
    return () => clearInterval(pollRef.current)
  }, [])

  useEffect(() => {
    if (selectedContact) {
      loadMessages(selectedContact.id)
      pollRef.current = setInterval(() => loadMessages(selectedContact.id), 3000)
      return () => clearInterval(pollRef.current)
    }
  }, [selectedContact?.id])

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchContacts = async () => {
    try {
      const resp = await fetch('/api/messages/contacts', { headers })
      const data = await resp.json()
      setContacts(data)
    } catch {}
  }

  const loadMessages = async (userId: number) => {
    try {
      const resp = await fetch(`/api/messages/${userId}`, { headers })
      const data = await resp.json()
      setMessages(data)
    } catch {}
  }

  const sendMessage = async () => {
    if (!input.trim() || !selectedContact) return
    const text = input.trim()
    setInput('')
    setLoading(true)

    try {
      await fetch(`/api/messages/${selectedContact.id}`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      await loadMessages(selectedContact.id)
      fetchContacts()
    } catch {}
    setLoading(false)
  }

  const isMentor = user?.role === 'admin' || user?.role === 'mentor'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-3xl h-[70vh] glass rounded-2xl overflow-hidden flex" style={{ border: '1px solid var(--border)' }}>
        {/* Contacts list */}
        <div className="w-64 flex-shrink-0 flex flex-col" style={{ borderRight: '1px solid var(--border)' }}>
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
            <span className="text-sm font-bold">
              {isMentor ? '👥 Мої учні' : '💬 Мій ментор'}
            </span>
            <button onClick={onClose} className="btn-ghost !p-1.5 !rounded-lg text-xs">✕</button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {contacts.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedContact(c)}
                className="w-full text-left px-4 py-3 flex items-center gap-3 transition-all"
                style={{
                  background: selectedContact?.id === c.id ? 'var(--accent-glow)' : 'transparent',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: 'var(--gradient-1)', color: '#fff' }}>
                  {c.avatar ? <img src={c.avatar} className="w-full h-full rounded-full object-cover" alt="" /> : c.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold truncate">{c.name}</span>
                    {c.unread > 0 && (
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                        style={{ background: 'var(--accent)', color: '#fff' }}>
                        {c.unread}
                      </span>
                    )}
                  </div>
                  {c.last_message && (
                    <div className="text-[10px] truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {c.last_message}
                    </div>
                  )}
                </div>
              </button>
            ))}
            {contacts.length === 0 && (
              <div className="p-6 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                {isMentor ? 'Поки немає учнів' : 'Поки немає ментора'}
              </div>
            )}
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col">
          {selectedContact ? (
            <>
              <div className="px-4 py-3 flex items-center gap-3" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: 'var(--gradient-1)', color: '#fff' }}>
                  {selectedContact.avatar ? <img src={selectedContact.avatar} className="w-full h-full rounded-full object-cover" alt="" /> : selectedContact.name[0]}
                </div>
                <span className="text-sm font-semibold">{selectedContact.name}</span>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map(m => {
                  const isMine = m.from === user?.id
                  return (
                    <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className="max-w-[70%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed"
                        style={{
                          background: isMine ? 'var(--accent)' : 'var(--bg-surface)',
                          color: isMine ? '#fff' : 'var(--text-primary)',
                          borderBottomRightRadius: isMine ? '4px' : '16px',
                          borderBottomLeftRadius: isMine ? '16px' : '4px',
                        }}>
                        <div>{m.text}</div>
                        <div className="text-[9px] mt-1 opacity-60">
                          {new Date(m.time).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEnd} />
              </div>

              <div className="p-3 flex gap-2" style={{ borderTop: '1px solid var(--border)' }}>
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendMessage()}
                  placeholder="Повідомлення..."
                  className="flex-1 !text-xs !py-2.5 !rounded-xl"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                />
                <button onClick={sendMessage} disabled={loading || !input.trim()}
                  className="btn-primary !py-2.5 !px-4 !text-xs !rounded-xl"
                  style={{ opacity: loading || !input.trim() ? 0.5 : 1 }}>
                  →
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>
              <div className="text-center">
                <div className="text-4xl mb-3">💬</div>
                <div className="text-sm">Обери чат зліва</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
