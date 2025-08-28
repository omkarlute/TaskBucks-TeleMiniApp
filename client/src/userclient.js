// ===== userclient.js =====
// Axios client wrapper with cache-busting and referral header injection

import axios from 'axios';

// Read env base URL if present (Vite/CRA) otherwise fallback
const API_BASE = (typeof process !== 'undefined' && process.env && (process.env.VITE_API_BASE || process.env.REACT_APP_API_BASE)) || '/api';

// Utility to read stored referrer
function getStoredReferrer() {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem('referrer') || null;
  } catch (e) {
    return null;
  }
}

// Create axios instance
const client = axios.create({
  baseURL: API_BASE,
  timeout: 20000,
  headers: {
    'Accept': 'application/json',
  },
});

// Disable axios caching on the network layer where possible
client.defaults.headers.common['Cache-Control'] = 'no-cache';
client.defaults.headers.common['Pragma'] = 'no-cache';

// Request interceptor: attach referral header, attach important telegram init data, cache-bust GETs
client.interceptors.request.use(config => {
  try {
    // Always ensure headers object exists
    config.headers = config.headers || {};

    // Attach webapp init data if available on window (recommended name: Telegram.WebApp.initData)
    if (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData) {
      config.headers['x-telegram-init-data'] = window.Telegram.WebApp.initData;
    }

    // Ensure admin-secret is forwarded if available globally
    if (typeof window !== 'undefined' && window.__ADMIN_SECRET) {
      config.headers['x-admin-secret'] = window.__ADMIN_SECRET;
    }

    // Attach stored referrer (preferred header name 'x-referrer')
    const ref = getStoredReferrer();
    if (ref && !config.headers['x-referrer']) {
      config.headers['x-referrer'] = ref;
    }

    // Also ensure fallback query param for ref (so server receives when header blocked)
    if (ref && config.method && config.method.toLowerCase() === 'get') {
      // add timestamp param to bust caches
      try {
        const base = (typeof window !== 'undefined' && window.location.origin) || '';
        const url = new URL(config.url, base);
        if (!url.searchParams.get('ref')) url.searchParams.set('ref', ref);
        url.searchParams.set('_', String(Date.now()));
        config.url = url.pathname + url.search;
      } catch (e) {
        // ignore URL parsing issues
      }
    } else if (ref) {
      // for non-GET requests, still try to add ref as query param if url is relative
      try {
        const base = (typeof window !== 'undefined' && window.location.origin) || '';
        const url = new URL(config.url, base);
        if (!url.searchParams.get('ref')) url.searchParams.set('ref', ref);
        config.url = url.pathname + url.search;
      } catch (e) {
        // ignore URL parser errors for absolute URLs or unusual formats
      }
    }

    // Force no-store cache control for endpoints we know are dynamic
    const dynamicPaths = ['/me','/api/me','/tasks','/api/tasks','/referrals','/api/referrals'];
    const path = (config.url || '').split('?')[0];
    if (dynamicPaths.some(p => path.endsWith(p) || path === p)) {
      config.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, proxy-revalidate';
      config.headers['Pragma'] = 'no-cache';
    }
  } catch (err) {
    // swallow errors to not break requests
    console.warn('request interceptor error', err && err.message);
  }

  return config;
}, err => Promise.reject(err));

// Response interceptor: handle 304 gracefully and return full data where possible
client.interceptors.response.use(response => {
  // If a 304 somehow reaches here, convert to a clear object (rare for axios client)
  return response;
}, error => {
  // pass through network errors to caller
  return Promise.reject(error);
});

export default client;
