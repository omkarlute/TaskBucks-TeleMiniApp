// ===== useClientShim.js =====
// React hook and shim to capture Telegram start_param / deep link referrals and persist them

import { useEffect, useState } from 'react';
import client from './userclient';

// Try parse base64 JSON payload used by startapp deep links
function tryParseStartAppPayload(payload) {
  if (!payload) return null;
  try {
    const decoded = atob(payload);
    const parsed = JSON.parse(decoded);
    return parsed;
  } catch (e) {
    // payload might already be a plain string id
    return payload;
  }
}

function getQueryParam(name) {
  try {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
  } catch (e) {
    return null;
  }
}

export default function useClientShim() {
  const [ref, setRef] = useState(() => {
    try {
      if (typeof window === 'undefined') return null;
      return window.localStorage.getItem('referrer') || null;
    } catch (e) {
      return null;
    }
  });

  useEffect(() => {
    // 1) Check Telegram WebApp start_param (preferred)
    try {
      if (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        // Some SDKs expose start_param or initDataUnsafe
        const startParam = tg.initDataUnsafe && tg.initDataUnsafe.start_param || tg.startParam || tg.start_param;
        if (startParam) {
          const parsed = tryParseStartAppPayload(startParam);
          const r = (parsed && parsed.ref) || parsed || null;
          if (r) {
            window.localStorage.setItem('referrer', String(r));
            setRef(String(r));
            // Also set on global for server-side header shim
            window.__REFERRER = String(r);
          }
        }
      }
    } catch (e) {}

    // 2) Check `start` and `startapp` query params (when user opens link directly via browser)
    const start = getQueryParam('start') || getQueryParam('startapp') || getQueryParam('ref');
    if (start) {
      const parsed = tryParseStartAppPayload(start);
      const r = (parsed && parsed.ref) || parsed || null;
      if (r) {
        try { window.localStorage.setItem('referrer', String(r)); } catch (e) {}
        setRef(String(r));
        window.__REFERRER = String(r);
      }
    }

    // 3) If not in WebApp and no start param found, also check for cookies or legacy header name
    try {
      const legacy = getQueryParam('referrer') || getQueryParam('ref_id');
      if (!ref && legacy) {
        window.localStorage.setItem('referrer', String(legacy));
        setRef(String(legacy));
        window.__REFERRER = String(legacy);
      }
    } catch (e) {}

    // 4) Attach a small shim to axios client so that the header always reads latest value
    const attachRefHeader = () => {
      try {
        const current = window.localStorage.getItem('referrer') || null;
        if (current) client.defaults.headers.common['x-referrer'] = String(current);
      } catch (e) {}
    };

    attachRefHeader();

    // ensure headers update on storage change (another tab)
    const onStorage = (ev) => {
      if (ev.key === 'referrer') attachRefHeader();
    };
    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener('storage', onStorage);
    };
  }, []); // run once

  // Expose a setter for manual testing
  const setReferrer = (id) => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('referrer', String(id));
        client.defaults.headers.common['x-referrer'] = String(id);
        window.__REFERRER = String(id);
        setRef(String(id));
      }
    } catch (e) {}
  };

  return { ref, setReferrer };
}
