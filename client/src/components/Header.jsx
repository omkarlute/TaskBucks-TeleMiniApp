import React from 'react'
import { Sparkles, WalletCards } from 'lucide-react'

export default function Header() {
  return (
    <header className="relative overflow-hidden rounded-2xl p-[1px] bg-gradient-to-r from-accent to-accent2 shadow-glow">
      <div className="rounded-2xl bg-card/90 backdrop-blur-md px-4 py-3 flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-accent to-accent2 flex items-center justify-center shadow-glow">
          <Sparkles size={20} className="text-black" />
        </div>
        <div className="flex-1">
          <h1 className="text-lg font-semibold tracking-tight leading-5">Task-to-Earn</h1>
          <p className="text-subtle text-xs">Complete tasks → enter code → earn rewards</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-subtle text-xs">
          <WalletCards size={16} />
          <span>Telegram Mini App</span>
        </div>
      </div>
    </header>
  );
}
