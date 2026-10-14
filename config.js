// =============================================
// NEON CELLE — Verbindung zur IONOS-Schnittstelle
// =============================================
// Die Webseite liegt auf GitHub (nur HTML/CSS/JS), die Datenbank ist aber
// nur von PHP aus erreichbar, das auf IONOS läuft. Darum ruft das
// JavaScript hier auf dieser Seite per fetch() EINE einzige Datei auf
// IONOS auf: api.php. Die bekommt per ?action=... gesagt, was sie tun soll.
//
// ➜ HIER EINTRAGEN: deine IONOS-Domain, OHNE Slash am Ende.
//   Beispiel: "https://ecclesia-celle.de"
const IONOS_DOMAIN = "https://DEINE-IONOS-DOMAIN.de";

// Die eine Schnittstelle. Aufruf immer als API_BASE + "?action=NAME"
const API_BASE = IONOS_DOMAIN + "/api.php";
const UPLOADS_BASE = IONOS_DOMAIN + "/";

// Macht aus einem relativen Bildpfad (z.B. "bilder/Bilder/xyz.jpg"), wie er
// in team.json/data.json gespeichert ist, eine volle URL zu IONOS — nötig,
// weil die Bilder auf IONOS liegen, die Seite aber von GitHub kommt.
function bildUrl(pfad) {
    if (!pfad) return '';
    if (pfad.startsWith('http://') || pfad.startsWith('https://')) return pfad;
    return UPLOADS_BASE + pfad;
}
