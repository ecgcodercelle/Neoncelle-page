async function initialisiereNeonGalerie() {
    const galerieContainer = document.getElementById('bild-galerie');
    if (!galerieContainer) return;

    // CSS für die Pixelboxen dynamisch in den Head injizieren
    const style = document.createElement('style');
    style.textContent = `
        #bild-galerie {
            position: relative;
            width: 100%;
            margin-top: 40px;
            clear: both;
        }
        .galerie-item {
            position: absolute;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
            overflow: hidden;
            border-radius: 6px;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .galerie-item:hover {
            transform: scale(1.02);
            box-shadow: 0 8px 25px rgba(0, 242, 254, 0.3);
            z-index: 999;
        }
        .galerie-item img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
        }
    `;
    document.head.appendChild(style);

    try {
        // Lädt die Galerie-Daten live über die Schnittstelle (nicht mehr aus
        // einer lokalen data.json, damit Admin-Änderungen sofort sichtbar sind)
        const antwort = await fetch(API_BASE + '?action=galerie_list');
        if (!antwort.ok) throw new Error(`HTTP-Fehler! Status: ${antwort.status}`);

        const bilderDaten = await antwort.json();
        let maximaleHoehe = 0;

        // Bilder durchlaufen und absolut positionieren
        bilderDaten.forEach(daten => {
            daten.bilderpfad = bildUrl(daten.bilderpfad);
            const itemDiv = document.createElement('div');
            itemDiv.classList.add('galerie-item');

            itemDiv.style.left = `${daten.position.x}px`;
            itemDiv.style.top = `${daten.position.y}px`;
            itemDiv.style.width = `${daten.breite}px`;
            itemDiv.style.height = `${daten.hoehe}px`;

            const img = document.createElement('img');
            img.src = daten.bilderpfad;
            img.alt = daten.beschreibung || "Neon Celle Galerie";

            itemDiv.appendChild(img);
            galerieContainer.appendChild(itemDiv);

            // Unterkante berechnen, um die Sektionshöhe anzupassen
            const bildUnterkante = daten.position.y + daten.hoehe;
            if (bildUnterkante > maximaleHoehe) {
                maximaleHoehe = bildUnterkante;
            }
        });

        // Verhindert, dass der Footer nach oben rutscht
        galerieContainer.style.height = `${maximaleHoehe + 50}px`;

    } catch (fehler) {
        console.error("Fehler beim Laden der Neon-Galerie:", fehler);
    }
}

// Startet sauber, sobald das HTML bereit ist (Ohne Tippfehler am Ende!)
document.addEventListener('DOMContentLoaded', initialisiereNeonGalerie);
