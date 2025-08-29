import axios from 'axios'
const API_BASE = import.meta.env.VITE_API_BASE || '/api'

export default function useClient() {
  let ref = null

  // Read referrer from multiple sources (cover all Telegram entry points)
  try {
    const url = new URL(window.location.href)
    ref = url.searchParams.get('ref') || url.searchParams.get('referrer') || url.searchParams.get('startapp') || url.searchParams.get('start') || null

    // Telegram appends deep-link start parameter in different ways:
    const tgStartParam = url.searchParams.get('tgWebAppStartParam')
    if (!ref && tgStartParam) ref = tgStartParam

    // From SDK (more reliable inside Telegram)
    const sdkRef = window?.Telegram?.WebApp?.initDataUnsafe?.start_param
    if (!ref && sdkRef) ref = sdkRef

  } catch {}

  // Persist & reuse referral so the bottom "Open" button still carries it
  try {
    if (ref) localStorage.setItem('ref_keeper', ref)
    if (!ref) ref = localStorage.getItem('ref_keeper') || null
  } catch {}

  // Anonymous id (helps backend tie pre-auth actions)
  let anonId = null
  try {
    anonId = localStorage.getItem('anonId')
    if (!anonId) {
      anonId = 'web_' + Math.random().toString(36).slice(2, 10)
      localStorage.setItem('anonId', anonId)
    }
  } catch {}

  const headers = {
    'x-telegram-init-data': (typeof window !== 'undefined' && window.Telegram?.WebApp?.initData) || ''
  }
  if (anonId) headers['x-anon-id'] = anonId
  if (ref) headers['x-referrer'] = ref

  return axios.create({ baseURL: API_BASE, headers, withCredentials: true })
}
