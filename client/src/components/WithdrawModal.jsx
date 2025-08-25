import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { clsx } from 'clsx'

export default function WithdrawModal({ open, onClose, onSubmit, eligible }) {
  const [method, setMethod] = useState('paypal')
  const [paypalEmail, setPaypalEmail] = useState('')
  const [cryptoNetwork, setCryptoNetwork] = useState('')
  const [cryptoAddress, setCryptoAddress] = useState('')

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center"
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 22 }}
            className="w-full sm:w-[520px] bg-card rounded-t-2xl sm:rounded-2xl p-5 shadow-soft border border-white/5"
          >
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-xl font-semibold">Withdraw</h2>
              <button onClick={onClose} className="text-subtle">✕</button>
            </div>
            {!eligible && (
              <div className="p-3 rounded-xl bg-yellow-500/10 text-yellow-200 mb-3">Minimum withdraw is <b>$5</b>.</div>
            )}
            <div className="flex gap-2 mb-3">
              <button onClick={() => setMethod('paypal')} className={clsx("flex-1 py-2 rounded-xl", method==='paypal'?'bg-accent text-black':'bg-[#1f2937]')}>PayPal</button>
              <button onClick={() => setMethod('crypto')} className={clsx("flex-1 py-2 rounded-xl", method==='crypto'?'bg-accent text-black':'bg-[#1f2937]')}>Crypto</button>
            </div>

            {method === 'paypal' ? (
              <div className="space-y-2">
                <label className="text-sm text-subtle">PayPal Email</label>
                <input value={paypalEmail} onChange={e=>setPaypalEmail(e.target.value)} className="w-full bg-[#0b0f17] rounded-xl px-3 py-2 border border-[#1f2937]" placeholder="you@example.com" />
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-sm text-subtle">Network (e.g., TRON, ERC20)</label>
                <input value={cryptoNetwork} onChange={e=>setCryptoNetwork(e.target.value)} className="w-full bg-[#0b0f17] rounded-xl px-3 py-2 border border-[#1f2937]" placeholder="TRON (TRC20)" />
                <label className="text-sm text-subtle">Wallet Address</label>
                <input value={cryptoAddress} onChange={e=>setCryptoAddress(e.target.value)} className="w-full bg-[#0b0f17] rounded-xl px-3 py-2 border border-[#1f2937]" placeholder="Your wallet address" />
              </div>
            )}

            <button
              disabled={!eligible}
              onClick={() => {
                if (method==='paypal' && !paypalEmail) return;
                if (method==='crypto' && (!cryptoNetwork || !cryptoAddress)) return;
                const details = method==='paypal' ? { email: paypalEmail } : { network: cryptoNetwork, address: cryptoAddress }
                onSubmit(method, details)
              }}
              className={clsx("mt-4 w-full py-3 rounded-2xl font-medium transition shadow-glow",
                eligible ? "bg-accent text-black" : "bg-[#1f2937] text-subtle")}
            >
              Submit Withdrawal
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
