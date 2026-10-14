window.addEventListener('DOMContentLoaded', () => {
    loadTeamData();
});

// Holt die Profile live aus der team.json über deine Server-API
// REINER FUNKTIONSAUFRUF OHNE EIGENSTÄNDIGES EVENT-LISTENER
function loadTeamData() {
    fetch(API_BASE + '?action=team_list')
        .then(res => res.json())
        .then(teamList => {
            renderTeamCards(teamList);
        })
        .catch(err => {
            console.error("Fehler beim Laden des Teams:", err);
            const container = document.getElementById('team-cards-target');
            if (container) {
                container.innerHTML = `<p style="color: var(--accent-pink); text-align: center; width: 100%; font-family: var(--font-alt);">Verbindung zur Schnittstelle fehlgeschlagen.</p>`;
            }
        });
}

// Baut die Visitenkarten im korrekten Design auf
function renderTeamCards(teamList) {
    const container = document.getElementById('team-cards-target');
    if (!container) return;
    
    container.innerHTML = "";

    if (!teamList || teamList.length === 0) {
        container.innerHTML = `<p style="color: var(--text-muted); font-style: italic; text-align: center; width: 100%; font-family: var(--font-alt);">Keine Teammitglieder eingetragen.</p>`;
        return;
    }

    teamList.forEach(member => {
        const card = document.createElement('div');
        card.className = 'team-card-box';

        // Prüfen ob ein Bild vorhanden ist
        const imageHtml = member.image
            ? `<img src="${bildUrl(member.image)}?v=${Date.now()}" alt="${member.name}">`
            : `<div style="font-size: 0.8rem; color: var(--text-muted); font-family: var(--font-alt);">Kein Bild</div>`;

        // Social Media Icons
        let socialHtml = "";
        if (member.instagram) {
            socialHtml += `
                <a href="https://instagram.com{member.instagram}" target="_blank" class="team-social-item">
                    📸 <span>Insta</span>
                </a>`;
        }
        if (member.email) {
            socialHtml += `
                <a href="mailto:${member.email}" class="team-social-item">
                    ✉️ <span>E-Mail</span>
                </a>`;
        }

        card.innerHTML = `
            <div class="team-card-header">
                <div class="team-card-avatar">
                    ${imageHtml}
                </div>
                <div class="team-card-meta">
                    <div>
                        <div class="team-pink-label">NAME:</div>
                        <div class="team-display-field">${member.name || '-'}</div>
                    </div>
                    <div style="margin-top: 5px;">
                        <div class="team-pink-label">Dabei seit:</div>
                        <div class="team-display-field">${member.dabeiSeit || '-'}</div>
                    </div>
                </div>
            </div>

            <div class="team-card-block">
                <div class="team-pink-label">ÜBER MICH:</div>
                <div class="team-display-field team-tall-field">${member.ueberMich || '-'}</div>
            </div>

            <div class="team-card-block">
                <div class="team-pink-label">Fun fact:</div>
                <div class="team-display-field">${member.funFact || '-'}</div>
            </div>

            <div class="team-card-block">
                <div class="team-pink-label">Erreichbar über:</div>
                <div class="team-social-row">
                    ${socialHtml || '<span style="color: var(--text-muted); font-size: 0.8rem; font-style: italic; font-family: var(--font-alt);">-</span>'}
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}
