import React from 'react'
import { Copy, Share2, Users } from 'lucide-react'
import { toast } from 'react-hot-toast'

export default function ReferralView({ me, referral }) {
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
    <div className="space-y-3">
      <div className="p-4 rounded-2xl bg-card/90 border border-white/5">
        <h2 className="text-lg font-semibold">Referral Program</h2>
        <p className="text-subtle text-sm mt-1">Share your link. You earn <b>5%</b> of your friends’ lifetime task earnings.</p>

        <div className="mt-3">
          <label className="text-xs text-subtle">Your referral link</label>
          <div className="mt-1 flex gap-2">
            <input readOnly value={shareUrl} className="flex-1 bg-[#0b0f17] rounded-xl px-3 py-2 border border-[#1f2937] text-xs" />
            <button onClick={copy} className="px-3 rounded-xl bg-[#121826] border border-white/5 hover:bg-[#0f1623]"> <Copy size={16} /> </button>
            <a href={shareHref} target="_blank" rel="noreferrer" className="px-3 rounded-xl bg-accent text-black shadow-glow flex items-center gap-2"> <Share2 size={16}/> Share </a>
          </div>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-card/90 border border-white/5">
        <div className="flex items-center gap-2 mb-2">
          <Users size={18} className="text-subtle" />
          <h3 className="font-semibold">Your Referrals</h3>
        </div>
        {referral?.count ? (
          <ul className="space-y-2">
            {referral.referrals?.map((u) => (
              <li key={u.id} className="flex justify-between items-center p-2 rounded-xl bg-[#0f1623] border border-[#1f2937]">
                <span className="text-sm">@{u.username || 'user'} <span className="text-subtle">({u.first_name || 'Friend'})</span></span>
                <span className="text-subtle text-xs">ID: {u.id}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-subtle text-sm">No referrals yet. Share your link to start earning!</div>
        )}

        <div className="mt-3 text-xs text-subtle">
          Lifetime referral earnings: <b className="text-text">${(referral?.referralEarnings || 0).toFixed(2)}</b>
        </div>
      </div>
    </div>
  )
}
