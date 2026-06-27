import { useState, useCallback, useRef, useEffect } from 'react'
import Editor from '@monaco-editor/react'
import { useStore } from '../store'

declare global {
  interface Window { loadPyodide: any; pyodide: any }
}
let pyodReady = false
async function getPy() {
  if (window.pyodide && pyodReady) return window.pyodide
  if (!window.loadPyodide) {
    const s = document.createElement('script')
    s.src = 'https://cdn.jsdelivr.net/pyodide/v0.25.1/full/pyodide.js'
    document.head.appendChild(s)
    await new Promise(r => { s.onload = r })
  }
  window.pyodide = await window.loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.1/full/' })
  pyodReady = true
  return window.pyodide
}

export default function LessonView() {
  const { currentTask, code, setCode, editorTheme, running, setRunning, output, setOutput, testResults, setTestResults, markTaskCompleted, showXpPopup } = useStore()
  const [tab, setTab] = useState<'code' | 'demo' | 'review'>('code')
  const [demoIdx, setDemoIdx] = useState(0)

  const exec = useCallback(async (c?: string) => {
    setRunning(true); setOutput('')
    try {
      const py = await getPy()
      py.runPython('import sys,io;__o=io.StringIO();sys.stdout=__o')
      py.runPython(c || code)
      const out = py.runPython('__o.getvalue().rstrip("\\n")')
      py.runPython('sys.stdout=sys.__stdout__')
      setOutput(String(out)); return String(out)
    } catch (e: any) { setOutput('❌ ' + e.message.split('\n')[0]); return null }
    finally { setRunning(false) }
  }, [code])

  const runTests = useCallback(async () => {
    if (!currentTask?.tests?.length) return
    setRunning(true); setTestResults([])
    try {
      const py = await getPy()
      const res: any[] = []; let ok = true
      for (const t of currentTask.tests) {
        try {
          py.runPython('import sys,io;__o=io.StringIO();sys.stdout=__o')
          py.runPython(code)
          const got = py.runPython('__o.getvalue().rstrip("\\n")')
          py.runPython('sys.stdout=sys.__stdout__')
          const pass = String(got) === String(t.expected)
          if (!pass) ok = false
          res.push({ passed: pass, expected: t.expected, got: String(got) })
        } catch (e: any) {
          ok = false; py.runPython('import sys;sys.stdout=sys.__stdout__')
          res.push({ passed: false, expected: t.expected, got: '', error: e.message })
        }
      }
      setTestResults(res)
      if (ok) {
        markTaskCompleted(currentTask.id)
        fetch(`/api/tasks/${currentTask.id}/complete`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ best_code: code }) })
          .then(r => r.json()).then(d => { if (d.xp_added > 0) showXpPopup(d) }).catch(() => {})
      } else {
        fetch(`/api/tasks/${currentTask.id}/fail`, { method: 'POST' }).catch(() => {})
      }
    } catch (e: any) { setOutput('❌ ' + e.message) }
    finally { setRunning(false) }
  }, [code, currentTask])

  if (!currentTask) return <EmptyState />

  const isLesson = currentTask.type === 'lesson'
  const demo = currentTask.demo
  const review = currentTask.review

  return (
    <div className="flex-1 flex min-h-0">
      {/* LEFT: Instructions */}
      <div className="w-[420px] flex-shrink-0 flex flex-col border-r overflow-hidden" style={{ borderColor: 'var(--border)' }}>
        {/* Tabs */}
        <div className="flex border-b" style={{ borderColor: 'var(--border)' }}>
          {[
            isLesson && { id: 'demo', label: '📖 Урок' },
            { id: 'code', label: '✏️ Код' },
            review && { id: 'review', label: '📝 Розбір' },
          ].filter(Boolean).map((t: any) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex-1 py-3 text-xs font-semibold transition-all"
              style={{ color: tab === t.id ? 'var(--accent)' : 'var(--text-muted)', borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'demo' && isLesson && demo && (
            <div className="space-y-5">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--accent)' }}>💡 Концепція</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{currentTask.one_liner}</p>
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>👀 Приклад</h3>
                <pre className="p-4 rounded-xl text-xs font-mono leading-relaxed overflow-x-auto" style={{ background: '#1e1e2e', color: '#cdd6f4' }}>{demo.code}</pre>
                {demo.output && (
                  <div className="mt-2 px-4 py-2 rounded-xl text-xs font-mono" style={{ background: 'rgba(34,197,94,0.1)', color: 'var(--success)' }}>
                    → {demo.output}
                  </div>
                )}
              </div>
              {demo.try_changes?.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>🧪 Спробуй змінити</h3>
                  <div className="space-y-2">
                    {demo.try_changes.map((ch: any, i: number) => (
                      <button key={i} onClick={() => { setCode(ch.change); setTab('code') }}
                        className="w-full text-left p-3 rounded-xl border transition-all text-xs hover:border-[var(--accent)]"
                        style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
                        <div className="font-mono mb-1" style={{ color: 'var(--accent-light)' }}>{ch.change.split('\n')[0]}</div>
                        <div style={{ color: 'var(--text-muted)' }}>→ {ch.new_output}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {currentTask.mini_task && (
                <div className="p-4 rounded-xl border" style={{ borderColor: 'var(--accent)', background: 'rgba(139,92,246,0.05)' }}>
                  <div className="text-xs font-bold mb-1" style={{ color: 'var(--accent)' }}>🧩 Міні-задача</div>
                  <p className="text-sm mb-3">{currentTask.mini_task.goal}</p>
                  <button onClick={() => { setCode(currentTask.mini_task!.starter); setTab('code') }} className="text-xs font-semibold px-4 py-2 rounded-lg" style={{ background: 'var(--accent)', color: '#fff' }}>
                    Відкрити в редакторі →
                  </button>
                </div>
              )}
            </div>
          )}

          {tab === 'review' && review && (
            <div className="space-y-4">
              {review.solutions.map((sol: any, i: number) => (
                <div key={i} className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
                  <div className="px-4 py-2 text-xs font-semibold" style={{ background: 'var(--bg-surface)', color: 'var(--accent-light)' }}>Варіант {i + 1}</div>
                  <pre className="p-4 text-xs font-mono" style={{ background: '#1e1e2e', color: '#cdd6f4' }}>{sol.code}</pre>
                  <div className="px-4 py-2 text-xs" style={{ color: 'var(--text-secondary)' }}>{sol.comment}</div>
                </div>
              ))}
              {review.takeaway && (
                <div className="p-4 rounded-xl" style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid var(--accent)' }}>
                  <div className="text-xs font-bold mb-1" style={{ color: 'var(--accent)' }}>💎 Головне</div>
                  <p className="text-sm">{review.takeaway}</p>
                </div>
              )}
            </div>
          )}

          {tab === 'code' && (
            <div>
              <h2 className="text-lg font-bold mb-2">{currentTask.title || currentTask.concept}</h2>
              {currentTask.duration && <span className="text-xs px-2 py-0.5 rounded-full mb-3 inline-block" style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)' }}>⏱ {currentTask.duration}</span>}
              <p className="text-sm leading-relaxed mt-2" style={{ color: 'var(--text-secondary)' }}>{currentTask.description || currentTask.one_liner}</p>
              {currentTask.task && (
                <div className="mt-4 p-3 rounded-xl" style={{ background: 'var(--bg-surface)' }}>
                  <div className="text-xs font-semibold mb-1" style={{ color: 'var(--accent)' }}>🎯 Завдання</div>
                  <p className="text-sm">{currentTask.task.goal}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Editor + Output */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Editor */}
        <div className="flex-1 min-h-0">
          <Editor height="100%" language="python" theme={editorTheme} value={code} onChange={v => setCode(v || '')}
            options={{ fontSize: 14, fontFamily: "'JetBrains Mono', monospace", minimap: { enabled: false }, scrollBeyondLastLine: false, padding: { top: 12 }, automaticLayout: true, tabSize: 4, smoothScrolling: true, cursorBlinking: 'smooth' }} />
        </div>

        {/* Output + Tests */}
        <div className="h-[200px] flex-shrink-0 border-t flex flex-col" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 px-4 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
            <button onClick={() => exec()} disabled={running} className="px-4 py-1.5 rounded-lg text-xs font-semibold" style={{ background: 'var(--accent)', color: '#fff', opacity: running ? 0.5 : 1 }}>
              {running ? '⏳...' : '▶ Запустити'}
            </button>
            {currentTask.tests?.length > 0 && (
              <button onClick={runTests} disabled={running} className="px-4 py-1.5 rounded-lg text-xs font-semibold border" style={{ borderColor: 'var(--success)', color: 'var(--success)' }}>
                🧪 Тести ({currentTask.tests.length})
              </button>
            )}
            <div className="flex-1" />
            {testResults.length > 0 && (
              <span className="text-xs font-semibold" style={{ color: testResults.every(r => r.passed) ? 'var(--success)' : 'var(--error)' }}>
                {testResults.filter(r => r.passed).length}/{testResults.length} пройдено
              </span>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {output && <pre className="text-xs font-mono whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>{output}</pre>}
            {testResults.map((r, i) => (
              <div key={i} className="flex items-start gap-2 mb-1 text-xs">
                <span>{r.passed ? '✅' : '❌'}</span>
                <span className="font-mono">Тест {i + 1}</span>
                {!r.passed && <span className="font-mono" style={{ color: 'var(--error)' }}>очікувано: {r.expected} {r.got && `отримано: ${r.got}`}</span>}
              </div>
            ))}
            {!output && testResults.length === 0 && (
              <div className="text-center py-6" style={{ color: 'var(--text-muted)' }}>
                <div className="text-2xl mb-1">🐍</div>
                <div className="text-xs">Напиши код і натисни "Запустити"</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>
      <div className="text-center">
        <div className="text-5xl mb-3">🐍</div>
        <div className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>PyLess</div>
        <div className="text-sm">Оберіть урок зліва щоб почати</div>
      </div>
    </div>
  )
}
