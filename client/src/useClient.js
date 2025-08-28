import axios from 'axios'
const API_BASE = import.meta.env.VITE_API_BASE || '/api'

export default function useClient() {
  let ref = null

  // Read referrer from multiple sources (cover all Telegram entry points)
  try {
    const url = new URL(window.location.href)
    ref = url.searchParams.get('ref') || url.searchParams.get('referrer') || null

    // Telegram appends deep-link start parameter in different ways:
    const tgStartParam = url.searchParams.get('tgWebAppStartParam')
    if (!ref && tgStartParam) ref = tgStartParam

    // From SDK (more reliable inside Telegram)
    const sdkRef = window?.Telegram?.WebApp?.initDataUnsafe?.start_param
    if (!ref && sdkRef) ref = sdkRef

  } catch {}

  // Persist & reuse referral so the bottom "Open" button still carries it
  try {
    if (ref && ref !== 'undefined' && ref !== 'null') {
      localStorage.setItem('ref_keeper', ref)
      console.log('🔗 Referral code stored:', ref)
    }
    if (!ref) {
      const stored = localStorage.getItem('ref_keeper')
      if (stored && stored !== 'undefined' && stored !== 'null') {
        ref = stored
        console.log('🔗 Referral code retrieved from storage:', ref)
      }
    }
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
  if (ref && ref !== 'undefined' && ref !== 'null') {
    headers['x-referrer'] = ref
    console.log('📤 Sending referrer header:', ref)
  }

  // Create axios instance with request interceptor for consistent referral tracking
  const client = axios.create({ 
    baseURL: API_BASE, 
    headers, 
    withCredentials: true 
  })

  // Add request interceptor to ensure referral is always sent
  client.interceptors.request.use((config) => {
    // Always try to include referrer if we have it
    const currentRef = localStorage.getItem('ref_keeper')
    if (currentRef && currentRef !== 'undefined' && currentRef !== 'null' && !config.headers['x-referrer']) {
      config.headers['x-referrer'] = currentRef
    }
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

  return client
}
