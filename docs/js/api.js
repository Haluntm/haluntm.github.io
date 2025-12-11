// js/api.js - centralized API calls, auth helpers and normalization
import { setPublicItems, setPersonalItems } from './store.js';
import { showToast } from './ui.js';

export const API_BASE = 'https://dreams.jalaljaleh.workers.dev'; // adjust

// Local storage keys used by auth + api
export const TOKEN_KEY = 'X_API_TOKEN';
export const USER_INFO_KEY = 'X_USER_INFO';

function normalize(payload) {
    if (!payload && payload !== 0) return [];
    if (Array.isArray(payload)) return payload;
    if (payload && typeof payload === 'object') {
        if (Array.isArray(payload.data)) return payload.data;
        if (Array.isArray(payload.items)) return payload.items;
        if (Array.isArray(payload.dreams)) return payload.dreams;
        const vals = Object.values(payload);
        if (vals.length && vals.every(v => typeof v === 'object')) return vals;
    }
    if (typeof payload === 'string') {
        try { const p = JSON.parse(payload); if (Array.isArray(p)) return p; } catch { }
    }
    return [payload];
}

/* ---------------------------
   Auth helpers moved here
   --------------------------- */

/* Helper: read token from localStorage */
export function getStoredToken() {
    try { return localStorage.getItem(TOKEN_KEY); } catch (e) { return null; }
}

/* Helper: save token to localStorage */
export function saveToken(token) {
    try { if (token) localStorage.setItem(TOKEN_KEY, token); else localStorage.removeItem(TOKEN_KEY); } catch (e) { /* ignore */ }
}

/* Helper: save user info JSON */
export function saveUserInfo(obj) {
    try { if (obj) localStorage.setItem(USER_INFO_KEY, JSON.stringify(obj)); else localStorage.removeItem(USER_INFO_KEY); } catch (e) { /* ignore */ }
}

/* Fetch /user/login_info using x-api-token header and store result */
export async function fetchAndStoreLoginInfo(token) {
    if (!token) return null;
    try {
        const res = await fetch(`${API_BASE}/user/login_info`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'x-api-token': token
            }
        });
        if (!res.ok) {
            console.warn('login_info returned', res.status);
            return null;
        }
        const json = await res.json().catch(() => null);
        if (json) saveUserInfo(json.data);
        return json.data;
    } catch (err) {
        console.error('fetchAndStoreLoginInfo error', err);
        return null;
    }
}

// js/api.js (relevant excerpts and improved functions)
// keep your other exports above unchanged (normalize, TOKEN_KEY, etc.)

/* Helper: try to extract Telegram initData from URL fragment
   Accepts several shapes and attempts up to two decodings.
   Returns a decoded initData string like "user=...&auth_date=...&hash=..." or null.
*/
function extractInitDataFromFragment() {
    try {
        const frag = (location && location.hash) ? location.hash.slice(1) : '';
        if (!frag) return null;

        // If fragment already looks like raw key=value pairs
        if (frag.includes('hash=') && frag.includes('auth_date=')) {
            // try decode once (some clients percent-encode)
            try { return decodeURIComponent(frag); } catch (e) { return frag; }
        }

        // If a parameter name contains the payload, look for common keys
        const params = new URLSearchParams(frag.replace(/\+/g, '%20'));
        const candidates = ['tgWebAppData', 'tgWebAppInitData', 'initData', 'tgWebApp'];
        for (const k of candidates) {
            const v = params.get(k);
            if (v) {
                // decode up to twice
                let raw = v;
                try { raw = decodeURIComponent(raw); } catch (e) { }
                try { raw = decodeURIComponent(raw); } catch (e) { }
                return raw;
            }
        }

        // If the fragment contains an encoded blob that itself contains 'hash=' after decoding
        try {
            const one = decodeURIComponent(frag);
            if (one.includes('hash=') && one.includes('auth_date=')) return one;
            const two = decodeURIComponent(one);
            if (two.includes('hash=') && two.includes('auth_date=')) return two;
        } catch (e) { /* ignore */ }

        return null;
    } catch (e) {
        console.warn('extractInitDataFromFragment error', e);
        return null;
    }
}

/* Send Telegram initData to /user/login_telegram to obtain token */
export async function loginViaTelegram(initDataRaw) {
    try {
        if (!initDataRaw) return null;

        // server accepts JSON { initData: "..." } or raw text; prefer JSON
        const res = await fetch(`${API_BASE}/user/login_telegram`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ initData: String(initDataRaw) })
        });

        if (!res.ok) {
            // try to read body for debug (do not leak to user)
            const txt = await res.text().catch(() => '');
            console.warn('login_telegram failed', res.status, txt);
            return null;
        }

        const payload = await res.json().catch(() => null);
        if (!payload || !payload.ok) {
            console.warn('login_telegram payload invalid', payload);
            return null;
        }

        const token = payload?.token || payload?.apiKey || null;
        if (token) saveToken(token);
        if (payload?.user) saveUserInfo(payload.user);
        return payload;
    } catch (err) {
        console.error('loginViaTelegram error', err);
        return null;
    }
}

/* Combined ensureAuth flow */
export async function ensureAuth() {
    let token = getStoredToken();
    if (token) {
        const info = await fetchAndStoreLoginInfo(token);
        if (info) return { token, user: info };
        // token invalid — clear and fall through to Telegram flow
        saveToken(null);
        saveUserInfo(null);
        token = null;
    }

    // 1) Prefer Telegram WebApp-injected initData
    const injectedInitData = (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData) ? window.Telegram.WebApp.initData : null;
    let initData = injectedInitData;

    // 2) Else try to extract from URL fragment
    if (!initData) {
        const fragInit = extractInitDataFromFragment();
        if (fragInit) initData = fragInit;
    }

    // 3) If we have initData, exchange it for token
    if (initData) {
        const loginResp = await loginViaTelegram(initData);
        const newToken = loginResp?.token || loginResp?.apiKey || null;
        if (newToken) {
            const info = await fetchAndStoreLoginInfo(newToken);
            return { token: newToken, user: info || loginResp?.user || null };
        }
    }

    return null;
}


/* ---------------------------
   Existing API functions
   --------------------------- */

export async function fetchPublic() {
    try {
        const res = await fetch(`${API_BASE}/dreams/global/get`);
        if (!res.ok) throw new Error(`Fetch public failed (${res.status})`);
        let payload;
        try { payload = await res.json(); } catch { payload = await res.text().catch(() => ''); }
        const items = normalize(payload);
        setPublicItems(items);
    } catch (err) {
        console.error(err);
        showToast('Failed to load public dreams');
        const cached = localStorage.getItem('public_cache');
        setPublicItems(cached ? JSON.parse(cached) : []);
    }
}

// concise fetchPersonal using Authorization: Bearer <token>
export async function fetchPersonal(payload = null) {
    try {
        const raw = localStorage.getItem(USER_INFO_KEY);
        let username = null;
        try {
            const parsed = raw ? JSON.parse(raw) : null;
            username = parsed?.username || null;
        } catch { username = null; }

        const token = localStorage.getItem(TOKEN_KEY) || null;
        const endpoint = username ? `/${encodeURIComponent(username)}/dreams/get` : '/user/dreams/get';
        const url = `${API_BASE}${endpoint}`;

        const headers = { 'Accept': 'application/json' };
        if (token) headers['Authorization'] = 'Bearer ' + token;
        const opts = payload ? { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) } : { method: 'GET', headers };

        const res = await fetch(url, opts);
        if (!res.ok) throw new Error(`Fetch personal failed (${res.status})`);
        const body = await res.json().catch(() => '');
        const items = normalize(body);
        setPersonalItems(items);
        return items;
    } catch (err) {
        console.error(err);
        showToast('Failed to load personal dreams');
        const cached = localStorage.getItem('personal_cache');
        const items = cached ? JSON.parse(cached) : [];
        setPersonalItems(items);
        return items;
    }
}

export async function createDream(payload) {
    try {
        const raw = localStorage.getItem(USER_INFO_KEY);
        let username = null;
        try { username = raw ? JSON.parse(raw).username : null; } catch { username = null; }

        if (!username) throw new Error('No username available');

        const res = await fetch(`${API_BASE}/${encodeURIComponent(username)}/dreams/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Create failed');
        const json = await res.json().catch(() => null);
        return json;
    } catch (err) {
        console.error(err);
        showToast('Create failed');
        return null;
    }
}

export async function deleteDream(id) {
    try {
        const res = await fetch(`${API_BASE}/dreams/${encodeURIComponent(id)}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Delete failed');
        return true;
    } catch (err) {
        console.error(err);
        showToast('Delete failed');
        return false;
    }
}
