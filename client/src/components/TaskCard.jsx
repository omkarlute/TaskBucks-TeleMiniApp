
import React, { useState } from 'react'

export default function TaskCard({ task, onVerify }) {
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')

  const completed = task.status === 'completed'

  return (
    <div className="bg-card border border-white/5 rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium">{task.title}</div>
          <div className="text-sm text-muted">{task.description}</div>
        </div>
        <div className="text-right">
          <div className="text-sm text-muted">Reward</div>
          <div className="text-lg font-semibold">{task.reward}</div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <a
          href={task.url}
          target="_blank"
          rel="noreferrer noopener"
          className={`px-4 py-2 rounded-xl text-sm border border-soft ${completed ? 'pointer-events-none opacity-50' : ''}`}
          onClick={(e) => { if (completed) e.preventDefault() }}
        >
          Open Link
        </a>

        <button
          className={`px-4 py-2 rounded-xl text-sm ${completed ? 'bg-green-500/20 text-green-400' : 'bg-white text-black'}`}
          onClick={() => setOpen(o => !o)}
          disabled={completed}
        >
          {completed ? 'Completed' : (open ? 'Hide Code' : 'Enter Code')}
        </button>
      </div>

      {!completed && open && (
        <div className="mt-3 flex items-center gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter code here"
            className="flex-1 bg-surface border border-soft rounded-xl px-3 py-2 outline-none text-sm"
          />
          <button
            className="px-4 py-2 rounded-xl bg-[rgb(var(--accent))] text-black"
            onClick={() => { onVerify(task.id, code); setCode(''); setOpen(false) }}
          >Submit</button>
        </div>
      )}
    </div>
  )
}
