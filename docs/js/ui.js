// js/ui.js - shared UI helpers and card renderer
import { getPublicItems, getPersonalItems } from './store.js';
import { deleteDream } from './api.js';

let itemsPublic = [];
let itemsPersonal = [];

const el = {
    toast: document.getElementById('toast'),
    viewMain: document.getElementById('view-main'),
    viewMe: document.getElementById('view-me'),
    viewSearch: document.getElementById('view-search'),
    viewPeople: document.getElementById('view-people')
};

export function initUI() {
    // initial markup for views
    if (el.viewMain) el.viewMain.innerHTML = `<div class="panel"><h2>Main</h2><div id="mainList" class="list"></div><div id="mainEmpty" class="empty">No items</div></div>`;
    if (el.viewMe) el.viewMe.innerHTML = `<div class="panel"><h2>Me</h2><div class="me-actions"><button id="btnNew" class="btn primary">New Dream</button><button id="btnRefresh" class="btn">Refresh</button></div><div id="meList" class="list"></div><div id="meEmpty" class="empty">No personal dreams</div></div>`;
    if (el.viewSearch) el.viewSearch.innerHTML = `<div class="panel"><h2>Search</h2><div id="searchList" class="list"></div><div id="searchEmpty" class="empty">No public dreams</div></div>`;
    if (el.viewPeople) el.viewPeople.innerHTML = `<div class="panel"><h2>People</h2><p class="muted">People list placeholder</p></div>`;
}

/* Toast helper (single export) */
export function showToast(msg, ms = 1400) {
    if (!el.toast) { console.log('Toast:', msg); return; }
    el.toast.textContent = msg;
    el.toast.classList.add('show');
    setTimeout(() => el.toast.classList.remove('show'), ms);
}

/* Loading indicator helper (exported for nav.js) */
let _loadingCount = 0;
export function setLoading(on) {
    try {
        const toast = document.getElementById('toast');
        if (on) {
            _loadingCount++;
            if (toast) {
                toast.textContent = 'Loading…';
                toast.classList.add('show');
            } else {
                let ov = document.getElementById('app-loading-overlay');
                if (!ov) {
                    ov = document.createElement('div');
                    ov.id = 'app-loading-overlay';
                    ov.style.position = 'fixed';
                    ov.style.left = 0;
                    ov.style.top = 0;
                    ov.style.right = 0;
                    ov.style.bottom = 0;
                    ov.style.background = 'rgba(0,0,0,0.35)';
                    ov.style.display = 'flex';
                    ov.style.alignItems = 'center';
                    ov.style.justifyContent = 'center';
                    ov.style.zIndex = 9999;
                    ov.innerHTML = `<div style="padding:12px 18px;border-radius:8px;background:#111;color:#fff">Loading…</div>`;
                    document.body.appendChild(ov);
                } else {
                    ov.style.display = 'flex';
                }
            }
        } else {
            _loadingCount = Math.max(0, _loadingCount - 1);
            if (_loadingCount > 0) return;
            if (toast) {
                toast.classList.remove('show');
            }
            const ov = document.getElementById('app-loading-overlay');
            if (ov) ov.style.display = 'none';
        }
    } catch (e) {
        console.error('setLoading error', e);
    }
}

/* Render helpers used by views */

/* Main view: mix of public and personal (featured) */
export function renderMainList() {
    const container = document.getElementById('mainList');
    const empty = document.getElementById('mainEmpty');
  
}

export function renderPersonalList() {
    const container = document.getElementById('meList');
    const empty = document.getElementById('meEmpty');
    const items = getPersonalItems();
    renderListInto(container, empty, items);
}

export function renderPublicList() {
    const container = document.getElementById('searchList');
    const empty = document.getElementById('searchEmpty');
    const items = getPublicItems();
    renderListInto(container, empty, items);
}

function renderListInto(container, emptyEl, items) {
    if (!container) return;
    container.innerHTML = '';
    if (!items || items.length === 0) {
        if (emptyEl) emptyEl.style.display = 'block';
        return;
    }
    if (emptyEl) emptyEl.style.display = 'none';
    items.forEach(item => {
        try {
            container.appendChild(createCard(item));
        } catch (e) {
            console.error('renderListInto item render error', e, item);
        }
    });
}

function createCard(item) {
    const wrapper = document.createElement('div');
    wrapper.className = 'card';
    wrapper.dataset.id = item?.id ?? '';

    const ownerName = item?.owner?.display_name || item?.displayName || '[DisplayName]';
    const title = item?.title || 'Dream Title';
    const date = item?.date_event || item?.date_created || '';
    const location = item?.location || '';
    const lucidity = item?.lucidity ?? '';
    const importance = item?.importance ?? '';
    const occurred = item?.is_occurred ? 'Yes' : 'No';

    wrapper.innerHTML = `
    <div class="row-header" tabindex="0">
      <div class="avatar"><span class="emoji">👤</span><div class="display">${escapeHtml(ownerName)}</div></div>
      <div class="header-main">
        <h3 class="title">${escapeHtml(title)}</h3>
        <div class="meta">
          <span class="chip">📅 <span class="small-text">${escapeHtml(date)}</span></span>
          <span class="chip">📍 <span class="small-text">${escapeHtml(location)}</span></span>
          <span class="chip">✨ <span class="small-text">${escapeHtml(String(lucidity))}</span></span>
          <span class="chip">🔆 <span class="small-text">${escapeHtml(String(importance))}</span></span>
          <span class="chip">⚡ <span class="small-text">${escapeHtml(occurred)}</span></span>
        </div>
      </div>
    </div>
    <div class="expand-body" aria-hidden="true">
      <div class="panel-content">
        <section><h4>Dream</h4><p>${escapeHtml(item?.body || '')}</p></section>
        <div class="panel-actions">
          <button class="btn copy">Copy</button>
          <button class="btn edit">Edit</button>
          <button class="btn delete">Delete</button>
        </div>
      </div>
    </div>
  `;

    const header = wrapper.querySelector('.row-header');
    const expand = wrapper.querySelector('.expand-body');
    header?.addEventListener('click', () => {
        const open = expand.classList.toggle('open');
        expand.setAttribute('aria-hidden', !open);
    });

    wrapper.querySelector('.copy')?.addEventListener('click', () => {
        const text = item?.body || '';
        navigator.clipboard?.writeText(text).then(() => showToast('Copied')).catch(() => showToast('Copy failed'));
    });

    wrapper.querySelector('.edit')?.addEventListener('click', (e) => {
        e.stopPropagation();
        showToast('Edit not implemented');
    });

    wrapper.querySelector('.delete')?.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!confirm('Delete this dream?')) return;
        const ok = await deleteDream(item?.id);
        if (ok) {
            showToast('Deleted');
            // remove card from DOM immediately
            try { wrapper.remove(); } catch (e) { /* ignore */ }
        } else {
            showToast('Delete failed');
        }
    });

    return wrapper;
}

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
