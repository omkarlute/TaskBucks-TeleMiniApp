import React, { useEffect, useState } from 'react'

const MESSAGES = [
  'Getting your tasks and rewards ready…',
  'Polishing the coins…',
  'Summoning bonus fairies…',
  'Too many legends online at once — including you 😎 — loading shortly!',
  'Counting referrals (math is hard)…',
  'Spinning up the mini app engines…'
]

export default function LoadingOverlay({ active }) {
  const [i, setI] = useState(0)
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => setI(v => (v + 1) % MESSAGES.length), 1600)
    return () => clearInterval(id)
  }, [active])

  if (!active) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#070b11] text-white">
      <div className="max-w-sm text-center px-6">
        <div className="h-14 w-14 mx-auto mb-4 rounded-2xl border border-white/10 animate-pulse" />
        <div className="text-base leading-relaxed opacity-90">{MESSAGES[i]}</div>
      </div>
    </div>
  )
}
