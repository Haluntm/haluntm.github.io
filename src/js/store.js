// js/store.js - shared state and simple pub/sub
const state = {
    publicItems: [],
    personalItems: []
};

const listeners = new Map();

export function setPublicItems(items) {
    state.publicItems = Array.isArray(items) ? items : [];
    localStorage.setItem('public_cache', JSON.stringify(state.publicItems));
    emit('public');
}

export function setPersonalItems(items) {
    state.personalItems = Array.isArray(items) ? items : [];
    localStorage.setItem('personal_cache', JSON.stringify(state.personalItems));
    emit('personal');
}

export function getPublicItems() { return state.publicItems.slice(); }
export function getPersonalItems() { return state.personalItems.slice(); }

export function on(key, fn) {
    if (!listeners.has(key)) listeners.set(key, []);
    listeners.get(key).push(fn);
}

function emit(key) {
    const fns = listeners.get(key) || [];
    fns.forEach(fn => { try { fn(); } catch (e) { console.error(e); } });
}
