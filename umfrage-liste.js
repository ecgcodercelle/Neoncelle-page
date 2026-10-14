// ==========================================================================
// NEON CELLE — Umfrage-Übersicht & Ergebnisse (Admin)
// ==========================================================================

async function loadUmfrageListe() {
    const tbody = document.getElementById("umfrage-liste-body");
    if (!tbody) return;

    try {
        const res = await fetch(API_BASE + "?action=umfrage_list");
        const liste = await res.json();
        renderUmfrageListe(liste);
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#aaa; padding:20px;">Fehler beim Laden: ${err.message}</td></tr>`;
    }
}

function renderUmfrageListe(liste) {
    const tbody = document.getElementById("umfrage-liste-body");
    tbody.innerHTML = "";

    if (!liste.length) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#aaa; padding:20px;">Noch keine Umfragen erstellt.</td></tr>`;
        return;
    }

    liste.forEach(u => {
        const tr = document.createElement("tr");
        const statusLabel = u.aktiv ? "🟢 Aktiv" : "⚪ Inaktiv";
        const linkInfo = u.custom_link
            ? `<br><small style="color:#DE5D93; word-break:break-all;">🔗 Extern</small>`
            : `<br><small style="color:#888;">/abstimmen.html?id=${u.id}</small>`;

        tr.innerHTML = `
            <td style="font-weight:bold;">${u.titel}${linkInfo}</td>
            <td>${new Date(u.erstellt_am).toLocaleDateString('de-DE')}</td>
            <td>${u.antworten}</td>
            <td>${statusLabel}</td>
            <td>
                <div class="action-btn-group">
                    ${u.custom_link ? "" : `<button class="btn-edit" onclick="zeigeErgebnis(${u.id})">Ergebnisse</button>`}
                    <button class="btn-edit" onclick="toggleUmfrage(${u.id})">${u.aktiv ? "Deaktivieren" : "Aktivieren"}</button>
                    <button class="btn-delete" onclick="loescheUmfrage(${u.id})">Löschen</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function toggleUmfrage(id) {
    await fetch(API_BASE + `?action=umfrage_toggle&id=${id}`, { method: "POST" });
    loadUmfrageListe();
}

async function loescheUmfrage(id) {
    if (!confirm("Diese Umfrage inklusive aller Antworten unwiderruflich löschen?")) return;
    await fetch(API_BASE + `?action=umfrage_delete&id=${id}`, { method: "POST" });
    document.getElementById("ergebnis-panel")?.classList.add("hidden");
    loadUmfrageListe();
}

async function zeigeErgebnis(id) {
    const panel = document.getElementById("ergebnis-panel");
    const inhalt = document.getElementById("ergebnis-inhalt");
    if (!panel || !inhalt) return;

    inhalt.innerHTML = "Lade Ergebnisse...";
    panel.classList.remove("hidden");
    panel.scrollIntoView({ behavior: "smooth", block: "start" });

    try {
        const res = await fetch(API_BASE + `?action=umfrage_ergebnis&id=${id}`);
        const daten = await res.json();
        if (!res.ok) throw new Error(daten.error || "Fehler beim Laden.");

        let html = `<h3 style="margin-bottom:6px;">${daten.titel}</h3>`;
        html += `<p style="color:#888; margin-bottom:20px;">${daten.teilnehmer} Teilnehmer insgesamt</p>`;

        daten.fragen.forEach(frage => {
            html += `<div class="question-block"><div class="question-title-label" style="margin-bottom:12px;">${frage.frage_text}</div>`;

            if (frage.frage_typ === "text") {
                if (frage.freitexte.length === 0) {
                    html += `<p style="color:#888;">Noch keine Antworten.</p>`;
                } else {
                    html += `<ul style="padding-left:20px; color:#ccc;">`;
                    frage.freitexte.forEach(t => { html += `<li>${t}</li>`; });
                    html += `</ul>`;
                }
            } else {
                const gesamtStimmen = frage.optionen.reduce((s, o) => s + o.anzahl, 0) || 1;
                frage.optionen.forEach(o => {
                    const prozent = Math.round((o.anzahl / gesamtStimmen) * 100);
                    html += `
                        <div style="margin-bottom:10px;">
                            <div style="display:flex; justify-content:space-between; font-size:0.9rem; margin-bottom:4px;">
                                <span>${o.option_text}</span>
                                <span style="color:#DE5D93; font-weight:bold;">${o.anzahl} (${prozent}%)</span>
                            </div>
                            <div style="background:#1a1a1a; border-radius:8px; overflow:hidden; height:10px;">
                                <div style="background:var(--accent-neon); width:${prozent}%; height:100%;"></div>
                            </div>
                        </div>
                    `;
                });
            }
            html += `</div>`;
        });

        inhalt.innerHTML = html;
    } catch (err) {
        inhalt.innerHTML = `<p style="color:#ff0055;">Fehler: ${err.message}</p>`;
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadUmfrageListe);
} else {
    loadUmfrageListe();
}
