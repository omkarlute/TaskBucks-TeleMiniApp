
import axios from 'axios'
import WebApp from '@twa-dev/sdk'

const API_BASE = import.meta.env.VITE_API_BASE || '/api'

// Small helper to parse initData string
function parseInitDataString(initData) {
  if (!initData || typeof initData !== 'string') return {}
  const pairs = initData.split('&')
  const out = {}
  for (const p of pairs) {
    const [k, v] = p.split('=')
    if (!k) continue
    out[k] = decodeURIComponent(v || '')
  }
  return out
}

export default function useClient() {
  let ref = null
  try {
    const url = new URL(window.location.href)
    ref = url.searchParams.get('ref') || url.searchParams.get('referrer') || url.searchParams.get('start') || url.searchParams.get('start_param') || null
  } catch (e) {}

  // try SDK param
  try {
    const sdkRef = window?.Telegram?.WebApp?.initDataUnsafe?.start_param || window?.Telegram?.WebApp?.initDataUnsafe?.start || null
    if (!ref && sdkRef) ref = sdkRef
  } catch (e) {}

  // parse WebApp.initData
  try {
    const parsed = parseInitDataString(WebApp.initData || window.Telegram?.WebApp?.initData || '')
    if (!ref) ref = parsed.start_param || parsed.start || parsed.startParam || null
  } catch (e) {}

  let anonId = localStorage.getItem('anonId')
  if (!anonId) {
    anonId = 'web_' + Math.random().toString(36).slice(2, 10)
    localStorage.setItem('anonId', anonId)
  }
  const adminSecret = localStorage.getItem('adminSecret') || ''

  const headers = {
    'x-telegram-init-data': WebApp.initData || window.Telegram?.WebApp?.initData || ''
  }
  if (anonId) headers['x-anon-id'] = anonId
  if (adminSecret) headers['x-admin-secret'] = adminSecret
  if (ref) headers['x-referrer'] = ref

  const client = axios.create({ baseURL: API_BASE, headers })
  client.interceptors.request.use(config => {
    if (!config.headers) config.headers = {}
    if (ref && !config.headers['x-referrer']) config.headers['x-referrer'] = ref
    return config
  })

  console.log('📤 (shim) Sending referrer header:', ref)
  return client
}
