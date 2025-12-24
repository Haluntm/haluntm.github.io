const API = "https://dreams.jalaljaleh.workers.dev";

let token = localStorage.getItem("token");
let username = null;
let editingDreamId = null;

const PAGE_SIZE = 40;
let page = 1, hasMore = true, isLoading = false;
let dreamControls = [];

/* ================= VIEW ================= */

function showView(id) {
    document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
    document.getElementById(id).classList.add("active");
}

/* ================= LOGIN ================= */

loginBtn.onclick = async () => {
    const res = await fetch(`${API}/user/login?username=${usernameInput.value}&password=${passwordInput.value}`);
    const json = await res.json();
    if (!json.ok) return alert(json.error);
    token = json.data;
    localStorage.setItem("token", token);
    loadUser();
};

async function loadUser() {
    const res = await fetch(`${API}/user/login_info`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    const json = await res.json();
    username = json.data.username;
    userName.textContent = json.data.display_name;
    showView("dreams-view");
    refreshDreams();
}

/* ================= DREAMS ================= */

async function refreshDreams() {
    page = 1; hasMore = true;
    dreamControls = [];
    dreamList.innerHTML = "";
    await loadNextPage();
}

async function loadNextPage() {
    if (isLoading || !hasMore) return;
    isLoading = true;

    const res = await fetch(`${API}/${username}/dreams/get?page=${page}&size=${PAGE_SIZE}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    const json = await res.json();
    const dreams = json.data || [];

    dreams.forEach(addDream);
    if (dreams.length < PAGE_SIZE) hasMore = false;
    page++;
    isLoading = false;
}

dreamList.addEventListener("scroll", () => {
    if (dreamList.scrollTop + dreamList.clientHeight >= dreamList.scrollHeight - 40)
        loadNextPage();
});

dreamList.addEventListener("click", e => {
    const card = e.target.closest(".dream-card");
    if (!card) return;

    const id = Number(card.dataset.id);
    const entry = dreamControls.find(x => x.dream.id === id);
    if (!entry) return;

    // Expand / collapse
    if (e.target.closest(".dream-header")) {
        card.querySelector(".dream-expanded").classList.toggle("hidden");
        return;
    }

    const action = e.target.dataset.action;
    if (!action) return;

    if (action === "copy") copyDream(entry.dream);
    if (action === "edit") editDream(entry.dream);
    if (action === "delete") deleteDream(entry.dream);
});


/* ================= DREAM UI ================= */

function addDream(dream) {
    const el = document.createElement("div");
    el.className = "dream-card";
    el.dataset.id = dream.id;

    el.innerHTML = `
      <div class="dream-header">
        <div class="dream-title">${dream.title || "[Untitled]"}</div>
        <div class="dream-meta">
          📅 ${dream.date_event || "No date"} ${dream.date_hour || ""}
          ${dream.location ? `| 📍 ${dream.location}` : ""}
          ${dream.is_imagination === 1 ? "| 🔮 Imagination" : ""}
          ${dream.lucidity ? `| ✨ ${dream.lucidity}` : ""}
          ${dream.importance ? `| 🔆 ${dream.importance}` : ""}
        </div>
      </div>

      <div class="dream-expanded hidden">
        ${section("Dream", dream.body)}
        ${section("Interpretation", dream.interpretation)}
        ${section("Foreshadowing", dream.foreshadowing)}
        ${section("Narration", dream.narration)}
        ${section("Purpose", dream.purpose)}
        ${section("Opinion", dream.opinion)}
        ${section("Cause", dream.cause)}
        ${section("People", dream.people)}

        <div class="dream-actions">
          <button data-action="copy">📋 Copy</button>
          <button data-action="edit">✏️ Edit</button>
          <button data-action="delete">🗑 Delete</button>
        </div>
      </div>
    `;

    dreamList.appendChild(el);
    dreamControls.push({ el, dream });
}
function section(title, value) {
    if (!value) return "";
    return `
      <div class="dream-section">
        <div class="dream-section-title">${title}</div>
        <div class="dream-section-body">${value}</div>
      </div>
    `;
}


/* ================= ACTIONS ================= */



function copyDream(d) {
    const text =
        `Title: ${d.title}
Body: ${d.body}
Purpose: ${d.purpose}
Narration: ${d.narration}
People: ${d.people}
Interpretation: ${d.interpretation}
Date: ${d.date_event} ${d.date_hour}
Location: ${d.location}
Opinion: ${d.opinion}
Imagination: ${d.is_imagination}
Importance: ${d.importance}`;

    navigator.clipboard.writeText(text);
}


async function deleteDream(d) {
    if (!confirm("Delete this dream?")) return;

    await fetch(`${API}/${username}/dreams/delete/${d.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
    });

    refreshDreams();
}

function editDream(d) {
    editingDreamId = d.id;

    edTitle.value = d.title || "";
    edBody.value = d.body || "";
    edInterpretation.value = d.interpretation || "";
    edOpinion.value = d.opinion || "";
    edCause.value = d.cause || "";
    edNarration.value = d.narration || "";
    edForeshadowing.value = d.foreshadowing || "";

    edPeople.value = d.people || "";
    edLocation.value = d.location || "";
    edPurpose.value = d.purpose || "";

    edDateEvent.value = d.date_event || "";
    edDateHour.value = d.date_hour || "";
    edDateOccurred.value = d.date_occurred || "";

    edLucidity.value = d.lucidity ?? 0;
    edImportance.value = d.importance ?? 0;

    edPublic.checked = d.is_public === 1;
    edOccurred.checked = d.is_occurred === 1;
    edSpoiler.checked = d.is_spoiler === 1;
    edLocked.checked = d.is_locked === 1;
    edImagination.checked = d.is_imagination === 1;

    showView("editor-view");
}


newDreamBtn.onclick = () => {
    editingDreamId = null;
    document.querySelectorAll("#editor-view input, #editor-view textarea").forEach(x => x.value = "");
    showView("editor-view");
};

function buildDreamPayload() {
    return {
        title: edTitle.value || null,
        body: edBody.value || null,
        interpretation: edInterpretation.value || null,
        opinion: edOpinion.value || null,
        cause: edCause.value || null,
        narration: edNarration.value || null,
        foreshadowing: edForeshadowing.value || null,

        people: edPeople.value || null,
        location: edLocation.value || null,
        purpose: edPurpose.value || null,

        date_event: edDateEvent.value || null,
        date_hour: edDateHour.value || null,
        date_occurred: edDateOccurred.value || null,

        lucidity: parseInt(edLucidity.value || 0),
        importance: parseInt(edImportance.value || 0),

        is_public: edPublic.checked ? 1 : 0,
        is_occurred: edOccurred.checked ? 1 : 0,
        is_spoiler: edSpoiler.checked ? 1 : 0,
        is_locked: edLocked.checked ? 1 : 0,
        is_imagination: edImagination.checked ? 1 : 0
    };
}


saveEditBtn.onclick = async () => {
    const payload = buildDreamPayload();

    const url = editingDreamId
        ? `${API}/${username}/dreams/edit/${editingDreamId}`
        : `${API}/user/dreams/create`;

    const res = await fetch(url, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });

    const json = await res.json();
    if (!json.ok) {
        alert(json.error || "Failed to save dream");
        return;
    }

    showView("dreams-view");
    refreshDreams();
};

cancelEditBtn.onclick = () => showView("dreams-view");

refreshBtn.onclick = refreshDreams;

if (token) loadUser();

