// Copyright (c) 1998-2026 Nick Antonov (nick.antonov1@gmail.com) / Borodachamba Studio. All rights reserved.
import { useState, useEffect } from 'react'
import { useStore } from '../store'

const API = ''

export default function InvitePage() {
  const { login, register, authLoading, authError, setAuthError, setUser, setProfile } = useStore()
  const [code, setCode] = useState('')
  const [mentor, setMentor] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'login' | 'register'>('register')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [joined, setJoined] = useState(false)
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    const path = window.location.pathname
    const match = path.match(/\/invite\/(.+)/)
    if (match) {
      const inviteCode = decodeURIComponent(match[1])
      setCode(inviteCode)

      fetch(`${API}/api/auth/invite/${inviteCode}`)
        .then(r => r.json())
        .then(data => {
          if (data.valid) {
            setMentor(data.mentor)
          } else {
            setError(data.error || 'Недійсний код')
          }
          setLoading(false)
        })
        .catch(() => {
          setError('Помилка з\'єднання')
          setLoading(false)
        })
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError(null)

    if (mode === 'login') {
      const success = await login(email, password)
      if (success) {
        const currentToken = useStore.getState().token
        if (currentToken) {
          setToken(currentToken)
          joinWithCode(currentToken)
        }
      }
    } else {
      const success = await register(username, email, password, displayName || username)
      if (success) {
        const currentToken = useStore.getState().token
        if (currentToken) {
          setToken(currentToken)
          joinWithCode(currentToken)
        }
      }
    }
  }

  const joinWithCode = async (authToken: string) => {
    try {
      const resp = await fetch(`${API}/api/auth/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ code }),
      })
      const data = await resp.json()
      if (data.ok) {
        setJoined(true)
        fetch(`${API}/api/profile/me`, { headers: { Authorization: `Bearer ${authToken}` } })
          .then(r => r.json())
          .then(setProfile)
          .catch(() => {})
      }
    } catch {}
  }

  const goToApp = () => {
    window.location.href = '/'
  }

  const inputClass = 'w-full px-4 py-3 rounded-xl text-sm font-mono outline-none transition-all duration-200'
  const inputStyle = {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Перевірка коду...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-base)' }}>
        <div className="noise-bg" />
        <div className="mesh-gradient" />
        <div className="w-full max-w-md relative z-10">
          <div className="glass rounded-2xl p-8 text-center">
            <div className="text-5xl mb-4">❌</div>
            <h2 className="text-xl font-bold mb-2">Помилка</h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>{error}</p>
            <button onClick={goToApp} className="btn-primary !py-3 !px-6 !rounded-xl">
              На головну
            </button>
          </div>
          <div className="text-center mt-4 text-[10px]" style={{ color: 'var(--text-muted)' }}>
            © 1998-2026 Nick Antonov / Borodachamba Studio
          </div>
        </div>
      </div>
    )
  }

  if (joined) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-base)' }}>
        <div className="noise-bg" />
        <div className="mesh-gradient" />
        <div className="w-full max-w-md relative z-10">
          <div className="glass rounded-2xl p-8 text-center">
            <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-4xl" style={{ background: 'var(--success)', opacity: 0.2 }}>✅</div>
            <h2 className="text-xl font-bold mb-2">Вас запрошено!</h2>
            <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
              Ви приєдналися до ментора
            </p>
            {mentor && (
              <div className="flex items-center justify-center gap-3 mb-6 p-3 rounded-xl" style={{ background: 'var(--bg-surface)' }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: 'var(--gradient-1)' }}>
                  {mentor.avatar_url ? (
                    <img src={mentor.avatar_url} className="w-full h-full rounded-full object-cover" alt="" />
                  ) : (
                    mentor.display_name[0]
                  )}
                </div>
                <div className="text-left">
                  <div className="text-sm font-semibold">{mentor.display_name}</div>
                  <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Ваш ментор</div>
                </div>
              </div>
            )}
            <button onClick={goToApp} className="btn-primary !py-3 !px-6 !rounded-xl">
              Почати навчання →
            </button>
          </div>
          <div className="text-center mt-4 text-[10px]" style={{ color: 'var(--text-muted)' }}>
            © 1998-2026 Nick Antonov / Borodachamba Studio
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative" style={{ background: 'var(--bg-base)' }}>
      <div className="noise-bg" />
      <div className="mesh-gradient" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-6">
          <img src="/logo.svg" alt="PyLess" className="w-16 h-16 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gradient mb-2">PyLess</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Вас запросили на навчання!</p>
        </div>

        {mentor && (
          <div className="glass rounded-2xl p-4 mb-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold" style={{ background: 'var(--gradient-1)' }}>
              {mentor.avatar_url ? (
                <img src={mentor.avatar_url} className="w-full h-full rounded-xl object-cover" alt="" />
              ) : (
                mentor.display_name[0]
              )}
            </div>
            <div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Ваш ментор</div>
              <div className="text-sm font-semibold">{mentor.display_name}</div>
            </div>
            <div className="ml-auto">
              <div className="text-[10px] px-2 py-1 rounded-lg" style={{ background: 'var(--bg-surface)', color: 'var(--accent-light)' }}>
                Код: {code}
              </div>
            </div>
          </div>
        )}

        <div className="glass rounded-2xl p-6 space-y-5">
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--bg-surface)' }}>
            <button
              onClick={() => { setMode('register'); setAuthError(null) }}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all"
              style={{
                background: mode === 'register' ? 'var(--accent)' : 'transparent',
                color: mode === 'register' ? '#fff' : 'var(--text-muted)',
              }}
            >
              Реєстрація
            </button>
            <button
              onClick={() => { setMode('login'); setAuthError(null) }}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all"
              style={{
                background: mode === 'login' ? 'var(--accent)' : 'transparent',
                color: mode === 'login' ? '#fff' : 'var(--text-muted)',
              }}
            >
              Вхід
            </button>
          </div>

          {authError && (
            <div className="p-3 rounded-xl text-xs font-medium animate-slide-up" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--error)' }}>
              {authError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-[11px] font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Ім'я користувача</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="username"
                    required
                    className={inputClass}
                    style={inputStyle}
                    onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Відображуване ім'я</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Як тебе називати?"
                    className={inputClass}
                    style={inputStyle}
                    onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-[11px] font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                {mode === 'login' ? 'Email або логін' : 'Email'}
              </label>
              <input
                type={mode === 'login' ? 'text' : 'email'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={mode === 'login' ? 'you@example.com або username' : 'you@example.com'}
                required
                className={inputClass}
                style={inputStyle}
                onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Пароль</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Мінімум 6 символів"
                  required
                  minLength={6}
                  className={inputClass + ' pr-12'}
                  style={inputStyle}
                  onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full btn-primary !py-3 !text-sm !rounded-xl flex items-center justify-center gap-2"
              style={{ opacity: authLoading ? 0.6 : 1 }}
            >
              {authLoading ? (
                <><span className="animate-spin">⏳</span> {mode === 'login' ? 'Вхід...' : 'Реєстрація...'}</>
              ) : (
                mode === 'login' ? 'Увійти' : 'Створити акаунт'
              )}
            </button>
          </form>

          <div className="text-center pt-1">
            <button onClick={goToApp} className="text-xs font-medium transition-all hover:opacity-80" style={{ color: 'var(--accent-light)' }}>
              Продовжити без реєстрації →
            </button>
          </div>
        </div>
        <div className="text-center mt-4 text-[10px]" style={{ color: 'var(--text-muted)' }}>
          © 1998-2026 Nick Antonov / Borodachamba Studio. All rights reserved.
        </div>
      </div>
    </div>
  )
}
