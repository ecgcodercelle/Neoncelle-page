let lokaleDaten = [];
let loeschModusAktiv = false;

const canvas = document.getElementById('editor-canvas');
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const deleteModeBtn = document.getElementById('delete-mode-btn');

// 1. Daten vom Server laden beim Start
async function initialisieren() {
    try {
        const antwort = await fetch(API_BASE + '?action=galerie_list');
        lokaleDaten = await antwort.json();
        renderCanvas();
    } catch (f) {
        console.error("Fehler beim Laden der Daten:", f);
    }
}

// Rendert alle Elemente auf der Arbeitsfläche neu
function renderCanvas() {
    canvas.innerHTML = ''; 
    lokaleDaten.forEach((daten, index) => {
        erstelleBildAufCanvas(daten, index);
    });
}

// 2. Element visuell auf der Arbeitsfläche erzeugen
function erstelleBildAufCanvas(daten, index) {
    const item = document.createElement('div');
    item.classList.add('editor-item');
    item.dataset.index = index;

    item.style.left = `${daten.position.x}px`;
    item.style.top = `${daten.position.y}px`;
    item.style.width = `${daten.breite}px`;
    item.style.height = `${daten.hoehe}px`;

    const img = document.createElement('img');
    img.src = bildUrl(daten.bilderpfad);
    item.appendChild(img);
    canvas.appendChild(item);

    // Klick-Logik für das Löschen
    item.addEventListener('click', (e) => {
        if (loeschModusAktiv) {
            e.stopPropagation();
            lokaleDaten.splice(index, 1);
            renderCanvas();
        }
    });

    macheVerschiebbar(item, index);
    macheSkalierbar(item, index);
}

// 3. Logik zum Verschieben mit der Maus
function macheVerschiebbar(element, index) {
    let aktiv = false;
    let StartX, StartY;

    element.addEventListener('mousedown', (e) => {
        if (loeschModusAktiv) return; 
        aktiv = true;
        element.classList.add('active');
        StartX = e.clientX - element.offsetLeft;
        StartY = e.clientY - element.offsetTop;
    });

    document.addEventListener('mousemove', (e) => {
        if (!aktiv || loeschModusAktiv) return;
        let neuX = e.clientX - StartX;
        let neuY = e.clientY - StartY;

        if(neuX < 0) neuX = 0;
        if(neuY < 0) neuY = 0;

        element.style.left = `${neuX}px`;
        element.style.top = `${neuY}px`;

        lokaleDaten[index].position.x = neuX;
        lokaleDaten[index].position.y = neuY;
    });

    document.addEventListener('mouseup', () => {
        if(aktiv) {
            aktiv = false;
            element.classList.remove('active');
        }
    });
}

// 4. Proportionales Vergrößern/Verkleinern per Mausrad
function macheSkalierbar(element, index) {
    element.addEventListener('wheel', (e) => {
        e.preventDefault();
        if (loeschModusAktiv) return;

        let daten = lokaleDaten[index];
        let verhaeltnis = daten.hoehe / daten.breite;
        let aenderung = e.deltaY < 0 ? 20 : -20; 

        let neueBreite = daten.breite + aenderung;
        if (neueBreite < 50) neueBreite = 50; 

        let neueHoehe = Math.round(neueBreite * verhaeltnis);

        daten.breite = neueBreite;
        daten.hoehe = neueHoehe;
        element.style.width = `${neueBreite}px`;
        element.style.height = `${neueHoehe}px`;
    }, { passive: false });
}

// 5. Drag & Drop Upload-Zone Events
dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    // Korrektur: Extrahiert die erste echte Datei aus dem Drag-Event
    if (e.dataTransfer.files.length) uploadDatei(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', () => {
    // Korrektur: Extrahiert die erste echte Datei aus dem Input-Feld
    if (fileInput.files.length) uploadDatei(fileInput.files[0]);
});

// 6. Datei an das Backend senden mit sofortiger JSON-Synchronisation
async function uploadDatei(echteDatei) {
    const formData = new FormData();
    formData.append('bild', echteDatei);

    try {
        const antwort = await fetch(API_BASE + '?action=galerie_upload', { method: 'POST', body: formData });
        const ergebnis = await antwort.json();

        // Ein unsichtbares Image-Objekt laden, um das exakte Format (Hochkant/Quer) zu ermitteln
        const tempImg = new Image();
        tempImg.src = bildUrl(ergebnis.pfad);

        tempImg.onload = async function() {
            let startBreite = 300;
            let startHoehe = Math.round((tempImg.naturalHeight / tempImg.naturalWidth) * startBreite);

            // Wir holen uns die frisch geschriebenen Daten von der Schnittstelle
            const frischAntwort = await fetch(API_BASE + '?action=galerie_list');
            lokaleDaten = await frischAntwort.json();

            // Wir aktualisieren den gerade erstellten Eintrag mit den korrekten Proportionsmaßen
            const aktuellerIndex = ergebnis.neuerIndex;
            if (lokaleDaten[aktuellerIndex]) {
                lokaleDaten[aktuellerIndex].breite = startBreite;
                lokaleDaten[aktuellerIndex].hoehe = startHoehe;
            }

            // Direkt wieder über die Schnittstelle speichern
            await fetch(API_BASE + '?action=galerie_save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(lokaleDaten)
            });

            // Spielfeld komplett frisch zeichnen
            renderCanvas();
        };
    } catch (f) {
        console.error("Upload- oder Sync-Fehler:", f);
        alert('Upload fehlgeschlagen');
    }
}

// 7. Löschmodus umschalten
if (deleteModeBtn) {
    deleteModeBtn.addEventListener('click', () => {
        loeschModusAktiv = !loeschModusAktiv;
        if (loeschModusAktiv) {
            deleteModeBtn.textContent = "Löschmodus: AN";
            deleteModeBtn.classList.add('aktiv');
            canvas.classList.add('delete-ready');
        } else {
            deleteModeBtn.textContent = "Löschmodus: AUS";
            deleteModeBtn.classList.remove('aktiv');
            canvas.classList.remove('delete-ready');
        }
    });
}

// 8. Alle Bilder global auf ein einheitliches Format anpassen
const landscapeBtn = document.getElementById('size-landscape-btn');
const portraitBtn = document.getElementById('size-portrait-btn');

if (landscapeBtn) landscapeBtn.addEventListener('click', () => anpassenGlobaleGroesse(400, 300));
if (portraitBtn) portraitBtn.addEventListener('click', () => anpassenGlobaleGroesse(300, 400));

function anpassenGlobaleGroesse(zielBreite, zielHoehe) {
    if(lokaleDaten.length === 0) return;
    
    lokaleDaten.forEach(daten => {
        daten.breite = zielBreite;
        daten.hoehe = zielHoehe;
    });
    renderCanvas();
}

// 9. Änderungen dauerhaft in data.json sichern
document.getElementById('save-btn').addEventListener('click', async () => {
    const antwort = await fetch(API_BASE + '?action=galerie_save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lokaleDaten)
    });
    if (antwort.ok) alert('Erfolgreich gespeichert!');
});

document.addEventListener('DOMContentLoaded', initialisieren);
