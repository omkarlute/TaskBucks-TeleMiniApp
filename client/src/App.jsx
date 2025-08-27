import React, { useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Toaster, toast } from 'react-hot-toast'

// Mock WebApp and API for demonstration
const WebApp = {
  ready: () => {},
  expand: () => {},
  setHeaderColor: () => {},
  setBackgroundColor: () => {}
}

const useClient = () => ({
  get: async (url) => {
    // Mock API responses
    if (url === '/me') return { data: { user: { first_name: 'Alex', balance: '247.85' } } }
    if (url === '/tasks') return { 
      data: { 
        tasks: [
          { id: 1, title: 'Follow @CryptoNews', description: 'Follow our official Telegram channel', reward: 5.0, status: 'pending', type: 'telegram' },
          { id: 2, title: 'Join Discord Server', description: 'Join our community Discord', reward: 8.0, status: 'pending', type: 'discord' },
          { id: 3, title: 'Share on Twitter', description: 'Share our latest post on X/Twitter', reward: 12.0, status: 'completed', type: 'twitter' },
          { id: 4, title: 'Watch YouTube Video', description: 'Watch and like our tutorial video', reward: 15.0, status: 'pending', type: 'youtube' },
          { id: 5, title: 'Invite 3 Friends', description: 'Refer 3 friends to earn bonus', reward: 25.0, status: 'pending', type: 'referral' }
        ] 
      } 
    }
    if (url === '/referrals') return { 
      data: { 
        referral_code: 'ALEX2024',
        total_referrals: 12,
        total_earned: 89.50,
        referrals: [
          { name: 'John', earned: 25.0, date: '2024-08-20' },
          { name: 'Sarah', earned: 32.50, date: '2024-08-18' }
        ]
      } 
    }
    return { data: {} }
  },
  post: async () => ({ data: { success: true } })
})

// Premium Icons with micro-animations
const PlayIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="transition-transform group-hover:scale-110">
    <path d="M8 5v14l11-7-11-7z"></path>
  </svg>
)

const SparkleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="animate-pulse">
    <path d="M12 2l1.8 4.8L18 8.6l-4.2 1.8L12 15l-1.8-4.6L6 8.6l4.2-1.8L12 2zm6 10l1.2 3.2L22 16l-2.8.8L18 20l-1.2-3.2L14 16l2.8-.8L18 12zM4 12l1 2.6L8 16l-3 .8L4 20l-1-3.2L0 16l3-1.4L4 12z"></path>
  </svg>
)

const TelegramIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
  </svg>
)

const DiscordIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.010c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
  </svg>
)

const TwitterIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/>
  </svg>
)

const YoutubeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
)

const UsersIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
    <path d="M20 9a3 3 0 11-6 0 3 3 0 016 0zM22 18h-2a5 5 0 00-4-4.9"/>
  </svg>
)

// Premium Task Card Component
const TaskCard = ({ task, onVerify }) => {
  const [isHovered, setIsHovered] = useState(false)
  const [code, setCode] = useState('')
  
  const getTaskIcon = () => {
    switch (task.type) {
      case 'telegram': return <TelegramIcon />
      case 'discord': return <DiscordIcon />
      case 'twitter': return <TwitterIcon />
      case 'youtube': return <YoutubeIcon />
      case 'referral': return <UsersIcon />
      default: return <SparkleIcon />
    }
  }

  const getGradient = () => {
    switch (task.type) {
      case 'telegram': return 'from-blue-500 to-cyan-500'
      case 'discord': return 'from-indigo-500 to-purple-500'
      case 'twitter': return 'from-black to-gray-700'
      case 'youtube': return 'from-red-500 to-pink-500'
      case 'referral': return 'from-green-500 to-emerald-500'
      default: return 'from-purple-500 to-pink-500'
    }
  }

  return (
    <div 
      className={`group relative overflow-hidden rounded-3xl transition-all duration-500 transform ${
        isHovered ? 'scale-[1.02] shadow-2xl' : 'hover:scale-[1.01]'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Animated gradient border */}
      <div className={`absolute inset-0 bg-gradient-to-r ${getGradient()} opacity-20 blur-xl transition-opacity duration-500 ${
        isHovered ? 'opacity-40' : ''
      }`}></div>
      
      {/* Glass morphism card */}
      <div className="relative bg-gray-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 overflow-hidden">
        {/* Floating orbs animation */}
        <div className="absolute -top-4 -right-4 w-20 h-20 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-full blur-2xl animate-pulse"></div>
        <div className="absolute -bottom-6 -left-6 w-16 h-16 bg-gradient-to-r from-blue-400/20 to-cyan-400/20 rounded-full blur-2xl animate-pulse delay-1000"></div>
        
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl bg-gradient-to-r ${getGradient()} shadow-lg transform transition-transform group-hover:rotate-6`}>
                {getTaskIcon()}
              </div>
              <div>
                <h3 className="font-bold text-lg text-white group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-purple-400 group-hover:to-pink-400 group-hover:bg-clip-text transition-all duration-300">
                  {task.title}
                </h3>
                <p className="text-gray-400 text-sm mt-1">{task.description}</p>
              </div>
            </div>
            
            {task.status === 'completed' && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/20 border border-green-500/30">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                <span className="text-green-400 text-xs font-medium">Completed</span>
              </div>
            )}
          </div>

          {/* Reward section with premium styling */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="px-4 py-2 rounded-xl bg-gradient-to-r from-yellow-400/20 to-orange-400/20 border border-yellow-400/30">
                <span className="text-yellow-400 font-bold text-lg">${task.reward}</span>
              </div>
              {task.status !== 'completed' && (
                <div className="animate-bounce">
                  <SparkleIcon />
                </div>
              )}
            </div>

            {task.status !== 'completed' && (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Enter code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-gray-800/60 border border-gray-700/50 text-white text-sm focus:border-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all"
                />
                <button
                  onClick={() => onVerify(task.id, code)}
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium text-sm transform transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-purple-500/25 active:scale-95"
                >
                  Verify
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Premium Referral Card
const ReferralCard = ({ data, loading }) => {
  const [copied, setCopied] = useState(false)
  
  const copyCode = () => {
    navigator.clipboard?.writeText(data?.referral_code || 'ALEX2024')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Main referral card with epic design */}
      <div className="relative overflow-hidden rounded-3xl">
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-pink-500 to-orange-500 opacity-90"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-20"></div>
        
        <div className="relative p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm mb-4">
              <UsersIcon />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Invite & Earn</h2>
            <p className="text-white/80">Get 5% lifetime commission from your referrals</p>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="text-center p-4 rounded-2xl bg-white/10 backdrop-blur-sm">
              <div className="text-2xl font-bold text-white">{data?.total_referrals || 12}</div>
              <div className="text-white/70 text-sm">Referrals</div>
            </div>
            <div className="text-center p-4 rounded-2xl bg-white/10 backdrop-blur-sm">
              <div className="text-2xl font-bold text-white">${data?.total_earned?.toFixed(2) || '89.50'}</div>
              <div className="text-white/70 text-sm">Earned</div>
            </div>
          </div>

          {/* Referral code */}
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-black/20 backdrop-blur-sm">
            <div className="flex-1">
              <div className="text-white/70 text-sm mb-1">Your referral code</div>
              <div className="font-mono text-lg font-bold text-white">{data?.referral_code || 'ALEX2024'}</div>
            </div>
            <button
              onClick={copyCode}
              className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 transform ${
                copied 
                  ? 'bg-green-500 text-white scale-105' 
                  : 'bg-white text-black hover:scale-105 hover:shadow-lg'
              }`}
            >
              {copied ? '✓ Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      </div>

      {/* Recent referrals with glass cards */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-white">Recent Referrals</h3>
        {data?.referrals?.map((ref, i) => (
          <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-gray-900/60 backdrop-blur-xl border border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                {ref.name[0]}
              </div>
              <div>
                <div className="font-medium text-white">{ref.name}</div>
                <div className="text-gray-400 text-sm">{ref.date}</div>
              </div>
            </div>
            <div className="text-green-400 font-semibold">+${ref.earned}</div>
          </div>
        )) || (
          <div className="text-center text-gray-400 py-8">No referrals yet</div>
        )}
      </div>
    </div>
  )
}

// Main App Component
export default function App() {
  const api = useClient()
  const qc = useQueryClient()
  const [tab, setTab] = useState('tasks')
  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const [hideCompleted, setHideCompleted] = useState(false)

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
      toast.success('🎉 Task completed! Reward added.', {
        style: { background: '#10B981', color: 'white' }
      })
      qc.invalidateQueries({ queryKey: ['me'] })
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['referrals'] })
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error || 'Verification failed', {
        style: { background: '#EF4444', color: 'white' }
      })
    }
  })

  const balance = useMemo(() => Number(me?.user?.balance || 247.85), [me])

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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white overflow-hidden">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-500/5 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      <div className="relative z-10 max-w-md mx-auto pb-28">
        {/* Premium Header */}
        <header className="sticky top-0 z-40 backdrop-blur-2xl bg-black/40 border-b border-white/5">
          {/* User section with glass morphism */}
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                    T
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-black animate-pulse"></div>
                </div>
                <div>
                  <div className="text-gray-400 text-sm">Welcome back</div>
                  <div className="font-bold text-xl bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                    {me?.user?.first_name || 'Alex'}
                  </div>
                </div>
              </div>
            </div>

            {/* Epic balance card */}
            <div className="relative overflow-hidden rounded-3xl mb-6">
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 via-orange-500/20 to-red-500/20"></div>
              <div className="relative bg-gray-900/60 backdrop-blur-xl border border-white/10 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-gray-400 text-sm mb-1">Available Balance</div>
                    <div className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                      ${balance.toFixed(2)}
                    </div>
                  </div>
                  <button
                    onClick={() => setWithdrawOpen(true)}
                    className="px-6 py-3 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold shadow-lg shadow-green-500/25 transform transition-all duration-200 hover:scale-105 hover:shadow-green-500/40 active:scale-95"
                  >
                    Withdraw
                  </button>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <div className="px-3 py-1 rounded-full bg-yellow-400/20 border border-yellow-400/30 text-yellow-400">
                    ⭐ New tasks daily
                  </div>
                  <div className="text-gray-500">•</div>
                  <div>Minimum withdrawal: $50</div>
                </div>
              </div>
            </div>

            {/* Premium referral highlight */}
            <div className="relative overflow-hidden rounded-3xl mb-6">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 animate-gradient-x"></div>
              <div className="relative bg-gray-900/80 backdrop-blur-xl border border-white/10 p-6 m-[1px] rounded-3xl">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-white to-gray-200 text-black flex items-center justify-center">
                    <SparkleIcon />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg mb-1">Invite Friends & Earn 5%</h3>
                    <p className="text-gray-400 text-sm">Lifetime commission on all their completed tasks</p>
                  </div>
                  <button
                    onClick={() => setTab('referrals')}
                    className="px-4 py-2 rounded-xl bg-white text-black font-semibold text-sm transform transition-all hover:scale-105 hover:shadow-lg active:scale-95"
                  >
                    Invite
                  </button>
                </div>
              </div>
            </div>

            {/* Premium tabs */}
            <div className="relative p-1 rounded-3xl bg-gray-800/40 backdrop-blur-sm border border-white/10">
              <div className="grid grid-cols-3 relative">
                {['tasks', 'referrals', 'wallet'].map((t, i) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`relative py-3 px-4 text-sm font-medium transition-all duration-300 rounded-2xl ${
                      tab === t 
                        ? 'text-black bg-white shadow-lg transform scale-105' 
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {t === 'tasks' ? '🎯 Tasks' : t === 'referrals' ? '👥 Referrals' : '💰 Wallet'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="px-6 pt-4">
          {tab === 'tasks' && (
            <div className="space-y-6">
              {/* Controls */}
              <div className="flex items-center justify-between">
                <div className="text-gray-400">Complete tasks to earn rewards</div>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={hideCompleted} 
                    onChange={e => setHideCompleted(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-12 h-6 rounded-full transition-all duration-300 ${
                    hideCompleted ? 'bg-purple-500' : 'bg-gray-700'
                  }`}>
                    <div className={`w-5 h-5 rounded-full bg-white transition-all duration-300 transform ${
                      hideCompleted ? 'translate-x-7' : 'translate-x-0.5'
                    } translate-y-0.5`}></div>
                  </div>
                  <span className="text-sm text-gray-400 group-hover:text-white transition-colors">
                    Hide completed
                  </span>
                </label>
              </div>

              {/* Tutorial button */}
              <div>
                <a
                  href="https://www.youtube.com/watch?v=MYeLjYrGJXY"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="group inline-flex items-center gap-3 px-6 py-4 rounded-2xl bg-gradient-to-r from-red-500 to-pink-500 text-white font-semibold shadow-lg shadow-red-500/25 transform transition-all duration-300 hover:scale-105 hover:shadow-red-500/40 active:scale-95"
                >
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                    <PlayIcon />
                  </div>
                  <span>Watch Tutorial</span>
                  <div className="transform transition-transform group-hover:translate-x-1">→</div>
                </a>
              </div>

              {/* Tasks list */}
              <div className="space-y-4">
                {tasksLoading ? (
                  Array.from({length: 3}).map((_, i) => (
                    <div key={i} className="h-32 bg-gray-800/40 rounded-3xl animate-pulse"></div>
                  ))
                ) : tasks?.length ? (
                  tasks.map(task => (
                    <TaskCard 
                      key={task.id} 
                      task={task} 
                      onVerify={(id, code) => verify.mutate({ id, code })} 
                    />
                  ))
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                      <SparkleIcon />
                    </div>
                    <div className="text-gray-400">
                      {hideCompleted ? 'All tasks completed! 🎉' : 'No tasks available right now'}
                    </div>
                    <div className="text-gray-500 text-sm mt-1">Check back later for new opportunities</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'referrals' && (
            <div className="space-y-6">
              <ReferralCard data={refs} loading={refLoading} />
            </div>
          )}

          {tab === 'wallet' && (
            <div className="space-y-6">
              {/* Wallet overview */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-6 rounded-3xl bg-gray-900/60 backdrop-blur-xl border border-white/10">
                  <div className="text-2xl font-bold text-green-400 mb-1">$247.85</div>
                  <div className="text-gray-400 text-sm">Available</div>
                </div>
                <div className="p-6 rounded-3xl bg-gray-900/60 backdrop-blur-xl border border-white/10">
                  <div className="text-2xl font-bold text-blue-400 mb-1">$156.20</div>
                  <div className="text-gray-400 text-sm">Withdrawn</div>
                </div>
              </div>

              {/* Recent withdrawals */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Recent Withdrawals</h3>
                <div className="space-y-3">
                  {[
                    { amount: '$50.00', date: '2024-08-25', status: 'Completed' },
                    { amount: '$75.00', date: '2024-08-20', status: 'Completed' },
                    { amount: '$31.20', date: '2024-08-15', status: 'Pending' }
                  ].map((withdrawal, i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-gray-900/60 backdrop-blur-xl border border-white/10">
                      <div>
                        <div className="font-semibold text-white">{withdrawal.amount}</div>
                        <div className="text-gray-400 text-sm">{withdrawal.date}</div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                        withdrawal.status === 'Completed' 
                          ? 'bg-green-500/20 border border-green-500/30 text-green-400' 
                          : 'bg-yellow-500/20 border border-yellow-500/30 text-yellow-400'
                      }`}>
                        {withdrawal.status}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Premium toast notifications */}
        <Toaster 
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              background: 'rgba(17, 24, 39, 0.9)',
              backdropFilter: 'blur(16px)',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              fontSize: '14px'
            }
          }}
        />

        {/* Withdraw Modal */}
        {withdrawOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setWithdrawOpen(false)}
            ></div>
            
            {/* Modal */}
            <div className="relative w-full max-w-sm bg-gray-900/90 backdrop-blur-xl rounded-3xl border border-white/10 p-6 transform transition-all duration-300 scale-100">
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Withdraw Funds</h2>
                <p className="text-gray-400">Minimum withdrawal amount is $50.00</p>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Amount</label>
                  <input 
                    type="number"
                    placeholder="Enter amount"
                    className="w-full px-4 py-3 rounded-2xl bg-gray-800/60 border border-gray-700/50 text-white focus:border-green-500/50 focus:outline-none focus:ring-2 focus:ring-green-500/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Payment Method</label>
                  <select className="w-full px-4 py-3 rounded-2xl bg-gray-800/60 border border-gray-700/50 text-white focus:border-green-500/50 focus:outline-none focus:ring-2 focus:ring-green-500/20 transition-all">
                    <option>PayPal</option>
                    <option>Bank Transfer</option>
                    <option>Crypto Wallet</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setWithdrawOpen(false)}
                  className="flex-1 px-6 py-3 rounded-2xl bg-gray-800/60 border border-gray-700/50 text-gray-300 font-medium transition-all hover:bg-gray-700/60"
                >
                  Cancel
                </button>
                <button className="flex-1 px-6 py-3 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold shadow-lg shadow-green-500/25 transition-all hover:scale-105 hover:shadow-green-500/40 active:scale-95">
                  Withdraw
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading overlay */}
        {(meLoading || tasksLoading) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-purple-500/20 border-t-purple-500 animate-spin"></div>
              <div className="text-white font-medium">Loading...</div>
            </div>
          </div>
        )}
      </div>

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