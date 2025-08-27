
import React from 'react'
import useClient from '../useClient.js'
import { useQuery } from '@tanstack/react-query'

export default function WithdrawHistory() {
  const api = useClient()
  const { data, isLoading } = useQuery({
    queryKey: ['withdraws'],
    queryFn: async () => (await api.get('/withdraw')).data
  })

  if (isLoading) return <div className="bg-card border border-white/5 rounded-2xl p-4 animate-pulse h-28" />

  return (
    <div className="space-y-3">
      <div className="font-semibold">Withdrawals</div>
      {(!data || !data.length) && <div className="text-muted text-sm">No withdrawal requests yet.</div>}
      {data?.map(w => (
        <div key={w.id} className="bg-card border border-white/5 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted">{new Date(w.createdAt).toLocaleString()}</div>
              <div className="text-sm">To: {w.address}</div>
            </div>
            <div className="text-right">
              <div className="font-semibold">{w.amount}</div>
              <div className="text-xs text-muted">{w.status}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
