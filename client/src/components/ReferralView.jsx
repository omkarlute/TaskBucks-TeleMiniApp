import React from 'react'
import { Copy, Share2, Users } from 'lucide-react'
import { toast } from 'react-hot-toast'

export default function ReferralView({ me, referral }) {
  const anon = (typeof window !== 'undefined' && localStorage.getItem('anonId')) || ''
  const myId = me?.id || anon || ''
  const shareUrl = referral?.link || `${window.location.origin}/?ref=${myId}`
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
    <div className="p-4 rounded-2xl bg-card/90 border border-white/5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Referral Program</h3>
          <div className="text-subtle text-xs mt-1">Share your link. You earn <b>5%</b> of your friends’ lifetime task earnings.</div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={copy} className="px-3 py-2 rounded-xl bg-white/5">Copy</button>
          <a href={shareHref} target="_blank" rel="noreferrer" className="px-3 py-2 rounded-xl bg-white/5">Share</a>
        </div>
      </div>

      <div className="mt-3 text-sm">
        <div className="break-words">{shareUrl}</div>
      </div>

      <div className="mt-3 text-xs text-subtle">
        Lifetime referral earnings: <b className="text-text">${(referral?.referralEarnings || 0).toFixed(2)}</b>
      </div>

      {referral?.referrals?.length ? (
        <ul className="mt-3 space-y-2">
          {referral.referrals.map(u => (
            <li key={u.id} className="text-sm border-t border-white/5 pt-2">
              <div className="font-medium">{u.first_name || u.username}</div>
              <div className="text-subtle text-xs">ID: {u.id}</div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
