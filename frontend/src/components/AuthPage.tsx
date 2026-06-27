import { useState, useEffect } from 'react'
import { useStore } from '../store'

export default function AuthPage() {
  const { login, register, authLoading, authError, setAuthError, user, token, setUser, setProfile } = useStore()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const urlToken = params.get('token')
    if (urlToken) {
      localStorage.setItem('pylesss_token', urlToken)
      fetch('/api/auth/me', { headers: { Authorization: `Bearer ${urlToken}` } })
        .then((r) => r.json())
        .then((u) => {
          setUser(u, urlToken)
          useStore.setState({ view: 'app' })
          window.history.replaceState({}, '', '/')
        })
        .catch(() => {})
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (mode === 'login') {
      await login(email, password)
    } else {
      await register(username, email, password, displayName || username)
    }
  }

  const handleGoogleLogin = () => {
    window.location.href = '/api/auth/google'
  }

  const inputClass = 'w-full px-4 py-3 rounded-xl text-sm font-mono outline-none transition-all duration-200'
  const inputStyle = {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative" style={{ background: 'var(--bg-base)' }}>
      <div className="noise-bg" />
      <div className="mesh-gradient" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-3xl" style={{ background: 'var(--gradient-1)' }}>🐍</div>
          <h1 className="text-3xl font-bold text-gradient mb-2">PyLess</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Вчись Python — граючи</p>
        </div>

        <div className="glass rounded-2xl p-6 space-y-5">
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--bg-surface)' }}>
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

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" style={{ borderColor: 'var(--border)' }} />
            </div>
            <div className="relative flex justify-center text-[11px]" style={{ color: 'var(--text-muted)' }}>
              <span className="px-3" style={{ background: 'var(--bg-panel)' }}>або</span>
            </div>
          </div>

          <button
            onClick={handleGoogleLogin}
            className="w-full py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-3 transition-all hover:opacity-90"
            style={{
              background: '#fff',
              color: '#3c4043',
              border: '1px solid #dadce0',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Увійти через Google
          </button>

          <div className="text-center pt-1">
            <button
              onClick={() => {
                set({ token: null, user: null, profile: null })
                useStore.setState({ view: 'app' })
              }}
              className="text-xs font-medium transition-all hover:opacity-80"
              style={{ color: 'var(--accent-light)' }}
            >
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

function set(obj: any) {
  useStore.setState(obj)
}
