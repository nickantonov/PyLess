import { useState, useEffect } from 'react'
import { useStore } from '../store'
import { MONACO_THEMES } from '../types'
import Profile from './Profile'
import AdminDashboard from './AdminDashboard'
import ChatPanel from './ChatPanel'

export default function Header() {
  const { theme, setTheme, editorTheme, setEditorTheme, toggleSidebar, toggleAi, tasks, profile, setProfile, token, user, logout } = useStore()
  const [showProfile, setShowProfile] = useState(false)
  const [showAdmin, setShowAdmin] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const completed = tasks.filter((t) => t.status === 'completed').length

  const isAdmin = user?.role === 'admin' || user?.role === 'mentor'

  return (
    <header className="glass flex items-center gap-4 px-5 py-3 relative z-20" style={{ borderBottom: '1px solid var(--border)' }}>
      <button onClick={toggleSidebar} className="btn-ghost !p-2 !rounded-lg">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>

      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-lg" style={{ background: 'var(--gradient-1)' }}>🐍</div>
        <span className="font-bold text-lg tracking-tight text-gradient">PyLess</span>
      </div>

      <div className="flex-1" />

      {profile && (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl glass-surface">
            <span className="text-sm">{profile.level.icon}</span>
            <span className="text-xs font-semibold" style={{ color: 'var(--accent-light)' }}>Lv.{profile.level.level}</span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{profile.level.xp} XP</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-1.5 rounded-xl glass-surface">
            <span className="text-xs">🔥</span>
            <span className="text-xs font-semibold">{profile.streak.current}</span>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl glass-surface">
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{completed}/{tasks.length}</span>
      </div>

      <select
        value={editorTheme}
        onChange={(e) => setEditorTheme(e.target.value)}
        className="text-xs px-3 py-1.5 rounded-xl glass-surface border-none outline-none cursor-pointer"
        style={{ color: 'var(--text-primary)' }}
      >
        {MONACO_THEMES.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>

      <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="btn-ghost !p-2 !rounded-xl">
        {theme === 'dark' ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
        )}
      </button>

      <button onClick={toggleAi} className="btn-primary !py-2 !px-4 !text-xs !rounded-xl flex items-center gap-1.5">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 14a2 2 0 1 1 2-2 2 2 0 0 1-2 2z"/></svg>
        AI
      </button>

      {isAdmin && (
        <button onClick={() => setShowAdmin(true)} className="btn-ghost !py-2 !px-3 !text-xs !rounded-xl flex items-center gap-1.5" style={{ borderColor: 'var(--accent)', color: 'var(--accent-light)' }}>
          👑 {user?.role === 'admin' ? 'Адмін' : 'Ментор'}
        </button>
      )}

      {token && (
        <button onClick={() => setShowChat(true)} className="btn-ghost !py-2 !px-3 !text-xs !rounded-xl flex items-center gap-1.5">
          💬 Чат
        </button>
      )}

      <div className="relative">
        <button onClick={() => setShowProfile(!showProfile)} className="btn-ghost !p-2 !rounded-xl overflow-hidden">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          )}
        </button>
        {showProfile && (
          <div className="absolute right-0 top-full mt-3 w-96 card !p-0 animate-scale-in z-50" style={{ maxHeight: '80vh' }}>
            <Profile onClose={() => setShowProfile(false)} />
          </div>
        )}
      </div>

      {showAdmin && <AdminDashboard onClose={() => setShowAdmin(false)} />}
      {showChat && <ChatPanel onClose={() => setShowChat(false)} />}
    </header>
  )
}
