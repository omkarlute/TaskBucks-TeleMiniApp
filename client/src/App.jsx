import React, { useEffect, useMemo, useState } from 'react'
import WebApp from '@twa-dev/sdk'
import axios from 'axios'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Toaster, toast } from 'react-hot-toast'

import Header from './components/Header.jsx'
import BalanceCard from './components/BalanceCard.jsx'
import TaskCard from './components/TaskCard.jsx'
import WithdrawModal from './components/WithdrawModal.jsx'
import ReferralCard from './components/ReferralCard.jsx'
import ReferralView from './components/ReferralView.jsx'
import { Skeleton } from './components/Skeleton.jsx'

const API_BASE = import.meta.env.VITE_API_BASE || '/api'

function useClient() {
  return useMemo(() => {
    let ref = null
    try {
      const url = new URL(window.location.href)
      ref = url.searchParams.get('ref') || url.searchParams.get('referrer') || null
    } catch {}

    const headers = {
      // ✅ pass real Telegram init data (only works inside Telegram Mini App)
     'x-telegram-init-data': WebApp.initData || window.Telegram?.WebApp?.initData || ''

    }
    if (ref) headers['x-referrer'] = ref

    return axios.create({
      baseURL: API_BASE,
      headers
    })
  }, [])
}

function useMe() {
  const client = useClient()
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => (await client.get('/me')).data.user
  })
}

function useReferrals() {
  const client = useClient()
  return useQuery({
    queryKey: ['referrals'],
    queryFn: async () => (await client.get('/referrals')).data
  })
}

function useTasks() {
  const client = useClient()
  return useQuery({
    queryKey: ['tasks'],
    queryFn: async () => (await client.get('/tasks')).data.tasks
  })
}
export default function App() {
  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const client = useClient()
  const qc = useQueryClient()
  const [tab, setTab] = useState('tasks')

  const { data: me, isLoading: meLoading } = useMe()
  const { data: tasks, isLoading: tasksLoading } = useTasks()
  const { data: referral, isLoading: refLoading } = useReferrals()

  const verifyTask = useMutation({
    mutationFn: async ({ id, code }) =>
     (await client.post(`/tasks/${id}/verify`, { code })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me'] })
      qc.invalidateQueries({ queryKey: ['tasks'] })
      toast.success('Task verified! Reward added.')
    },
    onError: (err) => {
      const msg = err?.response?.data?.error || 'Incorrect code'
      toast.error(msg)
    }
  })

  const withdraw = useMutation({
    mutationFn: async ({ method, details }) =>
    (await client.post('/withdraw', { method, details })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me'] })
      setWithdrawOpen(false)
      toast.success('Withdrawal requested! Processing soon.')
    },
    onError: (err) => {
      const msg = err?.response?.data?.error || 'Error'
      toast.error(msg)
    }
  })

  useEffect(() => {
    try {
      WebApp.ready()
      WebApp.expand()
    } catch {}
  }, [])

  const balance = me?.balance || 0
  const eligible = balance >= 5

  return (
    <div className="min-h-[100dvh]">
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0b0f17] to-[#0b0f17]" />
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-accent/10 blur-[120px]" />
      </div>

      <div className="max-w-xl mx-auto p-4 space-y-4">
        <Header />

        {/* Tabs */}
        <div className="flex gap-2 mt-1">
          <button
            onClick={() => setTab('tasks')}
            className={`flex-1 py-2 rounded-xl ${
              tab === 'tasks'
                ? 'bg-accent text-black'
                : 'bg-[#121826] text-subtle'
            }`}
          >
            Tasks
          </button>
          <button
            onClick={() => setTab('referrals')}
            className={`flex-1 py-2 rounded-xl ${
              tab === 'referrals'
                ? 'bg-accent text-black'
                : 'bg-[#121826] text-subtle'
            }`}
          >
            Referrals
          </button>
        </div>

        {tab === 'tasks' ? (
          <>
            {meLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-28 rounded-2xl" />
              </div>
            ) : (
              <>
                <BalanceCard
                  balance={balance}
                  onWithdrawClick={() => setWithdrawOpen(true)}
                />
                <div className="mt-3" />
                <ReferralCard me={me} referral={referral} />
              </>
            )}

            <section className="space-y-2 mt-4">
              <h2 className="text-lg font-semibold">Tasks</h2>
              {tasksLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-28 rounded-2xl" />
                  <Skeleton className="h-28 rounded-2xl" />
                  <Skeleton className="h-28 rounded-2xl" />
                </div>
              ) : tasks?.length ? (
                tasks.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    onVerify={(id, code) => verifyTask.mutate({ id, code })}
                    loading={verifyTask.isPending}
                  />
                ))
              ) : (
                <div className="p-4 rounded-2xl bg-card/90 border border-white/5">
                  No tasks available
                </div>
              )}
            </section>
          </>
        ) : (
          <>
            {meLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-28 rounded-2xl" />
              </div>
            ) : (
              <ReferralView me={me} referral={referral} />
            )}
          </>
        )}

        <WithdrawModal
          open={withdrawOpen}
          onClose={() => setWithdrawOpen(false)}
          onSubmit={(method, details) =>
            withdraw.mutate({ method, details })
          }
          eligible={eligible}
        />

        <footer className="py-6 text-center text-subtle text-xs">
          © {new Date().getFullYear()} Task-to-Earn • Not affiliated with Linkvertise
        </footer>
      </div>

      <Toaster position="top-center" />
    </div>
  )
}
