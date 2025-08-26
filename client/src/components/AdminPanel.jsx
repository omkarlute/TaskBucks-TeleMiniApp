import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import useClient from '../useClientShim'
import { toast } from 'react-hot-toast'

export default function AdminPanel() {
  const client = useClient()
  const qc = useQueryClient()
  const [secret, setSecret] = useState(localStorage.getItem('adminSecret') || '')
  const [task, setTask] = useState({ title:'', link:'', reward:'', code:'' })

  const saveSecret = () => {
    localStorage.setItem('adminSecret', secret)
    toast.success('Admin secret saved.')
  }

  const tasks = useQuery({
    queryKey: ['admin_tasks'],
    queryFn: async () => (await client.get('/admin/tasks')).data.tasks || []
  })

  const createTask = useMutation({
    mutationFn: async () => (await client.post('/admin/tasks', { ...task, reward: parseFloat(task.reward) })).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin_tasks'] }); setTask({ title:'', link:'', reward:'', code:'' }); toast.success('Task created'); },
    onError: (e) => toast.error(e?.response?.data?.error || 'Failed')
  })

  const withdrawals = useQuery({
    queryKey: ['admin_withdraws'],
    queryFn: async () => (await client.get('/admin/withdrawals')).data.withdrawals || []
  })

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }) => (await client.post(`/admin/withdrawals/${id}/status`, { status })).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin_withdraws'] }); toast.success('Updated') },
    onError: (e) => toast.error(e?.response?.data?.error || 'Failed')
  })

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-2xl bg-card/90 border border-white/5">
        <h3 className="font-semibold">Admin Access</h3>
        <div className="mt-2 flex gap-2">
          <input value={secret} onChange={e=>setSecret(e.target.value)} placeholder="Enter ADMIN_SECRET" className="flex-1 bg-[#0b0f17] rounded-xl px-3 py-2 border border-[#1f2937]" />
          <button onClick={saveSecret} className="px-3 py-2 rounded-xl bg-accent text-black shadow-glow">Save</button>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-card/90 border border-white/5">
        <h3 className="font-semibold">Create Task</h3>
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-4 gap-2">
          <input value={task.title} onChange={e=>setTask({...task, title:e.target.value})} placeholder="Title" className="bg-[#0b0f17] rounded-xl px-3 py-2 border border-[#1f2937]" />
          <input value={task.link} onChange={e=>setTask({...task, link:e.target.value})} placeholder="Link" className="bg-[#0b0f17] rounded-xl px-3 py-2 border border-[#1f2937]" />
          <input value={task.reward} onChange={e=>setTask({...task, reward:e.target.value})} placeholder="Reward (e.g., 0.50)" className="bg-[#0b0f17] rounded-xl px-3 py-2 border border-[#1f2937]" />
          <input value={task.code} onChange={e=>setTask({...task, code:e.target.value})} placeholder="Verify Code" className="bg-[#0b0f17] rounded-xl px-3 py-2 border border-[#1f2937]" />
        </div>
        <button onClick={()=>createTask.mutate()} className="mt-2 px-3 py-2 rounded-xl bg-accent text-black shadow-glow">Add Task</button>
      </div>

      <div className="p-4 rounded-2xl bg-card/90 border border-white/5">
        <h3 className="font-semibold">Withdrawals</h3>
        <div className="mt-2 space-y-2">
          {withdrawals.data?.map(w => (
            <div key={w.id} className="p-3 rounded-xl bg-[#0b0f17] border border-white/5 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">${w.amount.toFixed(2)} — {w.userId}</div>
                <div className="text-xs text-subtle">{w.method} • {new Date(w.createdAt).toLocaleString()}</div>
              </div>
              <div className="flex gap-2">
                {['pending','approved','completed','rejected'].map(s => (
                  <button key={s} onClick={()=>updateStatus.mutate({ id: w.id, status: s })} className={"px-2 py-1 rounded-lg text-xs " + (w.status===s?'bg-white/20':'bg-white/10')}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
