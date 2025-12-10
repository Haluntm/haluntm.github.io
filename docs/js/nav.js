// js/nav.js
// Navigation wiring that triggers data fetches when views are activated.
// Adds per-view "fetched" cache so repeated clicks do not re-fetch unless forced.

import { fetchPublic, fetchPersonal } from './api.js';
import { renderMainList, renderPersonalList, renderPublicList, showToast, setLoading } from './ui.js';

const lastFetched = {
    main: 0,
    me: 0,
    search: 0,
    people: 0
};
// TTL for considering data "fresh" (ms). Set to Infinity to never auto-refetch; use 0 to always fetch.
// We'll default to Infinity so fetch happens only once per view until user triggers refresh.
const FRESH_TTL = Infinity; // change to e.g., 60_000 for 1 minute freshness

export function initNav(onSwitch) {
    const navButtons = Array.from(document.querySelectorAll('.nav-btn'));
    navButtons.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            const view = btn.dataset.view;
            if (typeof onSwitch === 'function') onSwitch(view);
            // Trigger fetch for the view that was clicked, but only if not fetched before (or TTL expired)
            await handleViewFetch(view);
        });
    });
}

export function switchView(viewKey) {
    const views = {
        main: document.getElementById('view-main'),
        me: document.getElementById('view-me'),
        search: document.getElementById('view-search'),
        people: document.getElementById('view-people')
    };
    const navButtons = Array.from(document.querySelectorAll('.nav-btn'));

    Object.keys(views).forEach(k => {
        const v = views[k];
        if (!v) return;
        if (k === viewKey) { v.classList.add('active'); v.setAttribute('aria-hidden', 'false'); }
        else { v.classList.remove('active'); v.setAttribute('aria-hidden', 'true'); }
    });

    navButtons.forEach(btn => {
        const key = btn.dataset.view;
        const active = key === viewKey;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    // Render lists for the view immediately if data already present
    if (viewKey === 'main') renderMainList();
    if (viewKey === 'me') renderPersonalList();
    if (viewKey === 'search') renderPublicList();
}

/* Called when a nav button is clicked to fetch fresh data for that view */
let _fetchingView = null;
async function handleViewFetch(viewKey, { force = false } = {}) {
    // If already fetching this view, ignore duplicate clicks
    if (_fetchingView === viewKey) return;
    // If not forced and we fetched recently, skip
    const now = Date.now();
    if (!force && lastFetched[viewKey] && (now - lastFetched[viewKey] < FRESH_TTL)) {
        // already fetched and fresh
        return;
    }

    try {
        _fetchingView = viewKey;
        setLoading(true);

        if (viewKey === 'me') {
            await fetchPersonal();
            renderPersonalList();
        } else if (viewKey === 'search' || viewKey === 'people') {
            await fetchPublic();
            renderPublicList();
        } else if (viewKey === 'main') {
           
        }

        lastFetched[viewKey] = Date.now();
    } catch (err) {
        console.error('handleViewFetch error', err);
        showToast('Failed to load data');
    } finally {
        setLoading(false);
        _fetchingView = null;
    }
}

/* Export a helper to force-refresh a view (useful for your "Refresh" button) */
export async function refreshView(viewKey) {
    return handleViewFetch(viewKey, { force: true });
}
