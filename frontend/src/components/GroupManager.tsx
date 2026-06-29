import { useState, useEffect, useCallback } from 'react'
import { useStore } from '../store'

const API = ''

export default function GroupManager({ onClose }: { onClose: () => void }) {
  const { token, user } = useStore()
  const [groups, setGroups] = useState<any[]>([])
  const [selectedGroup, setSelectedGroup] = useState<any>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [groupDesc, setGroupDesc] = useState('')
  const [addEmail, setAddEmail] = useState('')
  const [addRole, setAddRole] = useState('student')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  const isTeacher = user?.role === 'admin' || user?.role === 'teacher'
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}

  const loadGroups = useCallback(() => {
    fetch(`${API}/api/groups/`, { headers }).then(r => r.json()).then(setGroups).catch(() => {})
  }, [token])

  useEffect(() => { loadGroups() }, [])

  const createGroup = async () => {
    if (!groupName.trim()) return
    setLoading(true)
    const resp = await fetch(`${API}/api/groups/`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: groupName, description: groupDesc }),
    })
    const data = await resp.json()
    setLoading(false)
    if (data.ok) {
      setGroupName('')
      setGroupDesc('')
      setShowCreate(false)
      loadGroups()
    }
  }

  const addMember = async (groupId: number) => {
    if (!addEmail.trim()) return
    const resp = await fetch(`${API}/api/groups/${groupId}/members`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: addEmail, role: addRole }),
    })
    const data = await resp.json()
    if (data.ok) {
      setAddEmail('')
      setMsg('✅ Додано!')
      loadGroups()
      setTimeout(() => setMsg(''), 2000)
    } else {
      setMsg(`❌ ${data.detail || 'Помилка'}`)
      setTimeout(() => setMsg(''), 2000)
    }
  }

  const removeMember = async (groupId: number, userId: number) => {
    await fetch(`${API}/api/groups/${groupId}/members/${userId}`, { method: 'DELETE', headers })
    loadGroups()
  }

  const deleteGroup = async (groupId: number) => {
    await fetch(`${API}/api/groups/${groupId}`, { method: 'DELETE', headers })
    setSelectedGroup(null)
    loadGroups()
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-3xl max-h-[85vh] glass rounded-2xl overflow-hidden flex flex-col" style={{ border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm" style={{ background: 'var(--gradient-3)' }}>👥</div>
            <h2 className="text-lg font-bold">{selectedGroup ? selectedGroup.name : 'Групи'}</h2>
          </div>
          <div className="flex gap-2">
            {isTeacher && !selectedGroup && (
              <button onClick={() => setShowCreate(!showCreate)} className="btn-primary !text-xs !py-2 !px-4 !rounded-xl">
                + Створити групу
              </button>
            )}
            <button onClick={() => selectedGroup ? setSelectedGroup(null) : onClose()} className="btn-ghost !p-2 !rounded-lg">
              {selectedGroup ? '← Назад' : '✕'}
            </button>
          </div>
        </div>

        {showCreate && (
          <div className="p-4" style={{ borderBottom: '1px solid var(--border)', background: 'rgba(139,92,246,0.05)' }}>
            <input value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="Назва групи"
              className="w-full px-3 py-2 rounded-xl text-xs mb-2" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
            <textarea value={groupDesc} onChange={e => setGroupDesc(e.target.value)} placeholder="Опис (необов'язково)" rows={2}
              className="w-full px-3 py-2 rounded-xl text-xs mb-2 resize-none" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
            <button onClick={createGroup} disabled={loading || !groupName.trim()} className="btn-primary !text-xs !py-2 !px-4 !rounded-xl">
              {loading ? 'Створення...' : 'Створити'}
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {!selectedGroup && groups.map(g => (
            <div key={g.id} className="p-4 rounded-xl glass-surface flex items-center gap-4 cursor-pointer hover:border-[var(--accent)] border border-transparent transition-all"
              onClick={() => setSelectedGroup(g)}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ background: 'var(--gradient-3)' }}>
                👥
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold">{g.name}</div>
                <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  {g.creator_name} • {g.members?.length || 0} учасників
                </div>
              </div>
              <span className="text-xs px-2 py-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>
                {g.members?.filter((m: any) => m.role === 'teacher').length || 0} викл. / {g.members?.filter((m: any) => m.role === 'student').length || 0} учнів
              </span>
            </div>
          ))}

          {selectedGroup && (
            <div className="space-y-4">
              {selectedGroup.description && (
                <div className="p-3 rounded-xl text-xs" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
                  {selectedGroup.description}
                </div>
              )}

              {isTeacher && (
                <div className="p-4 rounded-xl glass-surface">
                  <div className="text-[10px] font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>Додати учасника</div>
                  <div className="flex gap-2">
                    <input value={addEmail} onChange={e => setAddEmail(e.target.value)} placeholder="Email"
                      className="flex-1 px-3 py-2 rounded-xl text-xs" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
                    <select value={addRole} onChange={e => setAddRole(e.target.value)}
                      className="px-3 py-2 rounded-xl text-xs" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                      <option value="student">Учень</option>
                      <option value="teacher">Викладач</option>
                    </select>
                    <button onClick={() => addMember(selectedGroup.id)} className="btn-primary !text-xs !py-2 !px-4 !rounded-xl">
                      Додати
                    </button>
                  </div>
                  {msg && <div className="text-[10px] mt-1">{msg}</div>}
                </div>
              )}

              <div>
                <div className="text-[10px] font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>
                  Учасники ({selectedGroup.members?.length || 0})
                </div>
                <div className="space-y-1">
                  {selectedGroup.members?.map((m: any) => (
                    <div key={m.user_id} className="flex items-center gap-3 p-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs" style={{ background: m.role === 'teacher' ? 'var(--gradient-1)' : 'var(--bg-surface)' }}>
                        {m.display_name?.[0] || m.username[0]}
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-medium">{m.display_name || m.username}</div>
                        <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{m.email}</div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-lg" style={{
                        background: m.role === 'teacher' ? 'rgba(139,92,246,0.2)' : 'rgba(34,197,94,0.2)',
                        color: m.role === 'teacher' ? 'var(--accent-light)' : 'var(--success)',
                      }}>
                        {m.role === 'teacher' ? 'Викладач' : 'Учень'}
                      </span>
                      {isTeacher && m.user_id !== user?.id && (
                        <button onClick={() => removeMember(selectedGroup.id, m.user_id)}
                          className="text-[10px] px-2 py-1 rounded-lg" style={{ color: 'var(--error)' }}>✕</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {isTeacher && (
                <button onClick={() => deleteGroup(selectedGroup.id)} className="text-xs px-3 py-1.5 rounded-lg" style={{ color: 'var(--error)' }}>
                  Видалити групу
                </button>
              )}
            </div>
          )}

          {groups.length === 0 && !showCreate && (
            <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
              <div className="text-4xl mb-3">👥</div>
              <div className="text-sm">Поки немає груп</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
