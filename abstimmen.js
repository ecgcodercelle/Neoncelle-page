// ==========================================================================
// NEON CELLE — Umfrage teilnehmen (öffentlich)
// ==========================================================================

const listeEl = document.getElementById("umfrage-liste-ansicht");
const detailEl = document.getElementById("umfrage-detail-ansicht");

async function init() {
    const params = new URLSearchParams(location.search);
    const direktId = params.get("id");

    if (direktId) {
        listeEl.classList.add("hidden");
        detailEl.classList.remove("hidden");
        ladeUmfrageDetail(direktId);
        return;
    }

    try {
        const res = await fetch(API_BASE + "?action=umfrage_list");
        const alle = await res.json();
        const aktive = alle.filter(u => u.aktiv);
        renderListe(aktive);
    } catch (err) {
        listeEl.innerHTML = `<p style="color:#ff0055;">Umfragen konnten nicht geladen werden.</p>`;
    }
}

function renderListe(liste) {
    if (liste.length === 0) {
        listeEl.innerHTML = `<div class="umfrage-card"><p>Aktuell läuft keine Umfrage. Schau später nochmal vorbei ✨</p></div>`;
        return;
    }

    listeEl.innerHTML = liste.map(u => {
        if (u.custom_link) {
            return `
                <div class="umfrage-card">
                    <h3>${u.titel}</h3>
                    <p>${u.beschreibung || ""}</p>
                    <a class="btn btn-primary" href="${u.custom_link}" target="_blank" rel="noopener">Zur Umfrage ⚡</a>
                </div>
            `;
        }
        return `
            <div class="umfrage-card">
                <h3>${u.titel}</h3>
                <p>${u.beschreibung || ""}</p>
                <button class="btn btn-primary" onclick="starteUmfrage(${u.id})">Teilnehmen ⚡</button>
            </div>
        `;
    }).join("");
}

function starteUmfrage(id) {
    listeEl.classList.add("hidden");
    detailEl.classList.remove("hidden");
    ladeUmfrageDetail(id);
}

async function ladeUmfrageDetail(id) {
    detailEl.innerHTML = "Lade Umfrage...";
    try {
        const res = await fetch(API_BASE + `?action=umfrage_get&id=${id}`);
        const umfrage = await res.json();
        if (!res.ok) throw new Error(umfrage.error || "Umfrage nicht gefunden.");

        if (umfrage.custom_link) {
            window.location.href = umfrage.custom_link;
            return;
        }

        renderFormular(umfrage);
    } catch (err) {
        detailEl.innerHTML = `<p style="color:#ff0055;">${err.message}</p>`;
    }
}

function renderFormular(umfrage) {
    let html = `<div class="umfrage-card"><h3>${umfrage.titel}</h3><p>${umfrage.beschreibung || ""}</p>`;
    html += `<form id="teilnahme-form">`;

    umfrage.fragen.forEach(frage => {
        html += `<div class="umfrage-frage-block"><span class="frage-label">${frage.frage_text}</span>`;

        if (frage.frage_typ === "choice") {
            frage.optionen.forEach(o => {
                html += `
                    <label class="umfrage-option-row">
                        <input type="radio" name="frage-${frage.id}" value="${o.id}" required>
                        <span>${o.option_text}</span>
                    </label>
                `;
            });
        } else if (frage.frage_typ === "checkbox") {
            frage.optionen.forEach(o => {
                html += `
                    <label class="umfrage-option-row">
                        <input type="checkbox" name="frage-${frage.id}" value="${o.id}">
                        <span>${o.option_text}</span>
                    </label>
                `;
            });
        } else if (frage.frage_typ === "dropdown") {
            html += `<select class="umfrage-select" name="frage-${frage.id}" required>
                        <option value="" disabled selected>Bitte wählen...</option>`;
            frage.optionen.forEach(o => {
                html += `<option value="${o.id}">${o.option_text}</option>`;
            });
            html += `</select>`;
        } else {
            html += `<textarea class="umfrage-textarea" name="frage-${frage.id}" rows="3" placeholder="Deine Antwort..."></textarea>`;
        }

        html += `</div>`;
    });

    html += `
        <button type="submit" class="btn btn-primary" style="width:100%;">Absenden ⚡</button>
        <div id="teilnahme-status"></div>
        </form></div>
    `;

    detailEl.innerHTML = html;

    document.getElementById("teilnahme-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const antworten = [];

        umfrage.fragen.forEach(frage => {
            const feldName = `frage-${frage.id}`;
            if (frage.frage_typ === "choice" || frage.frage_typ === "dropdown") {
                const gewaehlt = document.querySelector(`[name="${feldName}"]:checked, select[name="${feldName}"]`);
                const wert = frage.frage_typ === "dropdown" ? gewaehlt?.value : gewaehlt?.value;
                if (wert) antworten.push({ frage_id: frage.id, option_id: parseInt(wert) });
            } else if (frage.frage_typ === "checkbox") {
                document.querySelectorAll(`[name="${feldName}"]:checked`).forEach(el => {
                    antworten.push({ frage_id: frage.id, option_id: parseInt(el.value) });
                });
            } else {
                const text = document.querySelector(`[name="${feldName}"]`)?.value.trim();
                if (text) antworten.push({ frage_id: frage.id, freitext: text });
            }
        });

        const statusBox = document.getElementById("teilnahme-status");
        try {
            const res = await fetch(API_BASE + `?action=umfrage_antwort&id=${umfrage.id}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ antworten })
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || "Fehler beim Absenden.");

            detailEl.innerHTML = `<div class="umfrage-card"><h3>Danke! 🎉</h3><p>Deine Antwort wurde gespeichert.</p></div>`;
        } catch (err) {
            statusBox.className = "umfrage-status fehler";
            statusBox.innerText = err.message;
        }
    });
}

init();
