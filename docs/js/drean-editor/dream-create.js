// editor.js
// Replace API_BASE with your server endpoint
const API_BASE = 'https://api.example.com'; // update to real API

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('dreamForm');
    const btnSave = document.getElementById('btnSave');
    const btnCancel = document.getElementById('btnCancel');

    // range outputs
    const lucidity = document.getElementById('lucidity');
    const lucidityVal = document.getElementById('lucidityVal');
    const importance = document.getElementById('importance');
    const importanceVal = document.getElementById('importanceVal');
    lucidity.addEventListener('input', () => lucidityVal.textContent = lucidity.value);
    importance.addEventListener('input', () => importanceVal.textContent = importance.value);

    // Cancel behavior
    btnCancel.addEventListener('click', () => {
        if (confirm('Discard changes?')) window.history.back();
    });

    // Save behavior
    btnSave.addEventListener('click', async (e) => {
        e.preventDefault();
        if (!form.reportValidity()) return;

        const payload = collectForm();
        try {
            // If id exists, update; otherwise create
            if (payload.id) {
                const res = await fetch(`${API_BASE}/dreams/${encodeURIComponent(payload.id)}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (!res.ok) throw new Error('Update failed');
                alert('Dream updated');
            } else {
                const res = await fetch(`${API_BASE}/dreams`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (!res.ok) throw new Error('Create failed');
                alert('Dream created');
            }
            // after success you can redirect or clear form
            window.location.reload();
        } catch (err) {
            console.error(err);
            alert('Save failed. Check console for details.');
        }
    });

    // If you want to prefill for edit, call loadDraft(id)
    // Example: loadDraft(123);

    function collectForm() {
        // collect all fields matching tbl_dreams
        const get = id => document.getElementById(id);
        const parseBool = el => el && el.checked ? 1 : 0;
        const parseNum = v => v === '' ? null : Number(v);

        return {
            id: get('id').value || null,
            user_id: parseNum(get('user_id').value),
            title: get('title').value.trim(),
            body: get('body').value.trim(),
            date_event: get('date_event').value || null,
            date_created: new Date().toISOString(),
            opinion: get('opinion').value.trim(),
            cause: get('cause').value.trim(),
            interpretation: get('interpretation').value.trim(),
            lucidity: parseNum(get('lucidity').value),
            is_public: parseBool(get('is_public')),
            location: get('location').value.trim(),
            purpose: get('purpose').value.trim(),
            people: get('people').value.trim(),
            is_occurred: parseBool(get('is_occurred')),
            is_spoiler: parseBool(get('is_spoiler')),
            is_locked: parseBool(get('is_locked')) ? 1 : 0,
            foreshadowing: get('foreshadowing').value.trim(),
            date_occurred: get('date_occurred').value || null,
            narration: get('narration').value.trim(),
            date_hour: get('date_hour').value || null,
            is_imagination: parseBool(get('is_imagination')),
            importance: parseNum(get('importance').value)
        };
    }

    // Optional helper to load an existing dream into the form
    async function loadDraft(id) {
        try {
            const res = await fetch(`${API_BASE}/dreams/${encodeURIComponent(id)}`);
            if (!res.ok) throw new Error('Load failed');
            const data = await res.json();
            Object.keys(data).forEach(k => {
                const el = document.getElementById(k);
                if (!el) return;
                if (el.type === 'checkbox') el.checked = !!data[k];
                else el.value = data[k] ?? '';
            });
            // update range outputs
            lucidityVal.textContent = lucidity.value;
            importanceVal.textContent = importance.value;
        } catch (err) {
            console.error(err);
            alert('Failed to load draft');
        }
    }

    // Expose loadDraft globally if needed
    window.loadDreamEditor = loadDraft;
});
