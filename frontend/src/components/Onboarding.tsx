import { useState } from 'react'
import { useStore } from '../store'

const QUESTIONS = [
  {
    id: 'q1',
    question: 'Чи писав ти раніше код?',
    options: [
      { value: 'none', label: 'Ні, ніколи', emoji: '🤷' },
      { value: 'basic', label: 'Так, трохи (HTML або скрипт)', emoji: '📝' },
      { value: 'intermediate', label: 'Так, писав програми', emoji: '💻' },
      { value: 'advanced', label: 'Професійно, проєкти', emoji: '🚀' },
    ],
  },
  {
    id: 'q2',
    question: 'Що таке змінна?',
    options: [
      { value: 'a', label: 'Не знаю', emoji: '🤔' },
      { value: 'b', label: 'Контейнер для даних', emoji: '📦' },
      { value: 'c', label: 'Іменований блок пам\'яті', emoji: '🧠' },
      { value: 'd', label: 'Об\'єкт з типом та областю видимості', emoji: '🎓' },
    ],
  },
  {
    id: 'q3',
    question: 'Як працює цикл for?',
    options: [
      { value: 'a', label: 'Не знаю', emoji: '🤔' },
      { value: 'b', label: 'Повторює код багато разів', emoji: '🔄' },
      { value: 'c', label: 'Ітерує по елементах', emoji: '📋' },
      { value: 'd', label: 'Створює ітератор та виконує тіло', emoji: '⚙️' },
    ],
  },
  {
    id: 'q4',
    question: 'Що таке функція?',
    options: [
      { value: 'a', label: 'Не знаю', emoji: '🤔' },
      { value: 'b', label: 'Блок коду, який можна викликати', emoji: '📞' },
      { value: 'c', label: 'Іменований блок з параметрами', emoji: '⚡' },
      { value: 'd', label: 'Перший клас об\'єкт', emoji: '🎯' },
    ],
  },
  {
    id: 'q5',
    question: 'Як працює if/else?',
    options: [
      { value: 'a', label: 'Не знаю', emoji: '🤔' },
      { value: 'b', label: 'Перевіряє і робить одне з двох', emoji: '🔀' },
      { value: 'c', label: 'Виконує блок залежно від виразу', emoji: '✅' },
      { value: 'd', label: 'Оцінює булевий вираз та branch', emoji: '🌳' },
    ],
  },
  {
    id: 'goal',
    question: 'Чого ти хочеш навчитися?',
    options: [
      { value: 'python', label: 'Python з нуля до про', emoji: '🐍' },
      { value: 'web', label: 'Веб-розробка', emoji: '🌐' },
      { value: 'all', label: 'Все по черзі', emoji: '🎯' },
    ],
  },
]

export default function Onboarding() {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const handleAnswer = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
    setTimeout(() => {
      if (step < QUESTIONS.length - 1) {
        setStep(step + 1)
      } else {
        submit()
      }
    }, 400)
  }

  const submit = async () => {
    setLoading(true)
    try {
      const resp = await fetch('/api/onboarding/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(answers),
      })
      const data = await resp.json()
      setResult(data)
    } catch {
      setResult({ level: 'beginner', label: 'Початківець', start_task: 'py-01-01' })
    } finally {
      setLoading(false)
    }
  }

  if (result) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <div className="noise-bg" />
        <div className="mesh-gradient" />
        <div className="card max-w-md w-full mx-4 text-center animate-scale-in relative z-10">
          <div className="text-5xl mb-4 animate-float">🎉</div>
          <h2 className="text-xl font-bold mb-2 text-gradient">Готово!</h2>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>{result.label}</p>
          <div className="flex items-center justify-center gap-2 mb-6">
            <span className="badge badge-xp">Level {result.start_module}</span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Старт: завдання {result.start_task}</span>
          </div>
          <button onClick={() => window.location.reload()} className="btn-primary w-full !py-3 !text-sm !rounded-xl">
            Почати навчання →
          </button>
        </div>
      </div>
    )
  }

  const q = QUESTIONS[step]
  const progress = ((step) / QUESTIONS.length) * 100

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
      <div className="noise-bg" />
      <div className="mesh-gradient" />
      <div className="card max-w-lg w-full mx-4 animate-scale-in relative z-10">
        {/* Progress */}
        <div className="w-full h-1 rounded-full mb-6 overflow-hidden" style={{ background: 'var(--bg-surface)' }}>
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: 'var(--gradient-1)' }} />
        </div>

        {/* Question */}
        <div className="text-center mb-6">
          <div className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>
            Питання {step + 1} з {QUESTIONS.length}
          </div>
          <h2 className="text-lg font-bold">{q.question}</h2>
        </div>

        {/* Options */}
        <div className="space-y-2">
          {q.options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleAnswer(q.id, opt.value)}
              className="w-full text-left p-4 rounded-xl glass-surface hover:border-[var(--accent)] border border-transparent transition-all duration-200 flex items-center gap-3 group"
              style={{
                background: answers[q.id] === opt.value ? 'var(--accent-glow)' : undefined,
                borderColor: answers[q.id] === opt.value ? 'var(--accent)' : undefined,
              }}
            >
              <span className="text-xl group-hover:scale-110 transition-transform">{opt.emoji}</span>
              <span className="text-sm font-medium">{opt.label}</span>
            </button>
          ))}
        </div>

        {/* Nav */}
        <div className="flex justify-between mt-6">
          <button
            onClick={() => step > 0 && setStep(step - 1)}
            disabled={step === 0}
            className="btn-ghost !text-xs disabled:opacity-30"
          >
            ← Назад
          </button>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{step + 1}/{QUESTIONS.length}</span>
        </div>
      </div>
    </div>
  )
}
