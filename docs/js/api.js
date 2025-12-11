// js/api.js - clean and complete API + Telegram auth
import { setPublicItems, setPersonalItems } from './store.js';
import { showToast } from './ui.js';

export const API_BASE = 'https://dreams.jalaljaleh.workers.dev';

export const TOKEN_KEY = 'X_API_TOKEN';
export const USER_INFO_KEY = 'X_USER_INFO';

/* ---------------------------
   Utility helpers
----------------------------*/

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
        try {
            const p = JSON.parse(payload);
            if (Array.isArray(p)) return p;
        } catch { }
    }

    return [payload];
}

export function getStoredToken() {
    try { return localStorage.getItem(TOKEN_KEY); }
    catch { return null; }
}

export function saveToken(token) {
    try {
        if (!token) localStorage.removeItem(TOKEN_KEY);
        else localStorage.setItem(TOKEN_KEY, token);
    } catch { }
}

export function saveUserInfo(obj) {
    try {
        if (!obj) localStorage.removeItem(USER_INFO_KEY);
        else localStorage.setItem(USER_INFO_KEY, JSON.stringify(obj));
    } catch { }
}

/* ---------------------------
   Login Info
----------------------------*/

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

        if (!res.ok) return null;

        const json = await res.json().catch(() => null);
        if (json) saveUserInfo(json.data);
        return json?.data || null;

    } catch {
        return null;
    }
}

/* ---------------------------
   REAL Telegram WebApp Login
----------------------------*/

export async function telegramLogin() {
    const initData = window.Telegram?.WebApp?.initData;
    if (!initData) {
        showToast("Missing Telegram initData");
        return null;
    }

    const res = await fetch(`${API_BASE}/user/login_telegram`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData })
    });

    let json = null;
    try { json = await res.json(); } catch { }

    if (!json?.ok) {
        console.warn("Telegram login failed:", json);
        showToast("Login failed");
        return null;
    }

    saveToken(json.token);
    saveUserInfo(json.user);

    return json;
}

/* ---------------------------
   ensureAuth()
----------------------------*/

export async function ensureAuth() {
    // 1) Try existing token
    let token = getStoredToken();
    if (token) {
        const info = await fetchAndStoreLoginInfo(token);
        if (info) return { token, user: info };

        // token invalid
        saveToken(null);
        saveUserInfo(null);
    }

    // 2) Login via Telegram WebApp
    const result = await telegramLogin();
    if (!result) return null;

    const freshToken = result.token;
    const info = await fetchAndStoreLoginInfo(freshToken);

    return { token: freshToken, user: info || result.user };
}

/* ---------------------------
   Public Data
----------------------------*/

export async function fetchPublic() {
    try {
        const res = await fetch(`${API_BASE}/dreams/global/get`);
        if (!res.ok) throw new Error();

        const payload = await res.json().catch(() => []);
        const items = normalize(payload);

        setPublicItems(items);

    } catch (err) {
        showToast("Failed to load public dreams");
        const cached = localStorage.getItem("public_cache");
        setPublicItems(cached ? JSON.parse(cached) : []);
    }
}

/* ---------------------------
   Personal Data
----------------------------*/

export async function fetchPersonal(payload = null) {
    try {
        const raw = localStorage.getItem(USER_INFO_KEY);
        let username = null;

        try { username = raw ? JSON.parse(raw).username : null; } catch { }

        const token = getStoredToken();
        const endpoint = username
            ? `/${encodeURIComponent(username)}/dreams/get`
            : '/user/dreams/get';

        const url = `${API_BASE}${endpoint}`;

        const headers = { 'Accept': 'application/json' };
        if (token) headers['Authorization'] = 'Bearer ' + token;

        const opts = payload
            ? { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
            : { method: 'GET', headers };

        const res = await fetch(url, opts);
        if (!res.ok) throw new Error();

        const body = await res.json().catch(() => []);
        const items = normalize(body);

        setPersonalItems(items);
        return items;

    } catch {
        showToast("Failed to load personal dreams");
        const cached = localStorage.getItem("personal_cache");
        const items = cached ? JSON.parse(cached) : [];
        setPersonalItems(items);
        return items;
    }
}

/* ---------------------------
   Create Dream
----------------------------*/

export async function createDream(payload) {
    try {
        const raw = localStorage.getItem(USER_INFO_KEY);
        let username = null;

        try { username = raw ? JSON.parse(raw).username : null; } catch { }

        if (!username) throw new Error("missing_username");

        const res = await fetch(`${API_BASE}/${encodeURIComponent(username)}/dreams/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error();

        return await res.json().catch(() => null);

    } catch {
        showToast("Create failed");
        return null;
    }
}

/* ---------------------------
   Delete Dream
----------------------------*/

export async function deleteDream(id) {
    try {
        const res = await fetch(`${API_BASE}/dreams/${encodeURIComponent(id)}`, {
            method: 'DELETE'
        });

        if (!res.ok) throw new Error();
        return true;

    } catch {
        showToast("Delete failed");
        return false;
    }
}
