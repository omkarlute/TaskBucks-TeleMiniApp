
import React, { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import useClient from '../useClient.js'
import { toast } from 'react-hot-toast'

export default function WithdrawModal({ onClose }) {
  const api = useClient()
  const qc = useQueryClient()
  const [amount, setAmount] = useState('')
  const [address, setAddress] = useState('')

  const me = qc.getQueryData(['me'])
  const balance = me?.user?.balance || 0

  const create = useMutation({
    mutationFn: async () => (await api.post('/withdraw', { amount: Number(amount), address })).data,
    onSuccess: () => {
      toast.success('Withdrawal requested')
      qc.invalidateQueries({ queryKey: ['me'] })
      qc.invalidateQueries({ queryKey: ['withdraws'] })
      onClose && onClose()
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error || 'Withdraw failed')
    }
  })

  function submit() {
    const v = Number(amount)
    if (!v || isNaN(v)) return toast.error('Enter a valid amount')
    if (v > balance) return toast.error('Amount exceeds your balance')
    if (v < 5) return toast.error('Minimum $5 to withdraw')
    if (!address || address.length < 5) return toast.error('Enter a valid address')
    create.mutate()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-card rounded-2xl max-w-md w-full p-4">
        <div className="text-lg font-semibold mb-3">Request Withdrawal</div>
        <div className="space-y-3">
          <div>
            <div className="text-sm text-muted">Amount (USD)</div>
            <input value={amount} onChange={e => setAmount(e.target.value)} type="number" min="0" step="0.01"
              className="w-full bg-surface border border-soft rounded-xl px-3 py-2 outline-none" />
          </div>
          <div>
            <div className="text-sm text-muted">Address</div>
            <input value={address} onChange={e => setAddress(e.target.value)}
              className="w-full bg-surface border border-soft rounded-xl px-3 py-2 outline-none" />
          </div>
          <button onClick={submit} className="w-full py-2 rounded-xl bg-white text-black">Request</button>
        </div>
      </div>
    </div>
  )
}
