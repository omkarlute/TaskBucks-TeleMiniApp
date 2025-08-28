
import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.jsx'
import './styles.css'

const BOT = import.meta.env.VITE_BOT_USERNAME || ''
const ALLOW_WEB = import.meta.env.VITE_ALLOW_WEB === 'true'
const MODE = import.meta.env.MODE || 'production'

// If not inside Telegram WebApp and running in production, redirect users to the bot deep link
if (typeof window !== 'undefined' && !window.Telegram?.WebApp && MODE === 'production' && !ALLOW_WEB && BOT) {
  try {
    const url = new URL(window.location.href)
    const ref = url.searchParams.get('ref') || ''
    // robust deep link to open mini app with referral
    try {
      const payload = btoa(JSON.stringify({ ref }));
      const deepLink = `https://t.me/${BOT}?startapp=${encodeURIComponent(payload)}`;
      // redirect preserving referral
      window.location.replace(deepLink);
    } catch (e) {
      window.location.href = `https://t.me/${BOT}`;
    }
    const startParam = ref ? `?start=${encodeURIComponent(ref)}` : ''
    const botLink = `https://t.me/${BOT}${startParam}`
    window.location.href = botLink
  } catch (e) {
    // fallback: go to bot chat without params
    window.location.href = `https://t.me/${BOT}`
  }
}

const qc = new QueryClient()
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
)
