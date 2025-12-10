// js/views/search.js
import { fetchPublic } from '../api.js';
import { renderPublicList } from '../ui.js';

export function initSearchView() {
    // initial load already done in app init; provide a manual refresh hook if needed
    // Example: when search view becomes active, ensure public list is fresh
    // The nav.switchView calls renderPublicList when switching to 'search'
    // Optionally, you can auto-refresh:
    // fetchPublic().then(renderPublicList);
}
