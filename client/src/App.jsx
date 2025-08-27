import React, { useEffect, useMemo, useState } from 'react'
import WebApp from '@twa-dev/sdk'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Toaster, toast } from 'react-hot-toast'
import useClient from './useClient.js'
import TaskCard from './components/TaskCard.jsx'
import ReferralCard from './components/ReferralCard.jsx'
import WithdrawModal from './components/WithdrawModal.jsx'
import WithdrawHistory from './components/WithdrawHistory.jsx'

const BOT_USERNAME = import.meta.env.VITE_BOT_USERNAME || ''

export default function App() {
  const api = useClient()
  const qc = useQueryClient()
  const [tab, setTab] = useState('tasks')
  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const [hideCompleted, setHideCompleted] = useState(false)

  // Initialize Telegram theme + viewport
  useEffect(() => {
    try {
      WebApp.ready()
      WebApp.expand()
      WebApp.setHeaderColor('secondary_bg_color')
      WebApp.setBackgroundColor('#070b11')
    } catch (e) {
      // ignore if not running in Telegram environment
      // console.warn('Telegram WebApp init failed', e)
    }
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
    onSuccess: (data) => {
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

  // Filter tasks based on hideCompleted toggle
  const tasks = useMemo(() => {
    if (!tasksData?.tasks) return []

    const list = Array.isArray(tasksData.tasks) ? tasksData.tasks.slice() : []

    if (hideCompleted) {
      return list.filter(task => task.status !== 'completed')
    }

    // Sort completed tasks to the bottom without mutating original
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
            <div className="w-8 h-8 rounded-xl bg-white text-black grid place-items-center font-bold">T</div>
            <div>
              <div className="text-sm text-muted">Welcome</div>
              <div className="font-semibold">{me?.user?.first_name || me?.user?.username || 'Guest'}</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-md mx-auto px-2 pb-2">
          <div className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white p-3 rounded-2xl mb-3 flex items-center justify-between">
            <div>
              <div className="font-semibold">Invite friends — Earn more</div>
              <div className="text-sm opacity-90">Share your referral link and get lifetime bonuses when they complete tasks.</div>
            </div>
            <button onClick={() => setTab('referrals')} className="px-3 py-2 bg-white text-black rounded-xl">Refer</button>
          </div>

          <div className="grid grid-cols-3 gap-2 p-1 rounded-2xl bg-white/5">
            {['tasks','referrals','wallet'].map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`py-2 rounded-xl text-sm ${tab===t ? 'bg-white text-black' : 'text-white/70'}`}
              >
                {t==='tasks' ? 'Tasks' : t==='referrals' ? 'Referrals' : 'Wallet'}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-4">
        {/* Balance card + reminder pill */}
        <div className="bg-card border border-white/5 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-muted text-sm">Available Balance</div>
              <div className="text-3xl font-semibold">${balance.toFixed(2)}</div>
            </div>
            <button
              onClick={() => setWithdrawOpen(true)}
              className="px-4 py-2 rounded-xl bg-[rgb(var(--accent))] text-black shadow-glow text-sm"
            >Withdraw</button>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="badge badge-gold">New tasks every 24h</span>
            <span className="text-xs text-muted">Completed tasks move below (toggle to hide).</span>
          </div>
        </div>

        {tab === 'tasks' && (
          <>
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-muted">Complete tasks to earn rewards.</div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={hideCompleted} onChange={e => setHideCompleted(e.target.checked)} />
                Hide completed
              </label>
            </div>

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
    </div>
  )
}
