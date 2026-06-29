import { useState, useEffect } from 'react'
import { useStore } from '../store'

const API = ''

function CountdownTimer() {
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    const update = () => {
      const now = new Date()
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(0, 0, 0, 0)
      const diff = tomorrow.getTime() - now.getTime()
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setTimeLeft(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`)
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [])

  return <span className="font-mono text-[10px] tabular-nums" style={{ color: 'var(--accent-light)' }}>{timeLeft}</span>
}

export default function Sidebar() {
  const { tasks, currentTask, setCurrentTask, dailyChallenge } = useStore()

  const lessons = tasks.filter((t) => t.type === 'lesson')
  const exercises = tasks.filter((t) => t.type !== 'lesson')

  const modules = [
    { order: 1, name: 'Основи', icon: '⚡', color: '#22c55e' },
    { order: 2, name: 'Оператори', icon: '🔢', color: '#3b82f6' },
    { order: 3, name: 'Умови', icon: '🔀', color: '#8b5cf6' },
    { order: 4, name: 'Цикли', icon: '🔄', color: '#f59e0b' },
    { order: 5, name: 'Функції', icon: '⚡', color: '#ef4444' },
    { order: 6, name: 'Списки', icon: '📋', color: '#06b6d4' },
    { order: 7, name: 'Словники', icon: '📚', color: '#ec4899' },
    { order: 8, name: 'Файли', icon: '📁', color: '#84cc16' },
    { order: 9, name: 'Винятки', icon: '⚠️', color: '#f97316' },
    { order: 10, name: 'ООП', icon: '🏗️', color: '#a855f7' },
    { order: 11, name: 'HTML', icon: '🌐', color: '#e44d26' },
    { order: 12, name: 'CSS', icon: '🎨', color: '#1572b6' },
    { order: 13, name: 'JavaScript', icon: '📜', color: '#f7df1e' },
    { order: 14, name: 'React', icon: '⚛️', color: '#61dafb' },
    { order: 15, name: 'GUI (tkinter)', icon: '🖥️', color: '#3776ab' },
    { order: 16, name: 'CLI', icon: '💻', color: '#4eaa25' },
    { order: 17, name: 'Файли (просунуті)', icon: '📂', color: '#06b6d4' },
    { order: 18, name: 'OOP (просунуті)', icon: '🏗️', color: '#a855f7' },
    { order: 19, name: 'БД: Основи', icon: '🗄️', color: '#3b82f6' },
    { order: 20, name: 'БД: Запити', icon: '🔍', color: '#22c55e' },
    { order: 21, name: 'БД: Просунуте', icon: '⚡', color: '#f59e0b' },
  ]

  const groupedExercises = modules.map((mod) => ({
    ...mod,
    tasks: exercises.filter((t) => t.module_order === mod.order),
  })).filter((m) => m.tasks.length > 0)

  const handleSelect = (taskId: string) => {
    fetch(`${API}/api/tasks/${taskId}`)
      .then((r) => r.json())
      .then((task) => setCurrentTask(task))
      .catch(console.error)
  }

  const totalDone = tasks.filter((t) => t.status === 'completed').length
  const progressPct = tasks.length > 0 ? (totalDone / tasks.length) * 100 : 0

  return (
    <aside className="w-72 flex-shrink-0 glass flex flex-col overflow-hidden" style={{ borderRight: '1px solid var(--border)' }}>
      {/* Daily Challenge */}
      {dailyChallenge && (
        <div className="p-3" style={{ borderBottom: '1px solid var(--border)', background: 'rgba(139,92,246,0.08)' }}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--accent-light)' }}>🔥 Щоденний челлендж</span>
            <CountdownTimer />
          </div>
          <button
            onClick={() => handleSelect(dailyChallenge.task_id)}
            className="w-full text-left p-2 rounded-lg text-xs flex items-center gap-2 transition-all"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
          >
            <span className="w-6 h-6 rounded-md flex items-center justify-center text-xs" style={{ background: 'var(--gradient-1)' }}>⭐</span>
            <span className="flex-1 font-medium" style={{ color: 'var(--text-primary)' }}>Виконай завдання</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: 'rgba(245,158,11,0.2)', color: '#f59e0b' }}>+{dailyChallenge.bonus_xp} XP</span>
          </button>
        </div>
      )}

      {/* Progress */}
      <div className="p-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Прогрес</span>
          <span className="text-xs font-bold" style={{ color: 'var(--accent-light)' }}>{Math.round(progressPct)}%</span>
        </div>
        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-surface)' }}>
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progressPct}%`, background: 'var(--gradient-1)' }} />
        </div>
        <div className="text-[10px] mt-1.5" style={{ color: 'var(--text-muted)' }}>{totalDone} / {tasks.length}</div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {/* Lessons section */}
        {lessons.length > 0 && (
          <div className="mb-3">
            <div className="px-3 py-1.5 flex items-center gap-2">
              <span className="text-xs">📖</span>
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--accent-light)' }}>Уроки</span>
            </div>
            {lessons.map((lesson) => {
              const isActive = currentTask?.id === lesson.id
              const isDone = lesson.status === 'completed'
              return (
                <button
                  key={lesson.id}
                  onClick={() => handleSelect(lesson.id)}
                  className="w-full text-left px-3 py-2.5 rounded-xl text-xs flex items-center gap-3 transition-all duration-200 group"
                  style={{
                    background: isActive ? 'var(--accent-glow)' : 'transparent',
                    border: isActive ? '1px solid var(--accent)' : '1px solid transparent',
                  }}
                >
                  <span className="w-7 h-7 rounded-lg flex items-center justify-center text-sm transition-all" style={{
                    background: isDone ? 'var(--success)' : isActive ? 'var(--accent)' : 'var(--bg-surface)',
                    color: isDone || isActive ? '#fff' : 'var(--text-muted)',
                  }}>
                    {isDone ? '✓' : '📖'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate" style={{ color: isDone ? 'var(--success)' : 'var(--text-primary)' }}>
                      {lesson.title || lesson.concept}
                    </div>
                    {lesson.duration && (
                      <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>⏱ {lesson.duration}</div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* Exercises by module */}
        {groupedExercises.map((mod) => {
          const done = mod.tasks.filter((t) => t.status === 'completed').length
          const pct = mod.tasks.length > 0 ? (done / mod.tasks.length) * 100 : 0

          return (
            <div key={mod.order} className="mb-2">
              <div className="flex items-center gap-2 px-3 py-1.5">
                <span className="text-xs">{mod.icon}</span>
                <span className="text-[10px] font-semibold flex-1" style={{ color: 'var(--text-primary)' }}>{mod.name}</span>
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{done}/{mod.tasks.length}</span>
              </div>
              <div className="mx-3 mb-1 h-0.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-surface)' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct === 100 ? 'var(--success)' : mod.color }} />
              </div>
              <div className="space-y-0.5">
                {mod.tasks.map((task) => {
                  const isActive = currentTask?.id === task.id
                  const isDone = task.status === 'completed'
                  return (
                    <button
                      key={task.id}
                      onClick={() => handleSelect(task.id)}
                      className="w-full text-left px-4 py-2 rounded-lg text-xs flex items-center gap-2.5 transition-all duration-200"
                      style={{
                        background: isActive ? 'var(--accent-glow)' : 'transparent',
                        border: isActive ? '1px solid var(--accent)' : '1px solid transparent',
                        color: isDone ? 'var(--success)' : 'var(--text-primary)',
                      }}
                    >
                      <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px]" style={{
                        background: isDone ? 'var(--success)' : 'var(--bg-surface)',
                        color: isDone ? '#fff' : 'var(--text-muted)',
                      }}>
                        {isDone ? '✓' : ''}
                      </span>
                      <span className="flex-1 truncate font-medium">{task.title}</span>
                      <span className={`badge badge-${task.difficulty}`}>
                        {task.difficulty === 'easy' ? 'E' : task.difficulty === 'medium' ? 'M' : 'H'}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </aside>
  )
}
