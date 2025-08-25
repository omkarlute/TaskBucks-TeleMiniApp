import React from 'react'
import { Share2, Copy, Users } from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'react-hot-toast'

export default function ReferralCard({ me, referral }) {
  const shareUrl = `${window.location.origin}/?ref=${me?.id || ''}`
  const text = `Earn with me! Get paid for tasks. Use my link: ${shareUrl}`
  const shareHref = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      toast.success('Referral link copied!')
    } catch {
      toast.error('Copy failed')
    }
  }

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.35 }}
      className="relative p-4 rounded-2xl bg-card/90 border border-white/5 shadow-soft overflow-hidden"
    >
      <div className="absolute -top-20 -right-16 w-64 h-64 rounded-full bg-accent/10 blur-3xl" />
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">Referral Program</h3>
          <p className="text-subtle text-xs mt-1">Invite friends and earn <b>5%</b> of their lifetime task rewards.</p>
        </div>
        <span className="px-2 py-1 rounded-xl bg-accent/10 text-accent text-[10px] uppercase tracking-wide">5% lifetime</span>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          onClick={copy}
          className="flex-1 py-2 rounded-xl bg-[#121826] hover:bg-[#0f1623] transition border border-white/5 inline-flex items-center justify-center gap-2"
        >
          <Copy size={16} /> Copy Link
        </button>
        <a
          className="flex-1 py-2 rounded-xl bg-accent text-black shadow-glow inline-flex items-center justify-center gap-2"
          href={shareHref}
          target="_blank"
          rel="noreferrer"
        >
          <Share2 size={16} /> Share on Telegram
        </a>
      </div>

      <div className="mt-3 text-xs text-subtle flex items-center gap-3">
        <span className="inline-flex items-center gap-1"><Users size={14} /> {referral?.count || 0} referrals</span>
        <span>•</span>
        <span>Earned from referrals: <b className="text-text">${(referral?.referralEarnings || 0).toFixed(2)}</b></span>
      </div>
    </motion.div>
  )
}
