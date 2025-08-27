
import React from 'react'

export default function ReferralCard({ data, loading }) {
  if (loading) {
    return <div className="bg-card border border-white/5 rounded-2xl p-4 animate-pulse h-28" />
  }
  const link = data?.link || ''
  const count = data?.count || 0
  const earnings = data?.earnings || 0

  function copyText() {
    navigator.clipboard.writeText(link)
  }

  function shareTg() {
    const text = encodeURIComponent('Join me and earn!')
    const url = encodeURIComponent(link)
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank', 'noopener')
  }

  return (
    <div className="bg-card border border-white/5 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-semibold">Referral Program</div>
        <span className="badge badge-sky">5% earnings</span>
      </div>

      <div className="text-sm text-muted">Share your link and earn 5% of your friends' task rewards.</div>

      <div className="bg-surface border border-soft rounded-xl p-3 break-all text-sm">{link || '—'}</div>

      <div className="flex items-center gap-2">
        <button onClick={copyText} className="px-4 py-2 rounded-xl bg-white text-black text-sm">Copy Link</button>
        <button onClick={shareTg} className="px-4 py-2 rounded-xl border border-soft text-sm">Share on Telegram</button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-surface border border-soft rounded-xl p-3">
          <div className="text-muted text-xs">Referrals</div>
          <div className="text-xl font-semibold">{count}</div>
        </div>
        <div className="bg-surface border border-soft rounded-xl p-3">
          <div className="text-muted text-xs">Referral Earnings</div>
          <div className="text-xl font-semibold">{earnings.toFixed ? earnings.toFixed(2) : earnings}</div>
        </div>
      </div>
    </div>
  )
}
