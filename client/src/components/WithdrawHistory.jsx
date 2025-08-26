import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Calendar, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { Skeleton } from './Skeleton.jsx'
import useClient from '../useClientShim'

export default function WithdrawHistory() {
  const client = useClient()
  const { data, isLoading } = useQuery({
    queryKey: ['withdraws'],
    queryFn: async () => (await client.get('/withdraws')).data.withdraws || []
  })

  if (isLoading) return <div className="space-y-3"><Skeleton className="h-20" /><Skeleton className="h-20" /></div>

  if (!data || data.length === 0) return <div className="text-subtle text-sm p-4 rounded-xl border border-white/5 bg-card/90">No withdrawals yet.</div>

  const Icon = ({ status }) => status==='completed' ? <CheckCircle2 size={16}/> : status==='rejected' ? <XCircle size={16}/> : <Clock size={16}/>

  return (
    <div className="space-y-2">
      {data.map(w => (
        <div key={w.id} className="p-3 rounded-xl bg-card/90 border border-white/5 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">${w.amount.toFixed(2)} — <span className="uppercase">{w.method}</span></div>
            <div className="text-xs text-subtle flex items-center gap-2"><Calendar size={14}/> {new Date(w.createdAt).toLocaleString()}</div>
          </div>
          <span className={"text-xs px-2 py-1 rounded-lg " + (w.status==='completed' ? "bg-green-500/20 text-green-300" : w.status==='rejected' ? "bg-red-500/20 text-red-300" : "bg-yellow-500/20 text-yellow-300")}>{w.status}</span>
        </div>
      ))}
    </div>
  )
}
