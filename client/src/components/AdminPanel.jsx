
import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import useClient from '../useClient.js'
import { toast } from 'react-hot-toast'

export default function AdminPanel() {
  const client = useClient()
  const qc = useQueryClient()
  const [task, setTask] = useState({ title:'', link:'', reward:'', code:'' })

  const tasks = useQuery({
    queryKey: ['admin_tasks'],
    queryFn: async () => (await client.get('/admin/tasks')).data,
    enabled: false // only when used
  })

  const createTask = useMutation({
    mutationFn: async () => (await client.post('/admin/tasks', task)).data,
    onSuccess: () => {
      toast.success('Task created')
      qc.invalidateQueries({ queryKey:['admin_tasks'] })
      setTask({ title:'', link:'', reward:'', code:'' })
    },
    onError: e => toast.error(e?.response?.data?.error || 'Failed')
  })

  return (
    <div className="p-4">
      <h2 className="font-semibold text-lg mb-4">Admin Panel</h2>
      <div className="grid gap-2">
        <input className="bg-white/10 rounded px-3 py-2" placeholder="Title" value={task.title} onChange={e=>setTask(s=>({...s,title:e.target.value}))}/>
        <input className="bg-white/10 rounded px-3 py-2" placeholder="Link" value={task.link} onChange={e=>setTask(s=>({...s,link:e.target.value}))}/>
        <input className="bg-white/10 rounded px-3 py-2" placeholder="Reward" value={task.reward} onChange={e=>setTask(s=>({...s,reward:e.target.value}))}/>
        <input className="bg-white/10 rounded px-3 py-2" placeholder="Code" value={task.code} onChange={e=>setTask(s=>({...s,code:e.target.value}))}/>
        <button onClick={()=>createTask.mutate()} className="px-3 py-2 bg-white text-black rounded">Create Task</button>
      </div>
    </div>
  )
}
