// Copyright (c) 1998-2026 Nick Antonov (nick.antonov1@gmail.com) / Borodachamba Studio. All rights reserved.
import { useEffect, useState } from 'react'
import { useStore } from '../store'

export default function Profile({ onClose }: { onClose?: () => void }) {
  const { profile, setProfile, leaderboard, setLeaderboard, dailyChallenge, setDailyChallenge, token, user, logout } = useStore()
  const [inviteCode, setInviteCode] = useState('')
  const [joinMsg, setJoinMsg] = useState('')
  const [lbPeriod, setLbPeriod] = useState('all')
  const [lbModule, setLbModule] = useState('')

  useEffect(() => {
    const params = new URLSearchParams()
    if (lbPeriod !== 'all') params.set('period', lbPeriod)
    if (lbModule) params.set('module', lbModule)
    const qs = params.toString()
    fetch(`/api/tasks/leaderboard/top${qs ? '?' + qs : ''}`).then((r) => r.json()).then(setLeaderboard).catch(() => {})
    fetch('/api/tasks/daily/challenge').then((r) => r.json()).then(setDailyChallenge).catch(() => {})
  }, [lbPeriod, lbModule])

  const handleLogout = () => {
    logout()
    onClose?.()
  }

  const handleLogin = () => {
    useStore.setState({ view: 'auth' })
    onClose?.()
  }

  if (!profile) {
    return (
      <div className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>
        <div className="text-3xl mb-2">👤</div>
        <div className="text-sm">Завантаження...</div>
      </div>
    )
  }

  const { level, streak, combo, badges, total_completed, total_tasks } = profile
  const progressPct = level.xp_for_next > 0 ? (level.xp_in_level / level.xp_for_next) * 100 : 100

  return (
    <div className="p-4 space-y-4 overflow-y-auto" style={{ maxHeight: '70vh' }}>
      <div className="flex items-center gap-3">
        {profile.avatar_url ? (
          <img src={profile.avatar_url} alt="" className="w-12 h-12 rounded-xl object-cover" />
        ) : (
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl" style={{ background: 'var(--gradient-1)' }}>
            {profile.display_name?.[0]?.toUpperCase() || '👤'}
          </div>
        )}
        <div className="flex-1">
          <div className="text-sm font-bold">{profile.display_name}</div>
          <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            {user ? `@${user.username}` : 'Гість'}
          </div>
        </div>
        {!token && (
          <button onClick={handleLogin} className="btn-primary !text-xs !py-1.5 !px-3 !rounded-lg">
            Увійти
          </button>
        )}
        {token && (
          <button onClick={handleLogout} className="btn-ghost !text-xs !py-1.5 !px-3 !rounded-lg" style={{ color: 'var(--error)', borderColor: 'rgba(239,68,68,0.3)' }}>
            Вийти
          </button>
        )}
      </div>

      {token && !user?.mentor_id && (
        <div className="p-3 rounded-xl" style={{ background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
          <div className="text-[11px] font-semibold mb-2" style={{ color: 'var(--accent-light)' }}>🔗 Приєднатися до ментора</div>
          {joinMsg ? (
            <div className="text-[11px] font-medium" style={{ color: 'var(--success)' }}>{joinMsg}</div>
          ) : (
            <div className="flex gap-2">
              <input value={inviteCode} onChange={e => setInviteCode(e.target.value.toUpperCase())}
                placeholder="Код запрошення"
                className="flex-1 !text-[11px] !py-1.5 !px-2"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '8px' }}
                maxLength={8} />
              <button onClick={async () => {
                if (!inviteCode) return
                const resp = await fetch(`/api/auth/join?code=${inviteCode}`, {
                  method: 'POST',
                  headers: { 'Authorization': `Bearer ${token}` },
                })
                const data = await resp.json()
                if (data.ok) {
                  setJoinMsg('✅ Ви приєднались до ментора!')
                  useStore.setState({ user: data.user })
                } else {
                  setJoinMsg(`❌ ${data.detail || 'Невірний код'}`)
                }
              }} className="btn-primary !text-[11px] !py-1.5 !px-3 !rounded-lg">
                Приєднатися
              </button>
            </div>
          )}
        </div>
      )}

      <div className="text-center">
        <div className="text-4xl mb-1 animate-float">{level.icon}</div>
        <div className="text-base font-bold text-gradient">Level {level.level}</div>
        <div className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{level.name}</div>
        <div className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>{level.xp} / {level.next_level_xp} XP</div>
        <div className="w-full h-2 rounded-full mt-2 overflow-hidden" style={{ background: 'var(--bg-surface)' }}>
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${progressPct}%`, background: 'var(--gradient-1)' }} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { icon: '🔥', value: streak.current, label: 'Streak', color: 'var(--warning)' },
          { icon: '⚡', value: combo.current, label: 'Combo', color: 'var(--accent-light)' },
          { icon: '🏆', value: `${total_completed}/${total_tasks}`, label: 'Завдань', color: 'var(--success)' },
        ].map((stat) => (
          <div key={stat.label} className="text-center p-2.5 rounded-xl glass-surface">
            <div className="text-lg mb-0.5">{stat.icon}</div>
            <div className="text-sm font-bold" style={{ color: stat.color }}>{stat.value}</div>
            <div className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {dailyChallenge?.task && (
        <div className="p-3 rounded-xl glow-accent" style={{ background: 'rgba(139, 92, 246, 0.08)', border: '1px solid var(--accent)' }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold" style={{ color: 'var(--accent-light)' }}>📋 Щоденний виклик</span>
            <span className="badge badge-xp">+{dailyChallenge.bonus_xp} XP</span>
          </div>
          <div className="text-sm font-medium">{dailyChallenge.task.title}</div>
        </div>
      )}

      <div>
        <h3 className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>🏅 Бейджі ({badges.length})</h3>
        <div className="grid grid-cols-2 gap-1.5">
          {badges.map((b: any) => {
            const rarityColors: Record<string, string> = {
              common: '#94a3b8', uncommon: '#22c55e', rare: '#3b82f6',
              epic: '#a855f7', legendary: '#f59e0b',
            }
            const color = rarityColors[b.rarity] || '#94a3b8'
            return (
              <div key={b.id} className="p-2 rounded-xl glass-surface text-center" style={{ borderColor: `${color}33` }}>
                <div className="text-lg mb-0.5">{b.name.split(' ')[0]}</div>
                <div className="text-[9px] font-medium" style={{ color: 'var(--text-primary)' }}>{b.name.split(' ').slice(1).join(' ')}</div>
                <div className="text-[8px] mt-0.5 font-bold uppercase" style={{ color }}>{b.rarity}</div>
              </div>
            )
          })}
          {badges.length === 0 && (
            <div className="col-span-2 text-center py-3 text-[11px]" style={{ color: 'var(--text-muted)' }}>
              Виконуй завдання щоб отримати бейджі
            </div>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>🏆 Рейтинг</h3>
        <div className="flex gap-1 mb-2">
          {['all', 'day', 'week'].map(p => (
            <button key={p} onClick={() => setLbPeriod(p)}
              className="px-2 py-0.5 rounded-md text-[10px] font-medium transition-all"
              style={{
                background: lbPeriod === p ? 'var(--accent)' : 'var(--bg-surface)',
                color: lbPeriod === p ? '#fff' : 'var(--text-muted)',
              }}>
              {p === 'all' ? 'Все' : p === 'day' ? 'День' : 'Тиждень'}
            </button>
          ))}
        </div>
        <div className="space-y-1">
          {leaderboard.slice(0, 5).map((entry: any) => (
            <div key={entry.rank} className="flex items-center gap-2 p-2 rounded-xl glass-surface text-xs">
              <span className="w-5 text-center font-bold text-sm">
                {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}
              </span>
              <span className="flex-1 truncate font-medium">{entry.display_name}</span>
              <span className="font-semibold" style={{ color: 'var(--accent-light)' }}>{entry.total_xp} XP</span>
            </div>
          ))}
          {leaderboard.length === 0 && (
            <div className="text-center py-3 text-[11px]" style={{ color: 'var(--text-muted)' }}>
              Поки порожньо
            </div>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>📊 Статистика</h3>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { label: 'Стрибок', value: streak.best, icon: '🔥' },
            { label: 'Комбо', value: combo.best, icon: '⚡' },
            { label: 'Рівень', value: level.level, icon: level.icon },
            { label: 'XP', value: level.xp, icon: '💎' },
          ].map(s => (
            <div key={s.label} className="p-2 rounded-xl glass-surface flex items-center gap-2">
              <span className="text-sm">{s.icon}</span>
              <div>
                <div className="text-[10px] font-bold" style={{ color: 'var(--text-primary)' }}>{s.value}</div>
                <div className="text-[8px]" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {token && (
        <div className="pt-2" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="text-[10px] text-center" style={{ color: 'var(--text-muted)' }}>
            {profile.display_name} • {user?.email}
          </div>
        </div>
      )}
    </div>
  )
}
