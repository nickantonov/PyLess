import { useStore } from '../store'

export default function TestResults() {
  const { testResults, output, currentTask, hintsShown, showNextHint } = useStore()

  return (
    <div className="w-80 flex-shrink-0 glass flex flex-col overflow-hidden" style={{ borderLeft: '1px solid var(--border)' }}>
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
        <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
          {testResults.length > 0
            ? `Тести ${testResults.filter((r) => r.passed).length}/${testResults.length}`
            : 'Вивід'}
        </span>
        {testResults.length > 0 && (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{
            background: testResults.every((r) => r.passed) ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
            color: testResults.every((r) => r.passed) ? 'var(--success)' : 'var(--error)',
          }}>
            {testResults.every((r) => r.passed) ? '✅ Всі пройдені' : '❌ Є помилки'}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {/* Output */}
        {output && (
          <div className="rounded-xl p-3 text-xs font-mono animate-slide-up" style={{ background: 'rgba(0,0,0,0.3)' }}>
            <div className="text-[10px] font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Вивід:</div>
            <pre className="whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>{output}</pre>
          </div>
        )}

        {/* No results yet */}
        {testResults.length === 0 && !output && (
          <div className="text-center py-12 animate-float">
            <div className="text-4xl mb-3">🧪</div>
            <div className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Готовий до тестів</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Напиши код і натисни "Тести"</div>
          </div>
        )}

        {/* Test results */}
        {testResults.map((r, i) => (
          <div
            key={i}
            className="rounded-xl p-3 animate-slide-up"
            style={{
              animationDelay: `${i * 0.05}s`,
              background: r.passed ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
              border: `1px solid ${r.passed ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm">{r.passed ? '✅' : '❌'}</span>
              <span className="text-xs font-semibold">Тест {i + 1}</span>
            </div>
            {!r.passed && (
              <div className="text-[11px] mt-2 space-y-1">
                <div className="flex gap-2">
                  <span style={{ color: 'var(--text-muted)' }}>Очікувано:</span>
                  <code className="px-1.5 py-0.5 rounded text-[10px]" style={{ background: 'rgba(34,197,94,0.1)', color: 'var(--success)' }}>{r.expected}</code>
                </div>
                {r.got && (
                  <div className="flex gap-2">
                    <span style={{ color: 'var(--text-muted)' }}>Отримано:</span>
                    <code className="px-1.5 py-0.5 rounded text-[10px]" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--error)' }}>{r.got}</code>
                  </div>
                )}
                {r.error && (
                  <div className="text-[10px] mt-1 font-mono" style={{ color: 'var(--error)' }}>{r.error.split('\n')[0]}</div>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Hints */}
        {currentTask && currentTask.hints && currentTask.hints.length > 0 && (
          <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>💡 Підказки</div>
            <div className="space-y-1.5">
              {currentTask.hints.slice(0, hintsShown).map((hint, i) => {
                const text = typeof hint === 'string' ? hint : hint.text
                return (
                  <div key={i} className="p-2.5 rounded-xl text-xs animate-slide-up" style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-secondary)',
                  }}>
                    <span className="font-semibold" style={{ color: 'var(--accent-light)' }}>{i + 1}.</span> {text}
                  </div>
                )
              })}
            </div>
            {hintsShown < currentTask.hints.length && (
              <button onClick={showNextHint} className="mt-2 text-xs font-medium px-3 py-1.5 rounded-lg transition-all" style={{ color: 'var(--accent-light)', background: 'var(--accent-glow)' }}>
                + Підказка ({hintsShown}/{currentTask.hints.length})
              </button>
            )}
          </div>
        )}

        {/* Explanation */}
        {currentTask?.explanation && (
          <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>📖 Пояснення</div>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{currentTask.explanation}</p>
          </div>
        )}
      </div>
    </div>
  )
}
