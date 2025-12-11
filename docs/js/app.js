// js/app.js - entry + Telegram login flow (now delegates auth to api.js)
import { initNav, switchView } from './nav.js';
import { initUI } from './ui.js';
import { initMeView } from './views/me.js';
import { initSearchView } from './views/search.js';
import { initMainView } from './views/main.js';
import { fetchPublic, fetchPersonal, ensureAuth } from './api.js';

/* App init */
async function init() {
    // Ensure authentication first, then load data
    try {
        const auth = await ensureAuth();
        if (auth && auth.token) {
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
    // await Promise.all([fetchPublic(), fetchPersonal()]);
}

document.addEventListener('DOMContentLoaded', init);
