// js/views/me.js
import { fetchPersonal } from '../api.js';
import { renderPersonalList, showToast } from '../ui.js';

export function initMeView() {

    // attach actions inside Me view
    document.addEventListener('click', (e) => {
        if (e.target && e.target.id === 'btnNew') {
            e.preventDefault();
            showToast('Open New Dream modal (implement)');
            // implement modal or navigation to create page here
        }
        if (e.target && e.target.id === 'btnRefresh') {
            e.preventDefault();
            showToast('Refreshing personal dreams…');
            fetchPersonal().then(() => renderPersonalList());
        }
    });
}
