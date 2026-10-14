<?php
// =============================================
// NEON CELLE — Zentrale Konfiguration (PHP/IONOS)
// =============================================
// Diese Datei lädt jeder API-Endpunkt zuerst. Sie:
// 1) erlaubt Zugriffe von deiner GitHub-Seite (CORS),
// 2) liest die Datenbank-Zugangsdaten aus der .env-Datei,
// 3) stellt eine PDO-Verbindung + Hilfsfunktionen bereit.

// ---------- 1) CORS: Zugriff von der GitHub-Seite erlauben ----------
// '*' erlaubt JEDE Webseite. Wenn du es auf deine GitHub-Domain
// einschränken willst, ersetze '*' z.B. durch 'https://deinname.github.io'.
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Browser schickt vor POST-Requests mit JSON einen "Preflight"-Request
// (Methode OPTIONS). Den beantworten wir sofort leer und beenden das Skript.
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Verhindert, dass PHP-Fehlermeldungen (die z.B. Zugangsdaten verraten
// könnten) direkt im Browser/JSON landen.
ini_set('display_errors', '0');
error_reporting(E_ALL);

// ---------- 2) .env-Datei laden ----------
function lade_env($pfad) {
    if (!file_exists($pfad)) return;
    foreach (file($pfad, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $zeile) {
        $zeile = trim($zeile);
        if ($zeile === '' || strpos($zeile, '#') === 0) continue;
        if (strpos($zeile, '=') === false) continue;
        list($schluessel, $wert) = explode('=', $zeile, 2);
        $schluessel = trim($schluessel);
        $wert = trim($wert);
        if (getenv($schluessel) === false) {
            putenv("$schluessel=$wert");
            $_ENV[$schluessel] = $wert;
        }
    }
}

lade_env(__DIR__ . '/../.env');

define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_PORT', getenv('DB_PORT') ?: '3306');
define('DB_USER', getenv('DB_USER') ?: '');
define('DB_PASSWORD', getenv('DB_PASSWORD') ?: '');
define('DB_NAME', getenv('DB_NAME') ?: '');

// ---------- 3) Datenbank-Verbindung ----------
function get_pdo() {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = 'mysql:host=' . DB_HOST . ';port=' . DB_PORT . ';dbname=' . DB_NAME . ';charset=utf8mb4';
        $pdo = new PDO($dsn, DB_USER, DB_PASSWORD, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
    }
    return $pdo;
}

// Legt beim ersten Aufruf automatisch ALLE Tabellen an (Events, Team, FAQ,
// Galerie, Umfrage) — kein manuelles SQL-Importieren nötig. Wird einmal pro
// Request aufgerufen (sehr günstig wegen "IF NOT EXISTS").
function init_schema() {
    $pdo = get_pdo();

    // ---------- EVENTS ----------
    $pdo->exec("CREATE TABLE IF NOT EXISTS events (
        id INT AUTO_INCREMENT PRIMARY KEY,
        titel VARCHAR(255) NOT NULL,
        datum VARCHAR(50) NOT NULL,
        end_datum VARCHAR(50) NULL,
        uhrzeit VARCHAR(20) NULL,
        typ VARCHAR(50) NULL,
        beschreibung TEXT NULL,
        link VARCHAR(500) NULL,
        reihenfolge INT NOT NULL DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    // ---------- TEAM ----------
    $pdo->exec("CREATE TABLE IF NOT EXISTS team (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        dabei_seit VARCHAR(50) NULL,
        ueber_mich TEXT NULL,
        fun_fact TEXT NULL,
        instagram VARCHAR(255) NULL,
        email VARCHAR(255) NULL,
        bild VARCHAR(500) NULL,
        reihenfolge INT NOT NULL DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    // ---------- FAQ ----------
    $pdo->exec("CREATE TABLE IF NOT EXISTS faq (
        id INT AUTO_INCREMENT PRIMARY KEY,
        frage VARCHAR(500) NOT NULL,
        antwort TEXT NULL,
        reihenfolge INT NOT NULL DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    // ---------- GALERIE ----------
    $pdo->exec("CREATE TABLE IF NOT EXISTS galerie (
        id INT AUTO_INCREMENT PRIMARY KEY,
        bilderpfad VARCHAR(500) NOT NULL,
        beschreibung VARCHAR(500) NULL,
        pos_x INT NOT NULL DEFAULT 50,
        pos_y INT NOT NULL DEFAULT 50,
        breite INT NOT NULL DEFAULT 300,
        hoehe INT NOT NULL DEFAULT 200,
        reihenfolge INT NOT NULL DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $pdo->exec("CREATE TABLE IF NOT EXISTS umfrage (
        id INT AUTO_INCREMENT PRIMARY KEY,
        titel VARCHAR(255) NOT NULL,
        beschreibung TEXT NULL,
        custom_link VARCHAR(500) NULL,
        aktiv TINYINT(1) NOT NULL DEFAULT 1,
        erstellt_am DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $pdo->exec("CREATE TABLE IF NOT EXISTS umfrage_frage (
        id INT AUTO_INCREMENT PRIMARY KEY,
        umfrage_id INT NOT NULL,
        frage_text VARCHAR(500) NOT NULL,
        frage_typ ENUM('choice','checkbox','dropdown','text') NOT NULL,
        reihenfolge INT NOT NULL DEFAULT 0,
        FOREIGN KEY (umfrage_id) REFERENCES umfrage(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $pdo->exec("CREATE TABLE IF NOT EXISTS umfrage_option (
        id INT AUTO_INCREMENT PRIMARY KEY,
        frage_id INT NOT NULL,
        option_text VARCHAR(255) NOT NULL,
        reihenfolge INT NOT NULL DEFAULT 0,
        FOREIGN KEY (frage_id) REFERENCES umfrage_frage(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $pdo->exec("CREATE TABLE IF NOT EXISTS umfrage_antwort (
        id INT AUTO_INCREMENT PRIMARY KEY,
        umfrage_id INT NOT NULL,
        eingereicht_am DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (umfrage_id) REFERENCES umfrage(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $pdo->exec("CREATE TABLE IF NOT EXISTS umfrage_antwort_detail (
        id INT AUTO_INCREMENT PRIMARY KEY,
        antwort_id INT NOT NULL,
        frage_id INT NOT NULL,
        option_id INT NULL,
        freitext VARCHAR(1000) NULL,
        FOREIGN KEY (antwort_id) REFERENCES umfrage_antwort(id) ON DELETE CASCADE,
        FOREIGN KEY (frage_id) REFERENCES umfrage_frage(id) ON DELETE CASCADE,
        FOREIGN KEY (option_id) REFERENCES umfrage_option(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    // ---------- EINMALIGER IMPORT: alte JSON-Dateien -> Datenbank ----------
    // Falls eine Tabelle noch leer ist, aber die alte JSON-Datei existiert und
    // Einträge hat, werden diese einmalig übernommen. So gehen beim Umstieg
    // von JSON-Dateien auf echte Tabellen keine bereits eingegebenen Daten
    // (Events/Team/FAQ/Galerie) verloren.
    migriere_json_falls_leer($pdo, 'events', __DIR__ . '/../termine.json', function ($pdo, $eintrag, $i) {
        $stmt = $pdo->prepare('INSERT INTO events (titel, datum, end_datum, uhrzeit, typ, beschreibung, link, reihenfolge) VALUES (?,?,?,?,?,?,?,?)');
        $stmt->execute([
            $eintrag['title'] ?? '',
            $eintrag['date'] ?? '',
            $eintrag['endDate'] ?? null,
            $eintrag['time'] ?? null,
            $eintrag['type'] ?? null,
            $eintrag['desc'] ?? null,
            $eintrag['link'] ?? null,
            $i
        ]);
    });

    migriere_json_falls_leer($pdo, 'team', __DIR__ . '/../team.json', function ($pdo, $eintrag, $i) {
        $stmt = $pdo->prepare('INSERT INTO team (name, dabei_seit, ueber_mich, fun_fact, instagram, email, bild, reihenfolge) VALUES (?,?,?,?,?,?,?,?)');
        $stmt->execute([
            $eintrag['name'] ?? '',
            $eintrag['dabeiSeit'] ?? null,
            $eintrag['ueberMich'] ?? null,
            $eintrag['funFact'] ?? null,
            $eintrag['instagram'] ?? null,
            $eintrag['email'] ?? null,
            $eintrag['image'] ?? null,
            $i
        ]);
    });

    migriere_json_falls_leer($pdo, 'faq', __DIR__ . '/../faq.json', function ($pdo, $eintrag, $i) {
        $stmt = $pdo->prepare('INSERT INTO faq (frage, antwort, reihenfolge) VALUES (?,?,?)');
        $stmt->execute([$eintrag['frage'] ?? '', $eintrag['antwort'] ?? null, $i]);
    });

    migriere_json_falls_leer($pdo, 'galerie', __DIR__ . '/../data.json', function ($pdo, $eintrag, $i) {
        // Alte data.json-Testeinträge ohne "bilderpfad" (z.B. versehentliche
        // Event-Daten) werden beim Import übersprungen, nicht als Bild angelegt.
        if (empty($eintrag['bilderpfad'])) return;
        $stmt = $pdo->prepare('INSERT INTO galerie (bilderpfad, beschreibung, pos_x, pos_y, breite, hoehe, reihenfolge) VALUES (?,?,?,?,?,?,?)');
        $stmt->execute([
            $eintrag['bilderpfad'],
            $eintrag['beschreibung'] ?? null,
            $eintrag['position']['x'] ?? 50,
            $eintrag['position']['y'] ?? 50,
            $eintrag['breite'] ?? 300,
            $eintrag['hoehe'] ?? 200,
            $i
        ]);
    });
}

// Importiert die alte JSON-Datei EINMAL in die Tabelle $tabelle, aber nur
// wenn diese noch komplett leer ist (verhindert doppelten Import bei jedem
// Request). $einfueger($pdo, $eintrag, $index) fügt eine einzelne Zeile ein.
function migriere_json_falls_leer($pdo, $tabelle, $jsonPfad, $einfueger) {
    if (!file_exists($jsonPfad)) return;
    $anzahl = (int) $pdo->query("SELECT COUNT(*) AS n FROM `$tabelle`")->fetch()['n'];
    if ($anzahl > 0) return;

    $inhalt = file_get_contents($jsonPfad);
    $daten = json_decode($inhalt, true);
    if (!is_array($daten) || count($daten) === 0) return;

    foreach (array_values($daten) as $i => $eintrag) {
        if (!is_array($eintrag)) continue;
        $einfueger($pdo, $eintrag, $i);
    }
}

// Alter Funktionsname bleibt als Alias erhalten, falls irgendwo noch
// init_umfrage_schema() aufgerufen wird.
function init_umfrage_schema() {
    init_schema();
}

// Sendet eine JSON-Antwort und beendet das Skript
function json_antwort($daten, $code = 200) {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($daten);
    exit;
}

// Liest den rohen Request-Body als JSON-Array
function lese_json_body() {
    $raw = file_get_contents('php://input');
    $daten = json_decode($raw, true);
    return is_array($daten) ? $daten : [];
}

// Fängt unerwartete PHP-Fehler/Exceptions ab und gibt sie als JSON zurück,
// statt als HTML-Fehlerseite (die das JSON.parse() im Frontend sprengen würde).
set_exception_handler(function ($e) {
    json_antwort(['success' => false, 'error' => $e->getMessage()], 500);
});
