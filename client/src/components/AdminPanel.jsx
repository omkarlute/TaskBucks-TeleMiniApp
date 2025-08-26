
import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import useClient from '../useClient.js'
import { toast } from 'react-hot-toast'

export default function AdminPanel() {
  const client = useClient()
  const qc = useQueryClient()
  const [creds, setCreds] = useState({ username: '', password: '' })
  const [task, setTask] = useState({ title:'', link:'', reward:'', code:'' })
  const [loggedIn, setLoggedIn] = useState(false)

  // Check session by calling a protected endpoint
  const session = useQuery({
    queryKey: ['admin_session'],
    queryFn: async () => {
      try {
        // a lightweight protected call
        await client.get('/admin/tasks')
        setLoggedIn(true)
        return { ok: true }
      } catch (e) {
        setLoggedIn(false)
        throw e
      }
    },
    retry: false
  })

  const login = useMutation({
    mutationFn: async () => (await client.post('/admin/login', creds)).data,
    onSuccess: () => { toast.success('Logged in'); setLoggedIn(true); qc.invalidateQueries({ queryKey: ['admin_tasks','admin_session'] }) },
    onError: (e) => toast.error(e?.response?.data?.error || 'Login failed')
  })

  const logout = useMutation({
    mutationFn: async () => (await client.post('/admin/logout')).data,
    onSuccess: () => { toast.success('Logged out'); setLoggedIn(false); qc.invalidateQueries({ queryKey: ['admin_tasks','admin_session'] }) },
    onError: () => toast.error('Logout failed')
  })

  const tasks = useQuery({
    enabled: loggedIn,
    queryKey: ['admin_tasks'],
    queryFn: async () => (await client.get('/admin/tasks')).data.tasks || []
  })

  const createTask = useMutation({
    mutationFn: async () => (await client.post('/admin/tasks', { ...task, reward: parseFloat(task.reward) })).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin_tasks'] }); setTask({ title:'', link:'', reward:'', code:'' }); toast.success('Task created'); },
    onError: (e) => toast.error(e?.response?.data?.error || 'Failed')
  })

  if (!loggedIn) {
    return (
      <div className="bg-[#0b0f17] rounded-2xl p-4 border border-[#1f2937]">
        <h2 className="text-lg font-semibold mb-3">Admin Login</h2>
        <div className="space-y-2">
          <input className="w-full px-3 py-2 rounded-xl bg-[#0b0f17] border border-[#1f2937]" placeholder="Username" value={creds.username} onChange={e=>setCreds({...creds, username:e.target.value})} />
          <input className="w-full px-3 py-2 rounded-xl bg-[#0b0f17] border border-[#1f2937]" type="password" placeholder="Password" value={creds.password} onChange={e=>setCreds({...creds, password:e.target.value})} />
          <button onClick={()=>login.mutate()} className="w-full px-4 py-2 rounded-xl bg-accent text-black shadow-glow">Login</button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-[#0b0f17] rounded-2xl p-4 border border-[#1f2937]">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Admin Panel</h2>
          <button onClick={()=>logout.mutate()} className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-sm">Logout</button>
        </div>
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          <input className="px-3 py-2 rounded-xl bg-[#0b0f17] border border-[#1f2937]" placeholder="Title" value={task.title} onChange={e=>setTask({...task, title:e.target.value})} />
          <input className="px-3 py-2 rounded-xl bg-[#0b0f17] border border-[#1f2937]" placeholder="Link" value={task.link} onChange={e=>setTask({...task, link:e.target.value})} />
          <input className="px-3 py-2 rounded-xl bg-[#0b0f17] border border-[#1f2937]" placeholder="Reward" type="number" value={task.reward} onChange={e=>setTask({...task, reward:e.target.value})} />
          <input className="px-3 py-2 rounded-xl bg-[#0b0f17] border border-[#1f2937]" placeholder="Completion Code" value={task.code} onChange={e=>setTask({...task, code:e.target.value})} />
          <button onClick={()=>createTask.mutate()} className="px-4 py-2 rounded-xl bg-accent text-black shadow-glow">Add Task</button>
        </div>
      </div>

      <div className="bg-[#0b0f17] rounded-2xl p-4 border border-[#1f2937]">
        <h3 className="font-medium mb-2">All Tasks</h3>
        {tasks.isLoading ? <div className="text-subtle text-sm">Loading…</div> : (
          <div className="space-y-2">
            {tasks.data?.map(t => (
              <div key={t.id} className="p-3 rounded-xl bg-white/5">
                <div className="font-medium">{t.title}</div>
                <div className="text-xs text-subtle break-all">{t.link}</div>
                <div className="text-xs text-subtle">Reward: {t.reward}</div>
                <div className="text-xs text-subtle">Active: {String(t.active)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
