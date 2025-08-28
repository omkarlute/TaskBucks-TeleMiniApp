
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
    const url = new URL(window.location.href)
    ref = url.searchParams.get('ref') || url.searchParams.get('referrer') || url.searchParams.get('start') || url.searchParams.get('start_param') || null

    // Telegram web app may expose start param in different places
    const tgWebAppStartParam = url.searchParams.get('tgWebAppStartParam') || null
    if (!ref && tgWebAppStartParam) ref = tgWebAppStartParam

    // Try SDK / WebApp initDataUnsafe (more reliable inside Telegram)
    try {
      const sdkRef = window?.Telegram?.WebApp?.initDataUnsafe?.start_param || window?.Telegram?.WebApp?.initDataUnsafe?.start || null
      if (!ref && sdkRef) ref = sdkRef
    } catch (e) {}

    // Parse explicit initData (if provided as query param)
    const rawInit = url.searchParams.get('initData') || (window?.Telegram?.WebApp?.initData) || ''
    const parsedInit = parseInitDataString(rawInit)
    if (!ref && parsedInit) {
      ref = parsedInit.start_param || parsedInit.start || parsedInit.startParam || null
    }

    // Cleanup
    if (typeof ref === 'string') {
      ref = ref.trim()
      if (ref === '' || ref === 'null' || ref === 'undefined') ref = null
    }
  } catch (e) {
    // ignore
  }

  let anonId = localStorage.getItem('anonId')
  if (!anonId) {
    anonId = 'web_' + Math.random().toString(36).slice(2, 10)
    localStorage.setItem('anonId', anonId)
  }
  const adminSecret = localStorage.getItem('adminSecret') || ''

  const headers = {
    'x-telegram-init-data': (typeof window !== 'undefined' && window.Telegram?.WebApp?.initData) || '',
    'x-anon-id': anonId,
    'x-admin-secret': adminSecret
  }
  if (ref) headers['x-referrer'] = ref

  const client = axios.create({ baseURL: API_BASE, headers })

  // Add request interceptor to ensure x-referrer is always sent when available
  client.interceptors.request.use(config => {
    try {
      if (!config.headers) config.headers = {}
      if (ref && !config.headers['x-referrer'] && !config.headers['X-Referrer']) {
        config.headers['x-referrer'] = ref
      }
      // fallback: attach ref as query param to help servers behind proxies
      if (ref && config.url && !config.url.includes('ref=')) {
        const url = new URL(config.baseURL + config.url, window.location.origin)
        if (!url.searchParams.get('ref')) {
          url.searchParams.set('ref', ref)
          // update config.url to relative path only
          config.url = url.pathname + url.search
        }
      }
    } catch (e) {}
    return config
  })

  // Add response interceptor for debugging
  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        console.warn('🔒 Auth error - check Telegram init data')
      }
      return Promise.reject(error)
    }
  )

  console.log('📤 Sending referrer header:', ref)
  return client
}
