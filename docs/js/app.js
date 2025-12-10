// js/app.js - entry + Telegram login flow
import { initNav, switchView } from './nav.js';
import { initUI } from './ui.js';
import { initMeView } from './views/me.js';
import { initSearchView } from './views/search.js';
import { initMainView } from './views/main.js';
import { fetchPublic, fetchPersonal } from './api.js';

/* Local storage keys */
const TOKEN_KEY = 'X_API_TOKEN';
const USER_INFO_KEY = 'X_USER_INFO';

/* Helper: read token from localStorage */
function getStoredToken() {
    try { return localStorage.getItem(TOKEN_KEY); } catch (e) { return null; }
}

/* Helper: save token to localStorage */
function saveToken(token) {
    try { if (token) localStorage.setItem(TOKEN_KEY, token); else localStorage.removeItem(TOKEN_KEY); } catch (e) { /* ignore */ }
}

/* Helper: save user info JSON */
function saveUserInfo(obj) {
    try { if (obj) localStorage.setItem(USER_INFO_KEY, JSON.stringify(obj)); else localStorage.removeItem(USER_INFO_KEY); } catch (e) { /* ignore */ }
}

/* Fetch /user/login_info using x-api-token header and store result */
async function fetchAndStoreLoginInfo(token) {
    if (!token) return null;
    try {
        const res = await fetch('https://dreams.jalaljaleh.workers.dev/user/login_info', {
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

/* Send Telegram initData to /user/login_telegram to obtain token */
async function loginViaTelegram(initDataRaw) {
    try {
        const res = await fetch('https://dreams.jalaljaleh.workers.dev/user/login_telegram', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ initData: initDataRaw })
        });
        if (!res.ok) {
            console.warn('login_telegram failed', res.status);
            return null;
        }
        const payload = await res.json().catch(() => null);
        // Expect payload.token (or payload.apiKey) and payload.user
        const token = payload?.token || payload?.apiKey || null;
        if (token) saveToken(token);
        if (payload?.user) saveUserInfo(payload.user);
        return payload;
    } catch (err) {
        console.error('loginViaTelegram error', err);
        return null;
    }
}

/* Try to ensure we have a token and user info:
   1) If token exists, call /user/login_info to refresh user info.
   2) Else if Telegram WebApp initData exists, call /user/login_telegram to get token.
   3) If we obtain token, call /user/login_info and persist user info.
*/
async function ensureAuth() {
    let token = getStoredToken();
    if (token) {
        // try to refresh user info
        const info = await fetchAndStoreLoginInfo(token);
        if (info) return { token, user: info };
        // token invalid: clear and fallthrough to Telegram login
        saveToken(null);
        saveUserInfo(null);
        token = null;
    }

    // If running inside Telegram WebApp, attempt login
    const initData = (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData) ? window.Telegram.WebApp.initData : null;
    if (initData) {
        const loginResp = await loginViaTelegram(initData);
        const newToken = loginResp?.token || loginResp?.apiKey || null;
        if (newToken) {
            const info = await fetchAndStoreLoginInfo(newToken);
            return { token: newToken, user: info || loginResp?.user || null };
        }
    }

    // No token obtained
    return null;
}

/* App init */
async function init() {


    // Ensure authentication first, then load data
    try {
      /*  saveToken('');*/
        const auth = await ensureAuth();
        if (auth && auth.token) {
            // we have token and maybe user info
            console.log('Authenticated, token present');
        } else {
            console.log('No token available (anonymous)');
        }

    } catch (e) {
        console.error('Auth flow error', e);
    }

    initUI();            // toast, shared UI wiring
    initNav(switchView); // nav wiring
    initMainView();      // mount main view
    initMeView();        // mount me view (New + Refresh)
    initSearchView();    // mount search view
    switchView('main');  // default

    // initial data load: public for search, personal for me
    // fetchPersonal will use stored user info/token if your api.js is wired to read them
  //  await Promise.all([fetchPublic(), fetchPersonal()]);
}

document.addEventListener('DOMContentLoaded', init);
