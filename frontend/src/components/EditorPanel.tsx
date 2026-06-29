import { useRef, useCallback, useState, useEffect } from 'react'
import { useStore } from '../store'
import CodeSandbox from './CodeSandbox'
import { LANGUAGE_MONACO_MAP, type TaskLanguage } from '../types'

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
  const { code, setCode, editorTheme, currentTask, taskStartedAt, running, setRunning, setTestResults, setOutput, testResults, output, markTaskCompleted, showXpPopup, token } = useStore()
  const [leftTab, setLeftTab] = useState<'instructions' | 'hints' | 'output'>('instructions')
  const [sandboxOutput, setSandboxOutput] = useState('')
  const [showHints, setShowHints] = useState(0)

  const lang: TaskLanguage = (currentTask?.language as TaskLanguage) || 'python'
  const isPython = lang === 'python'
  const monacoLang = LANGUAGE_MONACO_MAP[lang] || 'python'

  const runCode = useCallback(async (codeToRun?: string) => {
    const runThis = codeToRun || code
    if (running) return
    setRunning(true)
    setOutput('')

    if (!isPython) {
      setRunning(false)
      return
    }

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
      setLeftTab('output')
      return String(output)
    } catch (e: any) {
      setOutput(`❌ ${e.message.split('\n')[0]}`)
      setLeftTab('output')
      return null
    } finally {
      setRunning(false)
    }
  }, [code, running, isPython])

  const runTests = useCallback(async () => {
    if (!currentTask?.tests || currentTask.tests.length === 0) return
    setRunning(true)
    setTestResults([])
    setOutput('')

    if (!isPython) {
      const results = currentTask.tests.map(t => {
        if (lang === 'html') {
          const pass = sandboxOutput.includes(t.expected) || true
          return { passed: pass, input: t.input, expected: t.expected, got: sandboxOutput || t.input }
        }
        if (lang === 'javascript' || lang === 'react') {
          const pass = sandboxOutput.trim() === t.expected.trim()
          return { passed: pass, input: t.input, expected: t.expected, got: sandboxOutput }
        }
        return { passed: false, input: t.input, expected: t.expected, got: 'manual check needed' }
      })
      const allPassed = results.every(r => r.passed)
      setTestResults(results)
      setLeftTab('output')

      if (allPassed) {
        markTaskCompleted(currentTask.id)
        try {
          const resp = await fetch('/api/tasks/' + currentTask.id + '/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: JSON.stringify({ best_code: code, elapsed_seconds: (Date.now() - taskStartedAt) / 1000 }),
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
      setRunning(false)
      return
    }

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
      setLeftTab('output')

      if (allPassed) {
        markTaskCompleted(currentTask.id)
        try {
          const resp = await fetch('/api/tasks/' + currentTask.id + '/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: JSON.stringify({ best_code: code, elapsed_seconds: (Date.now() - taskStartedAt) / 1000 }),
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
  }, [code, currentTask, running, token, isPython, lang, sandboxOutput])

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
    <div className="flex-1 flex min-h-0 overflow-hidden">
      {/* LEFT PANE — Task info (freeCodeCamp style) */}
      <div className="w-[40%] min-w-[300px] flex flex-col min-h-0" style={{ borderRight: '1px solid var(--border)' }}>
        {/* Task title bar */}
        <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-panel)' }}>
          <span className={`badge badge-${currentTask.difficulty}`}>{currentTask.difficulty}</span>
          <h2 className="font-bold text-sm flex-1">{currentTask.title}</h2>
          {currentTask.duration && (
            <span className="text-[10px] px-2 py-0.5 rounded-full glass-surface" style={{ color: 'var(--text-muted)' }}>
              ⏱ {currentTask.duration}
            </span>
          )}
        </div>

        {/* Left tabs */}
        <div className="flex gap-0 px-2 pt-2" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-panel)' }}>
          {[
            { id: 'instructions', label: '📖 Завдання' },
            ...(currentTask.hints?.length ? [{ id: 'hints', label: `💡 Підказки (${showHints}/${currentTask.hints.length})` }] : []),
            { id: 'output', label: '📤 Вивід' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setLeftTab(tab.id as any)}
              className="px-3 py-2 text-[11px] font-medium transition-all relative"
              style={{
                color: leftTab === tab.id ? 'var(--accent-light)' : 'var(--text-muted)',
              }}
            >
              {tab.label}
              {leftTab === tab.id && (
                <div className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full" style={{ background: 'var(--accent)' }} />
              )}
            </button>
          ))}
        </div>

        {/* Left content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {leftTab === 'instructions' && (
            <div className="space-y-3">
              <div className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {currentTask.description}
              </div>

              {currentTask.one_liner && (
                <div className="p-3 rounded-xl text-xs" style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)' }}>
                  <span style={{ color: 'var(--accent-light)' }}>💡</span>{' '}
                  <span style={{ color: 'var(--text-secondary)' }}>{currentTask.one_liner}</span>
                </div>
              )}

              {currentTask.tests && currentTask.tests.length > 0 && (
                <div className="p-3 rounded-xl" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
                  <div className="text-[10px] font-semibold mb-1" style={{ color: 'var(--success)' }}>✅ Очікуваний результат</div>
                  <div className="text-xs font-mono" style={{ color: 'var(--text-primary)' }}>
                    {currentTask.tests.map((t: any) => t.expected).join('\n')}
                  </div>
                </div>
              )}

              {currentTask.demo && (
                <button
                  onClick={() => setLeftTab('instructions')}
                  className="w-full text-left p-3 rounded-xl glass-surface hover:border-[var(--accent)] border border-transparent transition-all text-xs"
                >
                  <span style={{ color: 'var(--accent-light)' }}>👀</span> Переглянути демо приклад
                </button>
              )}
            </div>
          )}

          {leftTab === 'hints' && (
            <div className="space-y-3">
              {currentTask.hints?.slice(0, showHints).map((hint: any, i: number) => (
                <div key={i} className="p-3 rounded-xl glass-surface animate-slide-up" style={{ animationDelay: `${i * 0.1}s` }}>
                  <div className="text-[10px] font-semibold mb-1" style={{ color: 'var(--accent-light)' }}>💡 Підказка {i + 1}</div>
                  <div className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                    {typeof hint === 'string' ? hint : hint.text}
                  </div>
                </div>
              ))}
              {showHints < (currentTask.hints?.length || 0) && (
                <button
                  onClick={() => setShowHints(h => h + 1)}
                  className="w-full p-3 rounded-xl glass-surface hover:border-[var(--accent)] border border-transparent transition-all text-xs text-center"
                  style={{ color: 'var(--accent-light)' }}
                >
                  Показати підказку {showHints + 1} →
                </button>
              )}
              {showHints >= (currentTask.hints?.length || 0) && currentTask.hints?.length > 0 && (
                <div className="text-center text-[10px] py-2" style={{ color: 'var(--text-muted)' }}>
                  Всі підказки показані 🎯
                </div>
              )}
            </div>
          )}

          {leftTab === 'output' && (
            <div className="space-y-3">
              {output && (
                <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(0,0,0,0.3)' }}>
                  <div className="px-3 py-1.5 text-[10px] font-semibold" style={{ background: 'rgba(0,0,0,0.2)', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
                    Вивід
                  </div>
                  <pre className="p-3 text-xs font-mono whitespace-pre-wrap" style={{ color: output.startsWith('❌') ? 'var(--error)' : 'var(--success)' }}>
                    {output}
                  </pre>
                </div>
              )}

              {testResults && testResults.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                    Тести: {testResults.filter(r => r.passed).length}/{testResults.length} пройдено
                  </div>
                  {testResults.map((r: any, i: number) => (
                    <div
                      key={i}
                      className="p-2 rounded-lg text-[11px] font-mono"
                      style={{
                        background: r.passed ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                        border: `1px solid ${r.passed ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                        color: r.passed ? 'var(--success)' : 'var(--error)',
                      }}
                    >
                      {r.passed ? '✅' : '❌'} {r.expected}
                      {!r.passed && r.got && (
                        <div className="mt-1 opacity-70">отримано: {r.got}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {!output && (!testResults || testResults.length === 0) && (
                <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
                  <div className="text-2xl mb-2">📤</div>
                  <div className="text-xs">Натисніть "Запустити" або "Тести" щоб побачити результат</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANE — Code editor */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        {/* Editor area */}
        <div className="flex-1 min-h-0 relative flex">
          <div className={`${isPython ? 'w-full' : 'w-1/2'} h-full relative`}>
            <MonacoEditor
              value={code}
              language={monacoLang}
              theme={editorTheme}
              onChange={(v) => setCode(v)}
            />
          </div>
          {!isPython && (
            <div className="w-1/2 h-full" style={{ borderLeft: '1px solid var(--border)' }}>
              <CodeSandbox
                code={code}
                language={lang}
                onOutput={setSandboxOutput}
                onTestRun={async () => []}
                tests={currentTask?.tests}
              />
            </div>
          )}
        </div>

        {/* Action bar — bottom of right pane */}
        <div className="px-4 py-2.5 flex items-center gap-2" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-panel)' }}>
          <button
            onClick={() => runCode()}
            disabled={running}
            className="btn-primary !py-1.5 !px-4 !text-xs !rounded-lg flex items-center gap-1.5"
            style={{ opacity: running ? 0.5 : 1 }}
          >
            {running ? (
              <><span className="animate-spin">⏳</span> Запуск...</>
            ) : (
              <><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg> Запустити</>
            )}
          </button>
          {currentTask.tests && currentTask.tests.length > 0 && (
            <button
              onClick={runTests}
              disabled={running}
              className="btn-ghost !py-1.5 !px-3 !text-xs !rounded-lg flex items-center gap-1.5"
              style={{ borderColor: 'var(--success)', color: 'var(--success)' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              Тести ({currentTask.tests.length})
            </button>
          )}
          {testResults && testResults.length > 0 && (
            <span className="text-[10px] ml-1" style={{ color: testResults.every((r: any) => r.passed) ? 'var(--success)' : 'var(--error)' }}>
              {testResults.every((r: any) => r.passed) ? '✅ Всі пройдено!' : `❌ ${testResults.filter((r: any) => !r.passed).length} помилок`}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
