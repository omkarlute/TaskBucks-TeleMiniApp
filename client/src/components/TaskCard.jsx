import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { ExternalLink, CheckCircle2, Loader2 } from 'lucide-react'
import { clsx } from 'clsx'

export default function TaskCard({ task, onVerify, loading }) {
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')

  const completed = task.status === 'completed'

  return (
    <motion.div
      initial={{ y: 12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="p-4 rounded-2xl bg-card/90 backdrop-blur-md shadow-soft border border-white/5"
    >
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1">
          <h3 className="text-base font-semibold leading-5">{task.title}</h3>
          <p className="text-subtle text-xs mt-1">Reward: <span className="text-text font-medium">${task.reward.toFixed(2)}</span></p>
        </div>
        <span className={clsx(
          "px-2 py-1 rounded-xl text-[10px] uppercase tracking-wide",
          completed ? 'bg-green-500/15 text-green-300' : 'bg-yellow-500/15 text-yellow-200'
        )}>
          {completed ? 'Completed' : 'Pending'}
        </span>
      </div>

      <div className="flex gap-2 mt-4">
        <a
          href={task.link}
          target="_blank"
          className="group flex-1 text-center py-2 rounded-xl bg-[#121826] hover:bg-[#0f1623] transition border border-white/5"
        >
          <span className="inline-flex items-center gap-1 justify-center">
            Open Task Link <ExternalLink size={14} className="opacity-70 group-hover:translate-x-0.5 transition" />
          </span>
        </a>
        <button
          disabled={completed || loading}
          onClick={() => setOpen(true)}
          className={clsx(
            "px-4 py-2 rounded-xl font-medium flex items-center gap-2",
            completed ? 'bg-[#1f2937] text-subtle' : 'bg-accent text-black shadow-glow'
          )}
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
          Enter Code
        </button>
      </div>

      {open && !completed && (
        <div className="mt-3 p-3 bg-[#0f1623] rounded-xl border border-[#1f2937]">
          <label className="text-sm text-subtle">Paste the code you saw on the destination page</label>
          <div className="flex gap-2 mt-2">
            <input
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="e.g., 1212"
              className="flex-1 bg-[#0b0f17] rounded-xl px-3 py-2 outline-none border border-[#1f2937]"
            />
            <button
              onClick={() => { onVerify(task.id, code); setOpen(false); setCode('') }}
              className="px-4 py-2 rounded-xl bg-accent text-black shadow-glow"
            >
              Submit
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
