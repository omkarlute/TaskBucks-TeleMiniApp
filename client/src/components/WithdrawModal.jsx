
import React, { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import useClient from '../useClient.js'
import { toast } from 'react-hot-toast'

export default function WithdrawModal({ onClose }) {
  const api = useClient()
  const qc = useQueryClient()
  const [amount, setAmount] = useState('')
  const [address, setAddress] = useState('')

  const create = useMutation({
    mutationFn: async () => (await api.post('/withdraw', { amount: Number(amount), address })).data,
    onSuccess: () => {
      toast.success('Withdrawal requested')
      qc.invalidateQueries({ queryKey: ['me'] })
      qc.invalidateQueries({ queryKey: ['withdraws'] })
      onClose()
    },
    onError: (err) => toast.error(err?.response?.data?.error || 'Failed')
  })

  return (
    <div className="fixed inset-0 bg-black/70 grid place-items-center z-50 p-4">
      <div className="bg-[#0b0f17] border border-white/5 rounded-2xl p-4 w-full max-w-md">
        <div className="flex items-center justify-between">
          <div className="font-semibold">Withdraw</div>
          <button onClick={onClose} className="text-sm text-muted">Close</button>
        </div>
        <div className="mt-3 space-y-3">
          <div>
            <div className="text-sm text-muted">Amount</div>
            <input value={amount} onChange={e => setAmount(e.target.value)} type="number" min="0" step="0.01"
              className="w-full bg-surface border border-soft rounded-xl px-3 py-2 outline-none" />
          </div>
          <div>
            <div className="text-sm text-muted">Address</div>
            <input value={address} onChange={e => setAddress(e.target.value)}
              className="w-full bg-surface border border-soft rounded-xl px-3 py-2 outline-none" />
          </div>
          <button onClick={() => create.mutate()} className="w-full py-2 rounded-xl bg-white text-black">Request</button>
        </div>
      </div>
    </div>
  )
}
