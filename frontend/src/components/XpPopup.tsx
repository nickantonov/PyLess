// Copyright (c) 1998-2026 Nick Antonov (nick.antonov1@gmail.com) / Borodachamba Studio. All rights reserved.
import { useEffect } from 'react'
import { useStore } from '../store'

export default function XpPopup() {
  const { xpPopup, hideXpPopup } = useStore()

  useEffect(() => {
    if (xpPopup) {
      const t = setTimeout(hideXpPopup, 4000)
      return () => clearTimeout(t)
    }
  }, [xpPopup])

  if (!xpPopup) return null

  return (
    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
      <div className="card !p-5 glow-accent text-center min-w-[280px]">
        <div className="text-3xl font-extrabold text-gradient mb-2">
          +{xpPopup.xp_added} XP
        </div>
        {xpPopup.multiplier > 1 && (
          <div className="text-xs font-semibold mb-1" style={{ color: 'var(--warning)' }}>
            🔥 ×{xpPopup.multiplier} streak bonus
          </div>
        )}
        {xpPopup.combo?.combo >= 2 && (
          <div className="text-xs font-semibold mb-1" style={{ color: 'var(--success)' }}>
            ⚡ Combo ×{xpPopup.combo.multiplier}
          </div>
        )}
        {xpPopup.streak?.message && (
          <div className="text-xs mt-2 px-3 py-1.5 rounded-xl glass-surface" style={{ color: 'var(--text-secondary)' }}>
            {xpPopup.streak.message}
          </div>
        )}
        {xpPopup.badges?.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {xpPopup.badges.map((b: any, i: number) => (
              <div key={i} className="text-xs px-3 py-2 rounded-xl font-medium" style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid var(--accent)' }}>
                🏅 {b.name}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
