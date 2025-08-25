import React, { useEffect } from 'react'
import WebApp from '@twa-dev/sdk'
import { motion } from 'framer-motion'
import { DollarSign } from 'lucide-react'
import { clsx } from 'clsx'

export default function BalanceCard({ balance, onWithdrawClick }) {
  const eligible = balance >= 5

  useEffect(() => {
    try {
      WebApp.MainButton.setText(eligible ? '💸 Withdraw Now' : 'Min $5 to Withdraw')
      WebApp.MainButton[eligible ? 'show' : 'hide']()
      if (eligible) WebApp.MainButton.onClick(onWithdrawClick)
      return () => {
        WebApp.MainButton.offClick(onWithdrawClick)
        WebApp.MainButton.hide()
      }
    } catch {}
  }, [balance, onWithdrawClick, eligible])

  return (
    <div className="relative">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-accent to-accent2 rounded-3xl blur opacity-30"></div>
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="relative p-5 rounded-3xl bg-card/95 backdrop-blur-md shadow-soft overflow-hidden"
      >
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-accent/10 blur-3xl" />
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-accent to-accent2 flex items-center justify-center shadow-glow">
            <DollarSign className="text-black" />
          </div>
          <div>
            <p className="text-subtle text-xs">Current Balance</p>
            <div className="flex items-end gap-2">
              <h2 className="text-4xl font-semibold">${balance.toFixed(2)}</h2>
              <span className="px-2 py-0.5 rounded-full bg-accent/10 text-accent text-[10px] uppercase tracking-wide">min $5</span>
            </div>
          </div>
        </div>

        <button
          onClick={onWithdrawClick}
          className={clsx("mt-4 w-full py-3 rounded-2xl font-medium transition shadow-glow",
            eligible ? "bg-accent text-black animate-pulse" : "bg-[#1f2937] text-subtle")}
        >
          {eligible ? "💸 Withdraw Now" : "Withdraw (min $5)"}
        </button>
      </motion.div>
       </div>
  );
}
