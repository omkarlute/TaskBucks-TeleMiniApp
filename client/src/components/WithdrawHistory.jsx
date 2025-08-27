
import React from 'react'
import useClient from '../useClient.js'
import { useQuery } from '@tanstack/react-query'

export default function WithdrawHistory() {
  const api = useClient()
  const { data, isLoading } = useQuery({
    queryKey: ['withdraws'],
    queryFn: async () => (await api.get('/withdraws')).data
  })

  if (isLoading) return <div className="bg-card border border-white/5 rounded-2xl p-4 animate-pulse h-28" />

  const list = data?.withdraws || []

  return (
    <div className="space-y-3">
      {list.length === 0 && <div className="text-subtle">No withdrawals yet.</div>}
      {list.map(w => (
        <div key={w.id} className="bg-surface border border-soft rounded-xl p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted">{new Date(w.createdAt).toLocaleString()}</div>
              <div className="text-sm">To: {w?.details?.address || w?.details?.wallet || 'N/A'}</div>
            </div>
            <div className="text-right">
              <div className="font-semibold">${Number(w.amount).toFixed(2)}</div>
              <div className="text-xs text-muted">{w.status}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
