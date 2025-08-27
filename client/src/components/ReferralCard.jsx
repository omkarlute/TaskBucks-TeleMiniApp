
import React from 'react'
import { Share2 } from 'lucide-react'
import { toast } from 'react-hot-toast'

export default function ReferralCard({ data, loading }) {
  if (loading) {
    return <div className="bg-card border border-white/5 rounded-2xl p-4 animate-pulse h-28" />
  }
  const link = data?.link || data?.webLink || ''
  const count = data?.count ?? (data?.referrals ? data.referrals.length : 0)
  const earnings = data?.referralEarnings ?? data?.earnings ?? 0

  function copyText() {
    navigator.clipboard.writeText(link)
    toast.success('Referral link copied!')
  }

  function shareTg() {
    if (!link) return
    const text = `Join me on Taskbucks! Use my referral link: ${link}`
    const shareHref = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`
    window.open(shareHref, '_blank', 'noopener')
  }

  return (
    <div className="bg-card border border-white/5 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-muted text-xs">Referral Program</div>
          <div className="text-lg font-semibold">Invite friends — earn rewards</div>
        </div>
        <div className="flex gap-2">
          <button onClick={copyText} className="px-3 py-2 rounded-xl bg-white/10 text-sm">Copy</button>
          <button onClick={shareTg} className="px-3 py-2 rounded-xl bg-white text-black text-sm flex items-center gap-2">
            <Share2 size={14}/> Share
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-surface border border-soft rounded-xl p-3">
          <div className="text-muted text-xs">Referrals</div>
          <div className="text-xl font-semibold">{count}</div>
        </div>
        <div className="bg-surface border border-soft rounded-xl p-3">
          <div className="text-muted text-xs">Referral Earnings</div>
          <div className="text-xl font-semibold">${Number(earnings).toFixed(2)}</div>
        </div>
      </div>
    </div>
  )
}
