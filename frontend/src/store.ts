import { create } from 'zustand'
import type { Task, TestResult, User, AppTheme } from './types'

interface Store {
  user: User | null
  token: string | null
  authLoading: boolean
  authError: string | null
  tasks: Task[]
  currentTask: Task | null
  taskStartedAt: number
  code: string
  testResults: TestResult[]
  output: string
  running: boolean
  theme: AppTheme
  editorTheme: string
  hintsShown: number
  aiMessages: { role: 'user' | 'ai'; text: string }[]
  aiLoading: boolean
  sidebarOpen: boolean
  aiOpen: boolean
  profile: any
  leaderboard: any[]
  dailyChallenge: any
  xpPopup: any
  view: 'app' | 'auth'

  setUser: (user: User | null, token: string | null) => void
  setTasks: (tasks: Task[]) => void
  setCurrentTask: (task: Task | null) => void
  setCode: (code: string) => void
  setTestResults: (results: TestResult[]) => void
  setOutput: (output: string) => void
  setRunning: (v: boolean) => void
  setTheme: (theme: AppTheme) => void
  setEditorTheme: (theme: string) => void
  showNextHint: () => void
  addAiMessage: (msg: { role: 'user' | 'ai'; text: string }) => void
  setAiLoading: (v: boolean) => void
  toggleSidebar: () => void
  toggleAi: () => void
  markTaskCompleted: (taskId: string) => void
  setProfile: (p: any) => void
  setLeaderboard: (l: any[]) => void
  setDailyChallenge: (d: any) => void
  showXpPopup: (data: any) => void
  hideXpPopup: () => void
  login: (email: string, password: string) => Promise<boolean>
  register: (username: string, email: string, password: string, displayName: string) => Promise<boolean>
  logout: () => void
  setAuthLoading: (v: boolean) => void
  setAuthError: (e: string | null) => void
}

export const useStore = create<Store>((set, get) => ({
  user: null,
  token: localStorage.getItem('pylesss_token'),
  authLoading: false,
  authError: null,
  tasks: [],
  currentTask: null,
  taskStartedAt: 0,
  code: '',
  testResults: [],
  output: '',
  running: false,
  theme: (localStorage.getItem('pylesss_theme') as AppTheme) || 'dark',
  editorTheme: localStorage.getItem('pylesss_editor_theme') || 'vs-dark',
  hintsShown: 0,
  aiMessages: [],
  aiLoading: false,
  sidebarOpen: true,
  aiOpen: false,
  profile: null,
  leaderboard: [],
  dailyChallenge: null,
  xpPopup: null,
  view: 'app',

  setUser: (user, token) => {
    if (token) localStorage.setItem('pylesss_token', token)
    else localStorage.removeItem('pylesss_token')
    set({ user, token })
  },
  setTasks: (tasks) => set({ tasks }),
  setCurrentTask: (task) => set({ currentTask: task, taskStartedAt: Date.now(), code: task?.starter_code || '', testResults: [], output: '', hintsShown: 0 }),
  setCode: (code) => set({ code }),
  setTestResults: (results) => set({ testResults: results }),
  setOutput: (output) => set({ output }),
  setRunning: (running) => set({ running }),
  setTheme: (theme) => {
    localStorage.setItem('pylesss_theme', theme)
    document.documentElement.classList.toggle('light', theme === 'light')
    set({ theme })
  },
  setEditorTheme: (editorTheme) => {
    localStorage.setItem('pylesss_editor_theme', editorTheme)
    set({ editorTheme })
  },
  showNextHint: () => {
    const { currentTask, hintsShown } = get()
    if (currentTask && hintsShown < currentTask.hints.length) {
      set({ hintsShown: hintsShown + 1 })
    }
  },
  addAiMessage: (msg) => set((s) => ({ aiMessages: [...s.aiMessages, msg] })),
  setAiLoading: (v) => set({ aiLoading: v }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  toggleAi: () => set((s) => ({ aiOpen: !s.aiOpen })),
  markTaskCompleted: (taskId) => set((s) => ({
    tasks: s.tasks.map((t) => t.id === taskId ? { ...t, status: 'completed' } : t),
  })),
  setProfile: (profile) => set({ profile }),
  setLeaderboard: (leaderboard) => set({ leaderboard }),
  setDailyChallenge: (dailyChallenge) => set({ dailyChallenge }),
  showXpPopup: (data) => set({ xpPopup: data }),
  hideXpPopup: () => set({ xpPopup: null }),
  setAuthLoading: (v) => set({ authLoading: v }),
  setAuthError: (e) => set({ authError: e }),

  login: async (email, password) => {
    set({ authLoading: true, authError: null })
    try {
      const resp = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: email, password }),
      })
      const data = await resp.json()
      if (!resp.ok) {
        set({ authError: data.detail || 'Помилка входу', authLoading: false })
        return false
      }
      localStorage.setItem('pylesss_token', data.token)
      set({ user: data.user, token: data.token, authLoading: false, view: 'app' })
      return true
    } catch {
      set({ authError: 'Помилка з\'єднання', authLoading: false })
      return false
    }
  },

  register: async (username, email, password, displayName) => {
    set({ authLoading: true, authError: null })
    try {
      const path = window.location.pathname
      const match = path.match(/\/invite\/(.+)/)
      const inviteCode = match ? decodeURIComponent(match[1]) : ''

      const resp = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, display_name: displayName, invite_code: inviteCode }),
      })
      const data = await resp.json()
      if (!resp.ok) {
        set({ authError: data.detail || 'Помилка реєстрації', authLoading: false })
        return false
      }
      localStorage.setItem('pylesss_token', data.token)
      set({ user: data.user, token: data.token, authLoading: false, view: 'app' })
      return true
    } catch {
      set({ authError: 'Помилка з\'єднання', authLoading: false })
      return false
    }
  },

  logout: () => {
    localStorage.removeItem('pylesss_token')
    set({ user: null, token: null, profile: null })
  },
}))
