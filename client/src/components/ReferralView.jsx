
import React from 'react'
import { Copy, Share2, Users } from 'lucide-react'
import { toast } from 'react-hot-toast'

export default function ReferralView({ me, referral }) {
  const anon = (typeof window !== 'undefined' && localStorage.getItem('anonId')) || ''
  const myId = me?.id || anon || ''
  const shareUrl = referral?.link || referral?.webLink || (typeof window !== 'undefined' ? `${window.location.origin}/?ref=${myId}` : '')
  const text = `Earn with me! Get paid for tasks. Use my link: ${shareUrl}`
  const shareHref = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      toast.success('Referral link copied!')
    } catch {
      toast.error('Failed to copy')
    }
  }

  return (
    <div className="bg-card border border-white/5 rounded-2xl p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-muted text-xs">Share & Earn</div>
          <div className="font-semibold mt-1">Invite friends and earn a lifetime bonus</div>
          <div className="text-subtle text-sm mt-2">Share your link — they sign up via the bot and you get rewards.</div>
        </div>
        <div className="flex flex-col gap-2">
          <button onClick={copy} className="px-3 py-2 rounded-xl bg-white/10 text-sm">Copy</button>
          <a href={shareHref} target="_blank" rel="noreferrer" className="px-3 py-2 rounded-xl bg-white text-black text-sm inline-flex items-center gap-2">
            <Share2 size={14}/> Share via Telegram
          </a>
        </div>
      </div>

      <div className="mt-4 bg-white/5 rounded-xl p-3">
        <div className="text-subtle text-xs">Your referral link</div>
        <div className="text-sm break-all">{shareUrl}</div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Users size={16} />
        <div className="text-sm">Total Referrals: <span className="font-semibold">{referral?.count ?? 0}</span></div>
        <div className="text-sm ml-auto">Earnings: <span className="font-semibold">${(referral?.referralEarnings ?? 0).toFixed(2)}</span></div>
      </div>

      {referral?.referrals?.length ? (
        <ul className="mt-3 space-y-2">
          {referral.referrals.map(u => (
            <li key={u.id} className="text-sm border-t border-white/5 pt-2">
              <div className="font-medium">{u.first_name || u.username || u.id}</div>
              <div className="text-subtle text-xs">ID: {u.id}</div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
