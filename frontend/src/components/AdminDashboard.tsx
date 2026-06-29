// Copyright (c) 1998-2026 Nick Antonov (nick.antonov1@gmail.com) / Borodachamba Studio. All rights reserved.
import { useState, useEffect, useCallback } from 'react'
import { useStore } from '../store'

const API = ''

export default function AdminDashboard({ onClose }: { onClose: () => void }) {
  const { token, user } = useStore()
  const [tab, setTab] = useState<'overview' | 'students' | 'invites' | 'tasks' | 'settings' | 'student-detail'>('overview')
  const [stats, setStats] = useState<any>(null)
  const [students, setStudents] = useState<any[]>([])
  const [invites, setInvites] = useState<any[]>([])
  const [customTasks, setCustomTasks] = useState<any[]>([])
  const [selectedStudent, setSelectedStudent] = useState<any>(null)
  const [noteText, setNoteText] = useState('')
  const [newInviteUses, setNewInviteUses] = useState(50)
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [newTask, setNewTask] = useState({ title: '', description: '', starter_code: '', hints: '', tests_input: '', tests_expected: '', difficulty: 'medium', language: 'python' })
  const [assignMode, setAssignMode] = useState<'all' | 'specific'>('all')
  const [assignStudents, setAssignStudents] = useState<number[]>([])
  const [taskMsg, setTaskMsg] = useState('')
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [settingsMsg, setSettingsMsg] = useState('')

  const headers: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {}

  const loadStats = useCallback(() => {
    fetch(`${API}/api/admin/stats`, { headers }).then(r => r.json()).then(setStats).catch(() => {})
  }, [token])

  const loadStudents = useCallback(() => {
    fetch(`${API}/api/admin/students`, { headers }).then(r => r.json()).then(setStudents).catch(() => {})
  }, [token])

  const loadInvites = useCallback(() => {
    fetch(`${API}/api/admin/invites`, { headers }).then(r => r.json()).then(setInvites).catch(() => {})
  }, [token])

  const loadSettings = useCallback(() => {
    fetch(`${API}/api/settings/`, { headers }).then(r => r.json()).then((data: any[]) => {
      const map: Record<string, string> = {}
      data.forEach((s: any) => { map[s.key] = s.value })
      setSettings(map)
    }).catch(() => {})
  }, [token])

  const loadCustomTasks = useCallback(() => {
    fetch(`${API}/api/tasks/custom`, { headers }).then(r => r.json()).then(setCustomTasks).catch(() => {})
  }, [token])

  useEffect(() => {
    if (tab === 'overview') loadStats()
    if (tab === 'students') loadStudents()
    if (tab === 'invites') loadInvites()
    if (tab === 'settings') loadSettings()
    if (tab === 'tasks') loadCustomTasks()
  }, [tab, loadStats, loadStudents, loadInvites, loadSettings, loadCustomTasks])

  const createTask = async () => {
    if (!newTask.title.trim()) return
    const tests = []
    if (newTask.tests_input && newTask.tests_expected) {
      tests.push({ input: newTask.tests_input, expected: newTask.tests_expected })
    }
    const resp = await fetch(`${API}/api/tasks/custom`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newTask.title,
        description: newTask.description,
        starter_code: newTask.starter_code,
        hints: newTask.hints ? newTask.hints.split('\n').filter(Boolean) : [],
        tests,
        difficulty: newTask.difficulty,
        language: newTask.language,
        assign_to: assignMode === 'all' ? ['all'] : assignStudents.map(String),
      }),
    })
    const data = await resp.json()
    if (data.ok) {
      setTaskMsg('✅ Завдання створено!')
      setNewTask({ title: '', description: '', starter_code: '', hints: '', tests_input: '', tests_expected: '', difficulty: 'medium', language: 'python' })
      setAssignMode('all')
      setAssignStudents([])
      loadCustomTasks()
      setTimeout(() => setTaskMsg(''), 2000)
    }
  }

  const deleteTask = async (id: number) => {
    await fetch(`${API}/api/tasks/custom/${id}`, { method: 'DELETE', headers })
    loadCustomTasks()
  }

  const loadStudentDetail = async (id: number) => {
    const resp = await fetch(`${API}/api/admin/student/${id}`, { headers })
    const data = await resp.json()
    setSelectedStudent(data)
    setTab('student-detail')
  }

  const createInvite = async () => {
    await fetch(`${API}/api/admin/invite?max_uses=${newInviteUses}`, { method: 'POST', headers })
    loadInvites()
  }

  const revokeInvite = async (code: string) => {
    await fetch(`${API}/api/admin/invite/${code}`, { method: 'DELETE', headers })
    loadInvites()
  }

  const addNote = async () => {
    if (!noteText.trim() || !selectedStudent) return
    await fetch(`${API}/api/admin/note/${selectedStudent.id}?text=${encodeURIComponent(noteText)}`, { method: 'POST', headers })
    setNoteText('')
    loadStudentDetail(selectedStudent.id)
  }

  const promoteUser = async (userId: number, role: string) => {
    await fetch(`${API}/api/auth/promote/${userId}?role=${role}`, { method: 'POST', headers })
    loadStudents()
  }

  const saveSettings = async () => {
    setSettingsSaving(true)
    setSettingsMsg('')
    try {
      const resp = await fetch(`${API}/api/settings/`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (resp.ok) {
        setSettingsMsg('✅ Збережено!')
        setTimeout(() => setSettingsMsg(''), 2000)
      } else {
        setSettingsMsg('❌ Помилка збереження')
      }
    } catch {
      setSettingsMsg('❌ Помилка з\'єднання')
    }
    setSettingsSaving(false)
  }

  const isAdmin = user?.role === 'admin'

  const card = (children: React.ReactNode) => (
    <div className="p-4 rounded-xl glass-surface">{children}</div>
  )

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', zIndex: 9999 }}>
      <div className="w-full max-w-5xl max-h-[90vh] glass rounded-2xl overflow-hidden flex flex-col" style={{ border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm" style={{ background: 'var(--gradient-1)' }}>👑</div>
            <h2 className="text-lg font-bold">{isAdmin ? 'Адмін' : 'Ментор'} Панель</h2>
          </div>
          <button onClick={onClose} className="btn-ghost !p-2 !rounded-lg">✕</button>
        </div>

        <div className="flex gap-1 px-4 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
          {[
            { id: 'overview', label: '📊 Огляд' },
            { id: 'students', label: '👥 Учні' },
            { id: 'invites', label: '🔗 Запрошення' },
            { id: 'tasks', label: '📝 Завдання' },
            ...(isAdmin ? [{ id: 'settings', label: '⚙️ Налаштування' }] : []),
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              className="px-4 py-2 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: tab === t.id ? 'var(--accent)' : 'transparent',
                color: tab === t.id ? '#fff' : 'var(--text-secondary)',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {tab === 'overview' && stats && (
            <>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { icon: '👥', value: stats.total_students, label: 'Учнів', color: 'var(--accent-light)' },
                  { icon: '✅', value: stats.total_tasks_completed, label: 'Завдань виконано', color: 'var(--success)' },
                  { icon: '🔥', value: stats.active_today, label: 'Активні сьогодні', color: 'var(--warning)' },
                  { icon: '🔗', value: stats.total_invite_codes, label: 'Запрошень', color: 'var(--accent)' },
                ].map(s => (
                  <div key={s.label} className="text-center p-4 rounded-xl glass-surface">
                    <div className="text-2xl mb-1">{s.icon}</div>
                    <div className="text-xl font-bold" style={{ color: s.color }}>{s.value}</div>
                    <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
                  </div>
                ))}
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Останні учні</h3>
                <div className="space-y-2">
                  {students.slice(0, 5).map(s => (
                    <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl glass-surface cursor-pointer hover:border-[var(--accent)] border border-transparent transition-all"
                      onClick={() => loadStudentDetail(s.id)}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs" style={{ background: 'var(--bg-surface)' }}>
                        {s.avatar_url ? <img src={s.avatar_url} className="w-full h-full rounded-full object-cover" alt="" /> : s.display_name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold truncate">{s.display_name}</div>
                        <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>@{s.username}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold" style={{ color: 'var(--accent-light)' }}>{s.level.icon} Lv.{s.level.level}</div>
                        <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{s.total_completed} завдань</div>
                      </div>
                    </div>
                  ))}
                  {students.length === 0 && (
                    <div className="text-center py-8 text-xs" style={{ color: 'var(--text-muted)' }}>
                      Поки немає учнів. Створіть запрошення щоб додати.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {tab === 'students' && (
            <>
              {students.length === 0 && (
                <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
                  <div className="text-4xl mb-3">👥</div>
                  <div className="text-sm font-medium mb-1">Немає учнів</div>
                  <div className="text-xs">Створіть запрошення вкладці "Запрошення"</div>
                </div>
              )}
              <div className="space-y-2">
                {students.map(s => (
                  <div key={s.id} className="flex items-center gap-4 p-4 rounded-xl glass-surface cursor-pointer hover:border-[var(--accent)] border border-transparent transition-all"
                    onClick={() => loadStudentDetail(s.id)}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm" style={{ background: 'var(--gradient-1)' }}>
                      {s.avatar_url ? <img src={s.avatar_url} className="w-full h-full rounded-xl object-cover" alt="" /> : s.display_name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold">{s.display_name}</div>
                      <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>@{s.username} • {s.email}</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="text-xs font-bold" style={{ color: 'var(--accent-light)' }}>{s.level.icon} Lv.{s.level.level}</div>
                        <div className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{s.level.xp} XP</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs font-bold" style={{ color: 'var(--success)' }}>{s.total_completed}/{s.total_attempted}</div>
                        <div className="text-[9px]" style={{ color: 'var(--text-muted)' }}>виконано</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs font-bold" style={{ color: 'var(--warning)' }}>🔥 {s.streak.current}</div>
                        <div className="text-[9px]" style={{ color: 'var(--text-muted)' }}>streak</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs font-bold" style={{ color: 'var(--accent)' }}>🏅 {s.badges_count}</div>
                        <div className="text-[9px]" style={{ color: 'var(--text-muted)' }}>бейджі</div>
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                        <button onClick={() => promoteUser(s.id, 'mentor')}
                          className="text-[9px] px-2 py-1 rounded-lg glass-surface hover:border-[var(--accent)] border border-transparent">
                          → Ментор
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {tab === 'invites' && (
            <>
              <div className="flex items-center gap-3 mb-4">
                <input type="number" value={newInviteUses} onChange={e => setNewInviteUses(Number(e.target.value))}
                  className="px-3 py-2 rounded-xl text-xs w-24" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  min={1} max={500} placeholder="Ліміт" />
                <button onClick={createInvite} className="btn-primary !text-xs !py-2 !px-4 !rounded-xl">
                  + Створити запрошення
                </button>
              </div>

              <div className="space-y-2">
                {invites.map(inv => (
                  <div key={inv.code} className="flex items-center gap-4 p-4 rounded-xl glass-surface">
                    <div className="font-mono text-lg font-bold tracking-wider" style={{ color: 'var(--accent-light)' }}>
                      {inv.code}
                    </div>
                    <div className="flex-1">
                      <div className="text-xs">{inv.uses}/{inv.max_uses} використано</div>
                      <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        Створено: {new Date(inv.created_at).toLocaleDateString('uk-UA')}
                        {inv.expires_at && ` • Діє до: ${new Date(inv.expires_at).toLocaleDateString('uk-UA')}`}
                      </div>
                    </div>
                    <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-surface)' }}>
                      <div className="h-full rounded-full" style={{
                        width: `${(inv.uses / inv.max_uses) * 100}%`,
                        background: inv.uses >= inv.max_uses ? 'var(--error)' : 'var(--success)',
                      }} />
                    </div>
                    <button onClick={() => revokeInvite(inv.code)}
                      className="text-[10px] px-2 py-1 rounded-lg hover:bg-red-500/20" style={{ color: 'var(--error)' }}>
                      Відкликати
                    </button>
                  </div>
                ))}
                {invites.length === 0 && (
                  <div className="text-center py-8 text-xs" style={{ color: 'var(--text-muted)' }}>
                    Ще немає запрошень
                  </div>
                )}
              </div>

              <div className="mt-6 p-4 rounded-xl glass-surface">
                <div className="text-xs font-semibold mb-2" style={{ color: 'var(--accent-light)' }}>💡 Як це працює</div>
                <div className="text-[11px] space-y-1" style={{ color: 'var(--text-secondary)' }}>
                  <p>1. Створіть запрошення з лімітом використань</p>
                  <p>2. Надайте код учню: "При вході натисни 'Приєднатися до ментора' і введи код"</p>
                  <p>3. Учень стає вашим підопічним і з'являється у вашому кабінеті</p>
                </div>
              </div>
            </>
          )}

          {tab === 'tasks' && (
            <>
              <div className="max-w-2xl space-y-4">
                <div className="p-4 rounded-xl glass-surface">
                  <h3 className="text-sm font-bold mb-3">📝 Створити завдання</h3>
                  <div className="space-y-3">
                    <input value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                      placeholder="Назва завдання" className="w-full px-3 py-2 rounded-xl text-xs"
                      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
                    <textarea value={newTask.description} onChange={e => setNewTask({ ...newTask, description: e.target.value })}
                      placeholder="Опис (що потрібно зробити)" rows={2} className="w-full px-3 py-2 rounded-xl text-xs resize-none"
                      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
                    <textarea value={newTask.starter_code} onChange={e => setNewTask({ ...newTask, starter_code: e.target.value })}
                      placeholder="Початковий код" rows={4} className="w-full px-3 py-2 rounded-xl text-xs font-mono resize-none"
                      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
                    <textarea value={newTask.hints} onChange={e => setNewTask({ ...newTask, hints: e.target.value })}
                      placeholder="Підказки (кожна з нового рядка)" rows={2} className="w-full px-3 py-2 rounded-xl text-xs resize-none"
                      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
                    <div className="grid grid-cols-2 gap-2">
                      <input value={newTask.tests_input} onChange={e => setNewTask({ ...newTask, tests_input: e.target.value })}
                        placeholder="Вхідні дані тесту" className="px-3 py-2 rounded-xl text-xs"
                        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
                      <input value={newTask.tests_expected} onChange={e => setNewTask({ ...newTask, tests_expected: e.target.value })}
                        placeholder="Очікуваний вивід" className="px-3 py-2 rounded-xl text-xs"
                        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
                    </div>
                    <div className="flex gap-2">
                      <select value={newTask.difficulty} onChange={e => setNewTask({ ...newTask, difficulty: e.target.value })}
                        className="px-3 py-2 rounded-xl text-xs" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                        <option value="easy">Легке</option>
                        <option value="medium">Середнє</option>
                        <option value="hard">Складне</option>
                      </select>
                      <select value={newTask.language} onChange={e => setNewTask({ ...newTask, language: e.target.value })}
                        className="px-3 py-2 rounded-xl text-xs" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                        <option value="python">Python</option>
                        <option value="html">HTML</option>
                        <option value="css">CSS</option>
                        <option value="javascript">JavaScript</option>
                      </select>
                    </div>

                    <div className="p-3 rounded-xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                      <div className="text-[10px] font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>Призначити:</div>
                      <div className="flex gap-2 mb-2">
                        <button onClick={() => setAssignMode('all')}
                          className="px-3 py-1 rounded-lg text-[10px] font-medium"
                          style={{ background: assignMode === 'all' ? 'var(--accent)' : 'var(--bg-panel)', color: assignMode === 'all' ? '#fff' : 'var(--text-muted)' }}>
                          Всім учням
                        </button>
                        <button onClick={() => setAssignMode('specific')}
                          className="px-3 py-1 rounded-lg text-[10px] font-medium"
                          style={{ background: assignMode === 'specific' ? 'var(--accent)' : 'var(--bg-panel)', color: assignMode === 'specific' ? '#fff' : 'var(--text-muted)' }}>
                          Конкретним
                        </button>
                      </div>
                      {assignMode === 'specific' && (
                        <div className="max-h-32 overflow-y-auto space-y-1">
                          {students.map(s => (
                            <label key={s.id} className="flex items-center gap-2 text-[10px] cursor-pointer">
                              <input type="checkbox" checked={assignStudents.includes(s.id)}
                                onChange={e => setAssignStudents(prev => e.target.checked ? [...prev, s.id] : prev.filter(id => id !== s.id))} />
                              {s.display_name || s.username}
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button onClick={createTask} className="btn-primary !text-xs !py-2 !px-4 !rounded-xl">
                        Створити завдання
                      </button>
                      {taskMsg && <span className="text-xs" style={{ color: taskMsg.startsWith('✅') ? 'var(--success)' : 'var(--error)' }}>{taskMsg}</span>}
                    </div>
                  </div>
                </div>

                {customTasks.length > 0 && (
                  <div className="p-4 rounded-xl glass-surface">
                    <h3 className="text-sm font-bold mb-3">📋 Створені завдання ({customTasks.length})</h3>
                    <div className="space-y-2">
                      {customTasks.map(t => (
                        <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)' }}>
                          <span className={`badge badge-${t.difficulty}`}>{t.difficulty}</span>
                          <div className="flex-1">
                            <div className="text-xs font-semibold">{t.title}</div>
                            <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                              {t.assignments?.some((a: any) => a.all_students) ? 'Всім учням' : `${t.assignments?.length || 0} учням`}
                            </div>
                          </div>
                          <button onClick={() => deleteTask(t.db_id)} className="text-[10px] px-2 py-1 rounded-lg" style={{ color: 'var(--error)' }}>
                            Видалити
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {tab === 'settings' && isAdmin && (
            <>
              <div className="max-w-lg space-y-4">
                <div className="p-4 rounded-xl glass-surface">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm" style={{ background: 'var(--gradient-1)' }}>🤖</div>
                    <div>
                      <div className="text-sm font-semibold">Groq AI API</div>
                      <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Ключ для AI-тутора (llama-3.3-70b-versatile)</div>
                    </div>
                  </div>
                  <input
                    type="password"
                    value={settings.groq_api_key || ''}
                    onChange={e => setSettings({ ...settings, groq_api_key: e.target.value })}
                    placeholder="gsk_..."
                    className="w-full px-3 py-2 rounded-xl text-xs font-mono"
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  />
                  <div className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                    Отримати: <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-light)' }}>console.groq.com/keys</a>
                  </div>
                </div>

                <div className="p-4 rounded-xl glass-surface">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm" style={{ background: 'var(--gradient-2)' }}>🌐</div>
                    <div>
                      <div className="text-sm font-semibold">Назва сайту</div>
                      <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Відображається в заголовку</div>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={settings.site_name || ''}
                    onChange={e => setSettings({ ...settings, site_name: e.target.value })}
                    placeholder="PyLess"
                    className="w-full px-3 py-2 rounded-xl text-xs"
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>

                <div className="p-4 rounded-xl glass-surface">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm" style={{ background: 'var(--gradient-2)' }}>📝</div>
                    <div>
                      <div className="text-sm font-semibold">Опис сайту</div>
                      <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>META description</div>
                    </div>
                  </div>
                  <textarea
                    value={settings.site_description || ''}
                    onChange={e => setSettings({ ...settings, site_description: e.target.value })}
                    placeholder="Interactive Python learning platform"
                    rows={2}
                    className="w-full px-3 py-2 rounded-xl text-xs resize-none"
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>

                <div className="p-4 rounded-xl glass-surface">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm" style={{ background: 'linear-gradient(135deg, #4285f4, #34a853)' }}>
                      <span className="text-sm font-bold text-white">G</span>
                    </div>
                    <div>
                      <div className="text-sm font-semibold">Google OAuth</div>
                      <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Вхід через Google акаунт</div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full ml-auto" style={{
                      background: settings.google_client_id ? 'rgba(34,197,94,0.2)' : 'rgba(245,158,11,0.2)',
                      color: settings.google_client_id ? 'var(--success)' : 'var(--warning)',
                    }}>
                      {settings.google_client_id ? '✅ Активний' : '⚠️ Не налаштовано'}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-[10px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Google Client ID</label>
                      <input
                        type="text"
                        value={settings.google_client_id || ''}
                        onChange={e => setSettings({ ...settings, google_client_id: e.target.value })}
                        placeholder="xxx.apps.googleusercontent.com"
                        className="w-full px-3 py-2 rounded-xl text-xs font-mono"
                        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Google Client Secret</label>
                      <input
                        type="password"
                        value={settings.google_client_secret || ''}
                        onChange={e => setSettings({ ...settings, google_client_secret: e.target.value })}
                        placeholder="GOCSPX-..."
                        className="w-full px-3 py-2 rounded-xl text-xs font-mono"
                        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Redirect URI</label>
                      <input
                        type="text"
                        value={settings.google_redirect_uri || ''}
                        onChange={e => setSettings({ ...settings, google_redirect_uri: e.target.value })}
                        placeholder="https://borodachamba.pp.ua/api/auth/google/callback"
                        className="w-full px-3 py-2 rounded-xl text-xs font-mono"
                        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                      />
                    </div>
                    <div className="p-2 rounded-lg text-[10px]" style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>
                      <div style={{ color: 'var(--accent-light)' }}>Інструкція:</div>
                      <ol className="list-decimal list-inside mt-1 space-y-0.5" style={{ color: 'var(--text-secondary)' }}>
                        <li>Перейди на <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" className="underline" style={{ color: 'var(--accent-light)' }}>console.cloud.google.com</a></li>
                        <li>Створи OAuth 2.0 Client ID (Web application)</li>
                        <li>Додай Authorized redirect URI: <code className="px-1 rounded" style={{ background: 'rgba(255,255,255,0.1)' }}>{settings.google_redirect_uri || 'https://borodachamba.pp.ua/api/auth/google/callback'}</code></li>
                        <li>Скопіюй Client ID та Secret сюди</li>
                      </ol>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button onClick={saveSettings} disabled={settingsSaving}
                    className="btn-primary !text-xs !py-2 !px-6 !rounded-xl">
                    {settingsSaving ? '⏳ Збереження...' : '💾 Зберегти'}
                  </button>
                  {settingsMsg && (
                    <span className="text-xs" style={{ color: settingsMsg.startsWith('✅') ? 'var(--success)' : 'var(--error)' }}>
                      {settingsMsg}
                    </span>
                  )}
                </div>
              </div>
            </>
          )}

          {tab === 'student-detail' && selectedStudent && (
            <>
              <button onClick={() => setTab('students')} className="text-xs mb-3" style={{ color: 'var(--accent-light)' }}>
                ← Назад до учнів
              </button>

              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center text-xl" style={{ background: 'var(--gradient-1)' }}>
                  {selectedStudent.avatar_url ? <img src={selectedStudent.avatar_url} className="w-full h-full rounded-xl object-cover" alt="" /> : selectedStudent.display_name[0]}
                </div>
                <div>
                  <div className="text-lg font-bold">{selectedStudent.display_name}</div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>@{selectedStudent.username} • {selectedStudent.email}</div>
                </div>
                <div className="ml-auto flex gap-3">
                  <div className="text-center px-3 py-2 rounded-xl glass-surface">
                    <div className="text-lg font-bold" style={{ color: 'var(--accent-light)' }}>{selectedStudent.level.icon} Lv.{selectedStudent.level.level}</div>
                    <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{selectedStudent.level.xp} XP</div>
                  </div>
                  <div className="text-center px-3 py-2 rounded-xl glass-surface">
                    <div className="text-lg font-bold" style={{ color: 'var(--warning)' }}>🔥 {selectedStudent.streak.current}</div>
                    <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>streak</div>
                  </div>
                  <div className="text-center px-3 py-2 rounded-xl glass-surface">
                    <div className="text-lg font-bold" style={{ color: 'var(--success)' }}>{selectedStudent.total_completed}/{selectedStudent.total_attempted}</div>
                    <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>завдань</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>📝 Прогрес</h3>
                  {selectedStudent.progress?.slice(-10).reverse().map((p: any) => (
                    <div key={p.task_id} className="flex items-center gap-2 p-2 rounded-lg glass-surface text-[11px]">
                      <span style={{ color: p.status === 'completed' ? 'var(--success)' : 'var(--warning)' }}>
                        {p.status === 'completed' ? '✅' : '🔄'}
                      </span>
                      <span className="flex-1 font-mono">{p.task_id}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{p.attempts} спроб</span>
                      {p.first_try ? <span style={{ color: 'var(--accent-light)' }}>⭐</span> : null}
                    </div>
                  ))}
                  {(!selectedStudent.progress || selectedStudent.progress.length === 0) && (
                    <div className="text-xs py-4 text-center" style={{ color: 'var(--text-muted)' }}>Поки немає прогресу</div>
                  )}
                </div>

                <div className="space-y-3">
                  <h3 className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>💬 Нотатки ментора</h3>
                  <div className="flex gap-2">
                    <input value={noteText} onChange={e => setNoteText(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addNote()}
                      placeholder="Додати нотатку..."
                      className="flex-1 !text-xs !py-2" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '10px', padding: '8px 12px' }} />
                    <button onClick={addNote} className="btn-primary !text-xs !py-2 !px-3 !rounded-xl">→</button>
                  </div>
                  <div className="space-y-2">
                    {selectedStudent.notes?.map((n: any, i: number) => (
                      <div key={i} className="p-3 rounded-xl glass-surface text-[11px]">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold" style={{ color: 'var(--accent-light)' }}>{n.mentor}</span>
                          <span style={{ color: 'var(--text-muted)' }}>{new Date(n.date).toLocaleDateString('uk-UA')}</span>
                        </div>
                        <div style={{ color: 'var(--text-secondary)' }}>{n.text}</div>
                      </div>
                    ))}
                    {(!selectedStudent.notes || selectedStudent.notes.length === 0) && (
                      <div className="text-xs py-4 text-center" style={{ color: 'var(--text-muted)' }}>Немає нотаток</div>
                    )}
                  </div>

                  {selectedStudent.xp_history?.length > 0 && (
                    <>
                      <h3 className="text-xs font-semibold mt-4" style={{ color: 'var(--text-muted)' }}>📈 XP за 30 днів</h3>
                      <div className="flex items-end gap-1 h-16">
                        {selectedStudent.xp_history.map((h: any, i: number) => {
                          const max = Math.max(...selectedStudent.xp_history.map((x: any) => x.xp))
                          return (
                            <div key={i} className="flex-1 rounded-t" style={{
                              height: `${max > 0 ? (h.xp / max) * 100 : 0}%`,
                              background: 'var(--gradient-1)',
                              minHeight: '2px',
                            }} title={`${h.day}: ${h.xp} XP`} />
                          )
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
