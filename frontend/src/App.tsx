import { useEffect } from 'react'
import { useStore } from './store'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import EditorPanel from './components/EditorPanel'
import AiChat from './components/AiChat'
import XpPopup from './components/XpPopup'
import AuthPage from './components/AuthPage'
import InvitePage from './components/InvitePage'
import AdminDashboard from './components/AdminDashboard'
import ChatPanel from './components/ChatPanel'

const API = ''

export default function App() {
  const { theme, token, setTasks, setCurrentTask, setUser, currentTask, sidebarOpen, aiOpen, profile, setProfile, view, user, showAdmin, showChat } = useStore()

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light')
  }, [theme])

  useEffect(() => {
    const path = window.location.pathname
    if (path.startsWith('/invite/')) {
      return
    }

    const params = new URLSearchParams(window.location.search)
    const urlToken = params.get('token')
    if (urlToken) {
      localStorage.setItem('pylesss_token', urlToken)
      window.history.replaceState({}, '', '/')
      fetch(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${urlToken}` } })
        .then((r) => r.ok ? r.json() : null)
        .then((u) => { if (u) setUser(u, urlToken) })
        .catch(() => {})
    } else if (token) {
      fetch(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.ok ? r.json() : null)
        .then((u) => { if (u) setUser(u, token) })
        .catch(() => {})
    }
  }, [])

  useEffect(() => {
    const path = window.location.pathname
    if (path.startsWith('/invite/')) return

    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`

    fetch(`${API}/api/tasks/list`, { headers })
      .then((r) => r.json())
      .then((tasks) => {
        setTasks(tasks)
        if (tasks.length > 0 && !currentTask) {
          const first = tasks.find((t: any) => t.status !== 'completed') || tasks[0]
          fetch(`${API}/api/tasks/${first.id}`)
            .then((r) => r.json())
            .then((task) => setCurrentTask(task))
        }
      })
      .catch(console.error)
  }, [token])

  useEffect(() => {
    const path = window.location.pathname
    if (path.startsWith('/invite/')) return

    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`

    fetch(`${API}/api/profile/me`, { headers })
      .then((r) => r.json())
      .then(setProfile)
      .catch(() => {})
  }, [token, user])

  const path = window.location.pathname
  if (path.startsWith('/invite/')) {
    return <InvitePage />
  }

  if (view === 'auth' && !token) {
    return <AuthPage />
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden relative" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <div className="noise-bg" />
      <div className="mesh-gradient" />

      <XpPopup />
      <Header />

      <div className="flex-1 flex min-h-0 overflow-hidden relative z-10">
        {sidebarOpen && <Sidebar />}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <EditorPanel />
        </div>
        {aiOpen && <AiChat />}
      </div>

      {showAdmin && <AdminDashboard onClose={() => useStore.setState({ showAdmin: false })} />}
      {showChat && <ChatPanel onClose={() => useStore.setState({ showChat: false })} />}
    </div>
  )
}
