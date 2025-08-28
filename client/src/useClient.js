
import axios from 'axios'
const API_BASE = import.meta.env.VITE_API_BASE || '/api'

// parse Telegram initData string like "key1=val1&key2=val2"
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
    const url = new URL(typeof window !== 'undefined' ? window.location.href : 'http://localhost/')
    ref = url.searchParams.get('ref') || null

    // also support Telegram startapp param (base64 json or raw)
    const sp = url.searchParams.get('tgWebAppStartParam')
    if (!ref && sp) {
      try {
        const decoded = atob(sp)
        const obj = JSON.parse(decoded)
        ref = obj.ref || obj.referredBy || obj.u || null
      } catch {
        ref = sp
      }
    }

    const init = (typeof window !== 'undefined' && window.Telegram?.WebApp?.initData) || ''
    if (!ref && init) {
      const parsed = parseInitDataString(init)
      if (parsed.start_param) {
        try {
          const decoded = atob(parsed.start_param)
          const obj = JSON.parse(decoded)
          ref = obj.ref || obj.referredBy || obj.u || null
        } catch {
          ref = parsed.start_param
        }
      }
    }
    if (ref === '' || ref === 'null' || ref === 'undefined') ref = null
  } catch {}

  let anonId = ''
  try {
    anonId = (typeof window !== 'undefined' && localStorage.getItem('anonId')) || ''
    if (!anonId) {
      anonId = 'web_' + Math.random().toString(36).slice(2, 10)
      localStorage.setItem('anonId', anonId)
    }
  } catch {}

  const adminSecret = (typeof window !== 'undefined' && localStorage.getItem('adminSecret')) || ''

  const headers = {
    'x-telegram-init-data': (typeof window !== 'undefined' && window.Telegram?.WebApp?.initData) || '',
    'x-anon-id': anonId,
    'Cache-Control': 'no-cache',
    'x-admin-secret': adminSecret
  }
  if (ref) headers['x-referrer'] = ref

  const client = axios.create({ baseURL: API_BASE, headers })

  // Also propagate x-referrer on every request if we have it
  client.interceptors.request.use(config => {
    config.headers = config.headers || {}
    if (ref && !config.headers['x-referrer']) config.headers['x-referrer'] = ref
    return config
  })

  return client
}
