// js/api.js - centralized API calls and normalization
import { setPublicItems, setPersonalItems } from './store.js';
import { showToast } from './ui.js';

export const API_BASE = 'https://dreams.jalaljaleh.workers.dev'; // adjust

function normalize(payload) {
    if (!payload && payload !== 0) return [];
    if (Array.isArray(payload)) return payload;
    if (payload && typeof payload === 'object') {
        if (Array.isArray(payload.data)) return payload.data;
        if (Array.isArray(payload.items)) return payload.items;
        if (Array.isArray(payload.dreams)) return payload.dreams;
        // object keyed by id
        const vals = Object.values(payload);
        if (vals.length && vals.every(v => typeof v === 'object')) return vals;
    }
    if (typeof payload === 'string') {
        try { const p = JSON.parse(payload); if (Array.isArray(p)) return p; } catch { }
    }
    return [payload];
}

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
        const raw = localStorage.getItem('X_USER_INFO');
        let username = null;
        try {
            const parsed = raw ? JSON.parse(raw) : null;
            username = parsed?.username || null;
        } catch { username = null; }

        const token = localStorage.getItem('X_API_TOKEN') || null;
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
        const res = await fetch(`${API_BASE}/${localStorage.getItem(USER_INFO_KEY).data.username}/dreams/create`, {
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
