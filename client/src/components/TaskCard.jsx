import React, { useState } from 'react'
import WebApp from '@twa-dev/sdk'
import { motion } from 'framer-motion'
import { ExternalLink, CheckCircle2, Loader2 } from 'lucide-react'
import { clsx } from 'clsx'

function openTaskLink(link) {
  try {
    const isTg = /^https?:\/\/(t\.me|telegram\.me)\//i.test(link) || /^tg:/.test(link)
    if (isTg && WebApp?.openTelegramLink) {
      WebApp.openTelegramLink(link)
    } else if (WebApp?.openLink) {
      WebApp.openLink(link)
    } else {
      window.open(link, '_blank', 'noopener,noreferrer')
    }
  } catch {
    try { window.open(link, '_blank', 'noopener,noreferrer') } catch {}
  }
}

export default function TaskCard({ task, onVerify, loading }) {
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')
  const completed = task.status === 'completed'

  return (
    <motion.div
      initial={{ y: 12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.25 }}
      className={clsx(
        "relative p-4 rounded-2xl bg-card/90 border border-white/5 overflow-hidden",
        completed && "opacity-70"
      )}
    >
      {/* Completed overlay ribbon */}
      {completed && (
        <div className="pointer-events-none absolute -right-12 top-4 rotate-45 bg-emerald-500 text-black text-xs font-semibold px-20 py-1 shadow-glow">
          COMPLETED
        </div>
      )}

      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5">
          <div className={clsx("h-10 w-10 rounded-xl grid place-items-center",
            completed ? "bg-[#1f2937]" : "bg-accent text-black shadow-glow")}>
            <ExternalLink size={18} />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold truncate">{task.title}</h3>
            <span className="text-xs px-2 py-1 rounded-lg border border-white/10 bg-white/5">
              +{task.reward} pts
            </span>
          </div>

          <div className="mt-2 flex items-center gap-2">
            <button
              disabled={completed || loading}
              onClick={() => openTaskLink(task.link)}
              className={clsx(
                "group flex-1 text-center py-2 rounded-xl bg-[#121826] hover:bg-[#0f1623] transition border border-white/5",
                completed && "cursor-not-allowed opacity-60"
              )}
            >
              <span className="inline-flex items-center gap-1 justify-center">
                Open Task Link <ExternalLink size={14} className="opacity-70 group-hover:translate-x-0.5 transition" />
              </span>
            </button>

            <button
              disabled={completed || loading}
              onClick={() => setOpen(true)}
              className={clsx(
                "px-4 py-2 rounded-xl font-medium flex items-center gap-2",
                completed ? 'bg-[#1f2937] text-subtle cursor-not-allowed' : 'bg-accent text-black shadow-glow'
              )}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              Enter Code
            </button>
          </div>
        </div>
      </div>

      {/* Code Modal */}
      {open && !completed && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#0b0f17] border border-white/10 p-4 space-y-3">
            <div className="text-sm font-semibold">Enter task completion code</div>
            <input
              autoFocus
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. 1234"
              className="flex-1 bg-[#0b0f17] rounded-xl px-3 py-2 outline-none border border-[#1f2937]"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 py-2 rounded-xl bg-[#121826] hover:bg-[#0f1623] border border-white/5"
              >
                Cancel
              </button>
              <button
                onClick={() => { onVerify(task.id, code); setOpen(false); setCode('') }}
                className="px-4 py-2 rounded-xl bg-accent text-black shadow-glow"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}
