import React, { useEffect, useMemo, useState } from 'react'
import WebApp from '@twa-dev/sdk'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Toaster, toast } from 'react-hot-toast'
import { motion } from 'framer-motion'
import useClient from './useClient.js'
import TaskCard from './components/TaskCard.jsx'
import ReferralCard from './components/ReferralCard.jsx'
import WithdrawModal from './components/WithdrawModal.jsx'
import WithdrawHistory from './components/WithdrawHistory.jsx'
import LoadingOverlay from './components/LoadingOverlay.jsx'

const BOT_USERNAME = import.meta.env.VITE_BOT_USERNAME || ''

// Inline icons (lightweight bundle)
const PlayIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M8 5v14l11-7-11-7z"></path>
  </svg>
)
const SparkleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2l1.8 4.8L18 8.6l-4.2 1.8L12 15l-1.8-4.6L6 8.6l4.2-1.8L12 2zm6 10l1.2 3.2L22 16l-2.8.8L18 20l-1.2-3.2L14 16l2.8-.8L18 12zM4 12l1 2.6L8 16l-3 .8L4 20l-1-3.2L0 16l3-1.4L4 12z"></path>
  </svg>
)

export default function App() {
  const api = useClient()
  const qc = useQueryClient()
  const [tab, setTab] = useState('tasks')
  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const [hideCompleted, setHideCompleted] = useState(false)

  // Telegram init
  useEffect(() => {
    try {
      WebApp.ready()
      WebApp.expand()
      WebApp.setHeaderColor('secondary_bg_color')
      WebApp.setBackgroundColor('#070b11')
    } catch {}
  }, [])

  const { data: me, isLoading: meLoading } = useQuery({
    queryKey: ['me'],
    queryFn: async () => (await api.get('/me')).data
  })

  const { data: tasksData, isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => (await api.get('/tasks')).data
  })

  const { data: refs, isLoading: refLoading } = useQuery({
    queryKey: ['referrals'],
    queryFn: async () => (await api.get('/referrals')).data
  })

  const verify = useMutation({
    mutationFn: async ({ id, code }) => (await api.post(`/tasks/${id}/verify`, { code })).data,
    onSuccess: () => {
      toast.success('Task completed! Reward added.')
      qc.invalidateQueries({ queryKey: ['me'] })
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['referrals'] })
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error || 'Verification failed')
    }
  })

  const balance = useMemo(() => Number(me?.user?.balance || 0), [me])

  // Filter tasks
  const tasks = useMemo(() => {
    if (!tasksData?.tasks) return []
    const list = Array.isArray(tasksData.tasks) ? tasksData.tasks.slice() : []
    if (hideCompleted) return list.filter(task => task.status !== 'completed')
    return list.sort((a, b) => {
      if (a.status === 'completed' && b.status !== 'completed') return 1
      if (a.status !== 'completed' && b.status === 'completed') return -1
      return 0
    })
  }, [tasksData, hideCompleted])

  return (
    <div className="min-h-screen max-w-md mx-auto pb-28">
      <header className="sticky top-0 z-40 backdrop-blur bg-[#070b11]/70 border-b border-white/5">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              transition={{ duration: 0.4 }}
              className="w-8 h-8 rounded-xl bg-white text-black grid place-items-center font-bold shadow-lg"
            >
              T
            </motion.div>
            <div>
              <div className="text-sm text-muted">Welcome</div>
              <div className="font-semibold">{me?.user?.first_name || me?.user?.username || 'Guest'}</div>
            </div>
          </div>
        </div>

        {/* Referral banner */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-md mx-auto px-4"
        >
          <div className="relative overflow-hidden rounded-2xl p-[1px] bg-gradient-to-r from-cyan-400 via-sky-500 to-blue-600 shadow-[0_0_24px_rgba(56,189,248,0.25)]">
            <div className="rounded-2xl bg-[#0a0f17]/80 backdrop-blur-xl p-4 flex items-center gap-4">
              <div className="shrink-0 h-10 w-10 rounded-xl bg-gradient-to-br from-white to-white/80 text-black grid place-items-center shadow-md">
                <SparkleIcon />
              </div>
              <div className="min-w-0">
                <div className="font-semibold leading-tight">Invite friends — earn more</div>
                <div className="text-sm opacity-90 truncate">
                  Lifetime 5% from their completed tasks. It pays to be early.
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setTab('referrals')}
                className="ml-auto shrink-0 px-3 py-2 rounded-xl bg-white text-black text-sm font-medium shadow hover:opacity-90 active:opacity-80"
              >
                Refer
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="max-w-md mx-auto px-2 pb-2 pt-3">
          <div className="grid grid-cols-3 gap-2 p-1 rounded-2xl bg-white/5">
            {['tasks','referrals','wallet'].map(t => (
              <motion.button
                key={t}
                whileTap={{ scale: 0.95 }}
                onClick={() => setTab(t)}
                className={`py-2 rounded-xl text-sm font-medium transition ${
                  tab===t ? 'bg-white text-black shadow' : 'text-white/70 hover:text-white'
                }`}
              >
                {t==='tasks' ? 'Tasks' : t==='referrals' ? 'Referrals' : 'Wallet'}
              </motion.button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-4">
        {/* Balance card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-card border border-white/5 rounded-2xl p-4 shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-muted text-sm">Available Balance</div>
              <div className="text-3xl font-semibold">${balance.toFixed(2)}</div>
            </div>
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(56,189,248,0.6)' }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setWithdrawOpen(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-black font-semibold shadow text-sm"
            >
              Withdraw
            </motion.button>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="px-2 py-1 rounded-lg bg-yellow-400/10 text-yellow-300 text-xs font-medium">
              New tasks every 24h
            </span>
            <span className="text-xs text-muted">Completed tasks move below (toggle to hide).</span>
          </div>
        </motion.div>

        {tab === 'tasks' && (
          <>
            {/* Toggle row */}
            <div className="mt-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted">Complete tasks to earn rewards.</div>
                <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                  <input type="checkbox" checked={hideCompleted} onChange={e => setHideCompleted(e.target.checked)} />
                  Hide completed
                </label>
              </div>

              {/* Watch tutorial CTA */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-3"
              >
                <a
                  href="https://www.youtube.com/watch?v=MYeLjYrGJXY"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="group inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium
                             bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 text-white shadow-lg
                             hover:opacity-95 active:opacity-90 transition"
                >
                  <span className="grid place-items-center rounded-lg h-6 w-6 bg-black/10">
                    <PlayIcon />
                  </span>
                  <span>Watch tutorial</span>
                  <span className="opacity-60 group-hover:translate-x-0.5 transition">→</span>
                </a>
              </motion.div>
            </div>

            {/* Tasks */}
            <div className="mt-3 space-y-3">
              {tasksLoading ? (
                <div className="h-28 bg-surface rounded-2xl border border-white/5 animate-pulse" />
              ) : (
                tasks?.length ? tasks.map(t => (
                  <TaskCard key={t.id} task={t} onVerify={(id, code) => verify.mutate({ id, code })} />
                )) : (
                  <div className="text-center text-muted py-8">
                    {hideCompleted ? 'All tasks completed! Check back for new ones.' : 'No tasks right now. Check back later!'}
                  </div>
                )
              )}
            </div>
          </>
        )}

        {tab === 'referrals' && (
          <div className="mt-4">
            <ReferralCard data={refs} loading={refLoading} />
          </div>
        )}

        {tab === 'wallet' && (
          <div className="mt-4">
            <WithdrawHistory />
          </div>
        )}
      </main>

      <Toaster position="top-center" />
      {withdrawOpen && <WithdrawModal onClose={() => setWithdrawOpen(false)} />}
      <LoadingOverlay active={(meLoading || tasksLoading)} />
    </div>
  )
}
