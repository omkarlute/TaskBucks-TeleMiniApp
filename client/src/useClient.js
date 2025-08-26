import axios from 'axios'
const API_BASE = import.meta.env.VITE_API_BASE || '/api'

export default function useClient() {
  let ref = null
  try {
    const url = new URL(window.location.href)
    ref = url.searchParams.get('ref') || url.searchParams.get('referrer') || null
  } catch {}

  let anonId = localStorage.getItem('anonId')
  if (!anonId) {
    anonId = 'web_' + Math.random().toString(36).slice(2, 10)
    localStorage.setItem('anonId', anonId)
  }
  const adminSecret = localStorage.getItem('adminSecret') || ''

  const headers = {
    'x-telegram-init-data': (typeof window !== 'undefined' && window.Telegram?.WebApp?.initData) || ''
  }
  if (anonId) headers['x-anon-id'] = anonId
  if (adminSecret) headers['x-admin-secret'] = adminSecret
  if (ref) headers['x-referrer'] = ref

  return axios.create({ baseURL: API_BASE, headers })
}
