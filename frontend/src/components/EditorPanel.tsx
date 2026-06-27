import { useRef, useCallback, useState, useEffect } from 'react'
import { useStore } from '../store'

declare global {
  interface Window {
    loadPyodide: any
    pyodide: any
    monaco: any
  }
}

let monacoReady = false
let monacoInstance: any = null

async function getMonaco(): Promise<any> {
  if (monacoReady && monacoInstance) return monacoInstance
  if (window.monaco) {
    monacoInstance = window.monaco
    monacoReady = true
    return monacoInstance
  }

  const script = document.createElement('script')
  script.src = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs/loader.js'
  document.head.appendChild(script)
  await new Promise<void>((resolve) => { script.onload = () => resolve() })

  return new Promise((resolve) => {
    (window as any).require.config({
      paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs' },
    })
    ;(window as any).require(['vs/editor/editor.main'], (m: any) => {
      monacoInstance = m
      monacoReady = true
      resolve(m)
    })
  })
}

let pyodideReady = false

async function getPyodide() {
  if (window.pyodide && pyodideReady) return window.pyodide
  if (!window.loadPyodide) {
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/pyodide/v0.25.1/full/pyodide.js'
    document.head.appendChild(script)
    await new Promise((resolve) => { script.onload = resolve })
  }
  window.pyodide = await window.loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.1/full/' })
  pyodideReady = true
  return window.pyodide
}

interface MonacoEditorProps {
  value: string
  language?: string
  theme?: string
  onChange?: (value: string) => void
  options?: any
}

function MonacoEditor({ value, language = 'python', theme = 'vs-dark', onChange, options = {} }: MonacoEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<any>(null)

  useEffect(() => {
    let disposed = false
    let editor: any = null

    getMonaco().then((m) => {
      if (disposed || !containerRef.current) return

      const model = m.editor.createModel(value || '', language)
      editor = m.editor.create(containerRef.current, {
        model,
        theme,
        fontSize: 14,
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        lineNumbers: 'on',
        padding: { top: 12, bottom: 12 },
        automaticLayout: true,
        tabSize: 4,
        renderLineHighlight: 'all',
        bracketPairColorization: { enabled: true },
        smoothScrolling: true,
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: 'on',
        ...options,
      })
      editorRef.current = editor

      editor.onDidChangeModelContent(() => {
        onChange?.(editor.getValue())
      })

      editor.focus()
    })

    return () => {
      disposed = true
      if (editor) {
        editor.dispose()
        editorRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.getValue()) {
      editorRef.current.setValue(value || '')
    }
  }, [value])

  useEffect(() => {
    if (monacoInstance && editorRef.current) {
      monacoInstance.editor.setTheme(theme)
    }
  }, [theme])

  return <div ref={containerRef} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: theme === 'vs-dark' || theme.includes('dark') || theme.includes('black') ? '#1e1e1e' : '#ffffff' }} />
}

export default function EditorPanel() {
  const { code, setCode, editorTheme, currentTask, running, setRunning, setTestResults, setOutput, markTaskCompleted, showXpPopup, token } = useStore()
  const [activeTab, setActiveTab] = useState<'editor' | 'demo' | 'review'>('editor')

  const runCode = useCallback(async (codeToRun?: string) => {
    const runThis = codeToRun || code
    if (running) return
    setRunning(true)
    setOutput('')

    try {
      const pyodide = await getPyodide()
      pyodide.runPython(`
import sys, io
__stdout = io.StringIO()
sys.stdout = __stdout
`)
      pyodide.runPython(runThis)
      const output = pyodide.runPython('__stdout.getvalue().rstrip("\\n")')
      pyodide.runPython('sys.stdout = sys.__stdout__')
      setOutput(String(output))
      return String(output)
    } catch (e: any) {
      setOutput(`❌ ${e.message.split('\n')[0]}`)
      return null
    } finally {
      setRunning(false)
    }
  }, [code, running])

  const runTests = useCallback(async () => {
    if (!currentTask?.tests || currentTask.tests.length === 0) return
    setRunning(true)
    setTestResults([])
    setOutput('')

    try {
      const pyodide = await getPyodide()
      const results: any[] = []
      let allPassed = true

      for (const test of currentTask.tests) {
        try {
          pyodide.runPython(`
import sys, io
__stdout = io.StringIO()
sys.stdout = __stdout
`)
          pyodide.runPython(code)
          const got = pyodide.runPython('__stdout.getvalue().rstrip("\\n")')
          pyodide.runPython('sys.stdout = sys.__stdout__')
          const passed = String(got) === String(test.expected)
          if (!passed) allPassed = false
          results.push({ passed, input: test.input, expected: test.expected, got: String(got) })
        } catch (e: any) {
          allPassed = false
          pyodide.runPython('import sys; sys.stdout = sys.__stdout__')
          results.push({ passed: false, input: test.input, expected: test.expected, got: '', error: e.message })
        }
      }

      setTestResults(results)

      if (allPassed) {
        markTaskCompleted(currentTask.id)
        try {
          const resp = await fetch('/api/tasks/' + currentTask.id + '/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: JSON.stringify({ best_code: code }),
          })
          const data = await resp.json()
          if (data.xp_added > 0) showXpPopup(data)
        } catch (e) {}
      } else {
        fetch('/api/tasks/' + currentTask.id + '/fail', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        }).catch(() => {})
      }
    } catch (e: any) {
      setOutput(`❌ Runtime: ${e.message}`)
    } finally {
      setRunning(false)
    }
  }, [code, currentTask, running, token])

  if (!currentTask) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>
        <div className="text-center animate-float">
          <div className="text-5xl mb-4">🐍</div>
          <div className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Ласкаво просимо!</div>
          <div className="text-sm">Оберіть урок зліва щоб почати</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Task header with condition */}
      <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-panel)' }}>
        <div className="flex items-center gap-3 mb-1">
          <h2 className="font-bold text-base">{currentTask.title}</h2>
          <span className={`badge badge-${currentTask.difficulty}`}>{currentTask.difficulty}</span>
          {currentTask.duration && (
            <span className="text-[10px] px-2 py-0.5 rounded-full glass-surface" style={{ color: 'var(--text-muted)' }}>
              ⏱ {currentTask.duration}
            </span>
          )}
        </div>
        {currentTask.description && (
          <div className="text-xs leading-relaxed mb-1" style={{ color: 'var(--text-secondary)' }}>
            {currentTask.description}
          </div>
        )}
        {currentTask.hints && currentTask.hints.length > 0 && (
          <div className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
            💡 {typeof currentTask.hints[0] === 'string' ? currentTask.hints[0] : currentTask.hints[0].text}
          </div>
        )}
        {currentTask.tests && currentTask.tests.length > 0 && (
          <div className="text-[10px] mt-1 font-mono" style={{ color: 'var(--success)' }}>
            ✅ Очікуваний результат: <span className="font-semibold">{currentTask.tests.map((t: any) => t.expected).join(', ')}</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 py-2" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-panel)' }}>
        {[
          { id: 'editor', label: '📝 Код', },
          ...(currentTask.demo ? [{ id: 'demo', label: '👀 Демо' }] : []),
          ...(currentTask.review ? [{ id: 'review', label: '📖 Розбір' }] : []),
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background: activeTab === tab.id ? 'var(--accent)' : 'transparent',
              color: activeTab === tab.id ? '#fff' : 'var(--text-secondary)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {activeTab === 'demo' && currentTask.demo && (
          <div className="h-full overflow-y-auto p-4 space-y-4">
            <div className="card animate-slide-up">
              <div className="text-xs font-semibold mb-2" style={{ color: 'var(--accent-light)' }}>💡 Концепція</div>
              <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{currentTask.one_liner}</div>
            </div>

            <div className="card animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <div className="text-xs font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>👀 Приклад</div>
              <div className="rounded-xl overflow-hidden" style={{ background: '#1e1e2e' }}>
                <div className="flex items-center gap-2 px-4 py-2" style={{ background: 'rgba(0,0,0,0.3)' }}>
                  <div className="w-3 h-3 rounded-full" style={{ background: '#ff5f57' }} />
                  <div className="w-3 h-3 rounded-full" style={{ background: '#ffbd2e' }} />
                  <div className="w-3 h-3 rounded-full" style={{ background: '#28c840' }} />
                  <span className="text-[10px] ml-2 font-mono" style={{ color: 'var(--text-muted)' }}>demo.py</span>
                </div>
                <pre className="p-4 text-xs font-mono leading-relaxed overflow-x-auto" style={{ color: '#cdd6f4' }}>
                  {currentTask.demo.code}
                </pre>
              </div>
              {currentTask.demo.output && (
                <div className="mt-3 rounded-xl overflow-hidden" style={{ background: 'rgba(0,0,0,0.2)' }}>
                  <div className="px-4 py-2 text-[10px] font-semibold" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
                    Вивід:
                  </div>
                  <pre className="p-4 text-xs font-mono" style={{ color: 'var(--success)' }}>{currentTask.demo.output}</pre>
                </div>
              )}
            </div>

            {currentTask.demo.try_changes && (
              <div className="card animate-slide-up" style={{ animationDelay: '0.2s' }}>
                <div className="text-xs font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>🧪 Спробуй змінити</div>
                <div className="space-y-2">
                  {currentTask.demo.try_changes.map((change: any, i: number) => (
                    <button
                      key={i}
                      onClick={() => { setCode(change.change); setActiveTab('editor'); }}
                      className="w-full text-left p-3 rounded-xl glass-surface hover:border-[var(--accent)] border border-transparent transition-all text-xs"
                    >
                      <div className="font-mono mb-1" style={{ color: 'var(--accent-light)' }}>{change.change.split('\n')[0]}...</div>
                      <div style={{ color: 'var(--text-muted)' }}>→ {change.new_output}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {currentTask.mini_task && (
              <div className="card animate-slide-up glow-accent" style={{ animationDelay: '0.3s' }}>
                <div className="text-xs font-semibold mb-2" style={{ color: 'var(--accent-light)' }}>🧩 Міні-задача</div>
                <div className="text-sm mb-3">{currentTask.mini_task.goal}</div>
                <button onClick={() => { if (currentTask.mini_task) { setCode(currentTask.mini_task.starter); setActiveTab('editor'); } }} className="btn-primary !text-xs !py-2">
                  Відкрити в редакторі →
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'review' && currentTask.review && (
          <div className="h-full overflow-y-auto p-4 space-y-4">
            <div className="card animate-slide-up">
              <div className="text-xs font-semibold mb-3" style={{ color: 'var(--accent-light)' }}>📝 Рішення</div>
              <div className="space-y-3">
                {currentTask.review.solutions.map((sol: any, i: number) => (
                  <div key={i} className="rounded-xl overflow-hidden" style={{ background: 'rgba(0,0,0,0.2)' }}>
                    <div className="px-4 py-2 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border)' }}>
                      <span className="text-[10px] font-semibold" style={{ color: 'var(--accent-light)' }}>Варіант {i + 1}</span>
                    </div>
                    <pre className="p-4 text-xs font-mono leading-relaxed" style={{ color: '#cdd6f4' }}>{sol.code}</pre>
                    <div className="px-4 py-2 text-[11px]" style={{ color: 'var(--text-secondary)', borderTop: '1px solid var(--border)' }}>{sol.comment}</div>
                  </div>
                ))}
              </div>
            </div>
            {currentTask.review.takeaway && (
              <div className="card animate-slide-up" style={{ animationDelay: '0.1s', background: 'rgba(139, 92, 246, 0.1)', borderColor: 'var(--accent)' }}>
                <div className="text-xs font-semibold mb-1" style={{ color: 'var(--accent-light)' }}>💎 Головне</div>
                <div className="text-sm" style={{ color: 'var(--text-primary)' }}>{currentTask.review.takeaway}</div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'editor' && (
          <div className="flex-1 min-h-0 relative">
            <MonacoEditor
              value={code}
              language="python"
              theme={editorTheme}
              onChange={(v) => setCode(v)}
            />
          </div>
        )}
      </div>

      {/* Action bar */}
      <div className="px-4 py-3 flex items-center gap-3" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-panel)' }}>
        <button onClick={() => runCode()} disabled={running} className="btn-primary !py-2 !px-5 !text-sm !rounded-xl flex items-center gap-2" style={{ opacity: running ? 0.5 : 1 }}>
          {running ? (
            <><span className="animate-spin">⏳</span> Виконується...</>
          ) : (
            <><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg> Запустити</>
          )}
        </button>
        {currentTask.tests && currentTask.tests.length > 0 && (
          <button onClick={runTests} disabled={running} className="btn-ghost !py-2 !px-4 !text-sm !rounded-xl flex items-center gap-2" style={{ borderColor: 'var(--success)', color: 'var(--success)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            Тести ({currentTask.tests.length})
          </button>
        )}
      </div>
    </div>
  )
}
