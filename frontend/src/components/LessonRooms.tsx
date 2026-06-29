import { useState, useEffect } from 'react'
import { useStore } from '../store'
import VideoRoom from './VideoRoom'

const API = ''

export default function LessonRooms({ onClose }: { onClose: () => void }) {
  const { token, user } = useStore()
  const [rooms, setRooms] = useState<any[]>([])
  const [activeRoom, setActiveRoom] = useState<{ code: string; id: number } | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [roomName, setRoomName] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [loading, setLoading] = useState(false)

  const isMentor = user?.role === 'admin' || user?.role === 'mentor'
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}

  const loadRooms = () => {
    fetch(`${API}/api/video/rooms`, { headers })
      .then(r => r.json())
      .then(setRooms)
      .catch(() => {})
  }

  useEffect(() => { loadRooms() }, [])

  const createRoom = async () => {
    if (!roomName.trim()) return
    setLoading(true)
    const resp = await fetch(`${API}/api/video/rooms`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: roomName, scheduled_at: scheduledAt || null }),
    })
    const data = await resp.json()
    setLoading(false)
    if (data.ok) {
      setRoomName('')
      setScheduledAt('')
      setShowCreate(false)
      loadRooms()
    }
  }

  const startRoom = async (id: number) => {
    await fetch(`${API}/api/video/rooms/${id}/start`, { method: 'POST', headers })
    loadRooms()
  }

  const endRoom = async (id: number) => {
    await fetch(`${API}/api/video/rooms/${id}/end`, { method: 'POST', headers })
    loadRooms()
  }

  const deleteRoom = async (id: number) => {
    await fetch(`${API}/api/video/rooms/${id}`, { method: 'DELETE', headers })
    loadRooms()
  }

  const joinRoom = (roomCode: string, roomId: number) => {
    setActiveRoom({ code: roomCode, id: roomId })
  }

  if (activeRoom) {
    return <VideoRoom roomCode={activeRoom.code} roomId={activeRoom.id} onClose={() => { setActiveRoom(null); loadRooms() }} />
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-2xl max-h-[85vh] glass rounded-2xl overflow-hidden flex flex-col" style={{ border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm" style={{ background: 'var(--gradient-2)' }}>🎥</div>
            <h2 className="text-lg font-bold">Відео уроки</h2>
          </div>
          <div className="flex gap-2">
            {isMentor && (
              <button onClick={() => setShowCreate(!showCreate)} className="btn-primary !text-xs !py-2 !px-4 !rounded-xl">
                + Створити кімнату
              </button>
            )}
            <button onClick={onClose} className="btn-ghost !p-2 !rounded-lg">✕</button>
          </div>
        </div>

        {showCreate && (
          <div className="p-4" style={{ borderBottom: '1px solid var(--border)', background: 'rgba(139,92,246,0.05)' }}>
            <div className="flex gap-2 mb-2">
              <input value={roomName} onChange={e => setRoomName(e.target.value)}
                placeholder="Назва уроку" className="flex-1 px-3 py-2 rounded-xl text-xs"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)}
                className="px-3 py-2 rounded-xl text-xs"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
            </div>
            <button onClick={createRoom} disabled={loading || !roomName.trim()}
              className="btn-primary !text-xs !py-2 !px-4 !rounded-xl" style={{ opacity: loading ? 0.5 : 1 }}>
              {loading ? 'Створення...' : 'Створити'}
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {rooms.length === 0 && (
            <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
              <div className="text-4xl mb-3">🎥</div>
              <div className="text-sm">Поки немає кімнат</div>
              {isMentor && <div className="text-xs mt-1">Створіть кімнату для проведення уроку</div>}
            </div>
          )}
          {rooms.map(room => (
            <div key={room.id} className="p-4 rounded-xl glass-surface flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ background: room.is_active ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.1)' }}>
                {room.is_active ? '🔴' : '📹'}
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold">{room.name}</div>
                <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  {room.creator_name} • {room.room_code}
                  {room.scheduled_at && ` • ${new Date(room.scheduled_at).toLocaleString('uk-UA')}`}
                </div>
              </div>
              <div className="flex gap-2">
                {room.is_active ? (
                  <button onClick={() => joinRoom(room.room_code, room.id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: 'rgba(34,197,94,0.2)', color: '#22c55e' }}>
                    Приєднатися
                  </button>
                ) : isMentor ? (
                  <button onClick={() => startRoom(room.id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: 'rgba(59,130,246,0.2)', color: '#3b82f6' }}>
                    Старт
                  </button>
                ) : (
                  <span className="text-[10px] px-2 py-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>
                    Очікує...
                  </span>
                )}
                {(room.creator_name === user?.display_name || user?.role === 'admin') && (
                  <>
                    {room.is_active && <button onClick={() => endRoom(room.id)} className="text-[10px] px-2 py-1 rounded-lg" style={{ color: 'var(--warning)' }}>Завершити</button>}
                    <button onClick={() => deleteRoom(room.id)} className="text-[10px] px-2 py-1 rounded-lg" style={{ color: 'var(--error)' }}>✕</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
