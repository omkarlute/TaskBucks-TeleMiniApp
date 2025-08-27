
import axios from 'axios'
const API_BASE = import.meta.env.VITE_API_BASE || '/api'

export default function useClient() {
  let ref = null
try {
  const url = new URL(window.location.href);
  ref = url.searchParams.get('ref') || url.searchParams.get('referrer') || null;
  // Telegram sometimes sends the deep-link param as tgWebAppStartParam in the URL
  const tgStartParam = url.searchParams.get('tgWebAppStartParam');
  if (!ref && tgStartParam) ref = tgStartParam;
} catch {}
// As a fallback, read start_param from the Telegram WebApp initDataUnsafe if available
try {
  const tgStart = window.Telegram?.WebApp?.initDataUnsafe?.start_param;
  if (!ref && tgStart) ref = tgStart;
} catch {}

  let anonId = localStorage.getItem('anonId')
  if (!anonId) {
    anonId = 'web_' + Math.random().toString(36).slice(2, 10)
    localStorage.setItem('anonId', anonId)
  }

  const headers = {
    'x-telegram-init-data': (typeof window !== 'undefined' && window.Telegram?.WebApp?.initData) || ''
  }
  if (anonId) headers['x-anon-id'] = anonId
  if (ref) headers['x-referrer'] = ref

  return axios.create({ baseURL: API_BASE, headers, withCredentials: true })
}
