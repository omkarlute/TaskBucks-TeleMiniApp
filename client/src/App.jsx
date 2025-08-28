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
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="transition-transform group-hover:scale-110">
    <path d="M8 5v14l11-7-11-7z"></path>
  </svg>
)
const SparkleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="animate-pulse">
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
    queryFn: async () => (await api.get('/tasks')).data,
    enabled: !!me && !meLoading
  })

  const { data: refs, isLoading: refLoading } = useQuery({
    queryKey: ['referrals'],
    queryFn: async () => (await api.get('/referrals')).data,
    enabled: !!me && !meLoading
  })

  const verify = useMutation({
    mutationFn: async ({ id, code }) => (await api.post(`/tasks/${id}/verify`, { code })).data,
    onSuccess: () => {
      toast.success('Task completed! Reward added.', {
        style: {
          background: 'linear-gradient(135deg, #10B981, #059669)',
          color: 'white',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '16px',
          backdropFilter: 'blur(16px)'
        }
      })
      qc.invalidateQueries({ queryKey: ['me'] })
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['referrals'] })
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error || 'Verification failed', {
        style: {
          background: 'linear-gradient(135deg, #EF4444, #DC2626)',
          color: 'white',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '16px',
          backdropFilter: 'blur(16px)'
        }
      })
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
    <div className="min-h-screen max-w-md mx-auto pb-28 bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white relative overflow-hidden">
      {/* Premium animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-500/5 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      <header className="sticky top-0 z-40 backdrop-blur-2xl bg-[#070b11]/80 border-b border-white/10 shadow-2xl">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              transition={{ duration: 0.4 }}
              className="w-10 h-10 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 text-white grid place-items-center font-bold shadow-lg transform transition-transform hover:scale-105"
            >
              T
            </motion.div>
            <div>
              <div className="text-sm text-gray-400">Welcome back</div>
              <div className="font-bold text-lg bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                {me?.user?.first_name || me?.user?.username || 'Guest'}
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced referral banner */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-md mx-auto px-4 mb-4"
        >
          <div className="relative overflow-hidden rounded-3xl">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-sky-500 to-blue-600 opacity-90"></div>
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-20"></div>
            
            <div className="relative bg-[#0a0f17]/90 backdrop-blur-xl border border-white/10 rounded-3xl p-5 m-[1px]">
              <div className="flex items-center gap-4">
                <div className="shrink-0 h-12 w-12 rounded-2xl bg-gradient-to-br from-white to-white/90 text-black grid place-items-center shadow-lg">
                  <SparkleIcon />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-lg leading-tight text-white">Invite friends — earn more</div>
                  <div className="text-sm opacity-90 truncate text-white/80">
                    Lifetime 5% from their completed tasks. It pays to be early.
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05, boxShadow: '0 8px 32px rgba(255,255,255,0.25)' }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setTab('referrals')}
                  className="ml-auto shrink-0 px-4 py-2.5 rounded-2xl bg-white text-black text-sm font-bold shadow-xl transform transition-all duration-200 hover:shadow-white/25"
                >
                  Refer
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Premium tabs */}
        <div className="max-w-md mx-auto px-4 pb-4 pt-2">
          <div className="relative p-1 rounded-3xl bg-gray-800/40 backdrop-blur-sm border border-white/10 shadow-2xl">
            <div className="grid grid-cols-3 gap-1 relative">
              {['tasks','referrals','wallet'].map(t => (
                <motion.button
                  key={t}
                  whileTap={{ scale: 0.95 }}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => setTab(t)}
                  className={`relative py-3 px-4 text-sm font-bold transition-all duration-300 rounded-2xl ${
                    tab===t 
                      ? 'bg-gradient-to-r from-white to-gray-100 text-black shadow-2xl transform scale-105' 
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {t==='tasks' ? '🎯 Tasks' : t==='referrals' ? '👥 Referrals' : '💰 Wallet'}
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-4 relative z-10">
        {/* Premium balance card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-3xl mb-6"
        >
          {/* Glowing border effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 via-orange-500/20 to-red-500/20 blur-xl"></div>
          
          <div className="relative bg-gray-900/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-2xl">
            {/* Floating orbs */}
            <div className="absolute -top-4 -right-4 w-20 h-20 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-full blur-2xl animate-pulse"></div>
            <div className="absolute -bottom-6 -left-6 w-16 h-16 bg-gradient-to-r from-blue-400/20 to-cyan-400/20 rounded-full blur-2xl animate-pulse delay-1000"></div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-gray-400 text-sm mb-2">Available Balance</div>
                  <div className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                    ${balance.toFixed(2)}
                  </div>
                </div>
                <motion.button
                  whileHover={{ 
                    scale: 1.05, 
                    boxShadow: '0 20px 40px rgba(16, 185, 129, 0.4)',
                    y: -2
                  }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setWithdrawOpen(true)}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold shadow-xl shadow-green-500/25 transform transition-all duration-200"
                >
                  Withdraw
                </motion.button>
              </div>
              
              <div className="flex items-center gap-3">
                <span className="px-3 py-1.5 rounded-xl bg-yellow-400/20 border border-yellow-400/30 text-yellow-400 text-sm font-semibold">
                  ⭐ New tasks every 24h
                </span>
                <span className="text-xs text-gray-500">Completed tasks move below (toggle to hide).</span>
              </div>
            </div>
          </div>
        </motion.div>

        {tab === 'tasks' && (
          <>
            {/* Enhanced toggle row */}
            <div className="mt-4 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-gray-400">Complete tasks to earn rewards.</div>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={hideCompleted} 
                    onChange={e => setHideCompleted(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-12 h-6 rounded-full transition-all duration-300 ${
                    hideCompleted ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-gray-700'
                  }`}>
                    <div className={`w-5 h-5 rounded-full bg-white transition-all duration-300 transform ${
                      hideCompleted ? 'translate-x-7' : 'translate-x-0.5'
                    } translate-y-0.5 shadow-lg`}></div>
                  </div>
                  <span className="text-sm text-gray-400 group-hover:text-white transition-colors">
                    Hide completed
                  </span>
                </label>
              </div>

              {/* Premium watch tutorial CTA */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <a
                  href="https://www.youtube.com/watch?v=MYeLjYrGJXY"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="group inline-flex items-center gap-3 rounded-2xl px-6 py-4 text-sm font-bold
                             bg-gradient-to-r from-red-500 via-pink-500 to-purple-500 text-white shadow-2xl
                             hover:shadow-red-500/25 transition-all duration-300 transform hover:scale-105 active:scale-95"
                >
                  <span className="grid place-items-center rounded-xl h-8 w-8 bg-white/20 backdrop-blur-sm">
                    <PlayIcon />
                  </span>
                  <span>Watch tutorial</span>
                  <span className="opacity-70 group-hover:translate-x-1 transition-transform">→</span>
                </a>
              </motion.div>
            </div>

            {/* Tasks */}
            <div className="space-y-4">
              {tasksLoading ? (
                <div className="h-32 bg-gray-800/40 rounded-3xl animate-pulse border border-white/5" />
              ) : (
                tasks?.length ? tasks.map(t => (
                  <TaskCard key={t.id} task={t} onVerify={(id, code) => verify.mutate({ id, code })} />
                )) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                      <SparkleIcon />
                    </div>
                    <div className="text-gray-400 text-lg mb-2">
                      {hideCompleted ? 'All tasks completed! 🎉' : 'No tasks right now'}
                    </div>
                    <div className="text-gray-500 text-sm">Check back later for new opportunities</div>
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

      <Toaster 
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: '16px',
            backdropFilter: 'blur(16px)',
            fontSize: '14px',
            fontWeight: '600'
          }
        }}
      />
      
      {withdrawOpen && <WithdrawModal onClose={() => setWithdrawOpen(false)} />}
      <LoadingOverlay active={(meLoading || tasksLoading)} />

      <style jsx>{`
        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient-x {
          background-size: 200% 200%;
          animation: gradient-x 3s ease infinite;
        }
      `}</style>
    </div>
  )
}