<?php
// =============================================
// NEON CELLE — JSON-Datei-Hilfsfunktionen
// =============================================

function lese_json_datei($pfad) {
    if (!file_exists($pfad)) return [];
    $inhalt = file_get_contents($pfad);
    $daten = json_decode($inhalt, true);
    return is_array($daten) ? $daten : [];
}

function schreibe_json_datei($pfad, $daten) {
    file_put_contents(
        $pfad,
        json_encode($daten, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
    );
}

// =============================================
// Wandelt eine DB-Zeile in genau die JSON-Form um, die das Frontend von
// früher (JSON-Dateien) her erwartet — so bleibt editor-script.js, team.js,
// lifeplan.js, faq.js etc. unverändert und merkt nicht, dass jetzt eine
// echte Datenbank statt einer JSON-Datei dahintersteckt.
// =============================================

function events_zeile_zu_json($zeile) {
    $ergebnis = [
        'title' => $zeile['titel'],
        'date' => $zeile['datum'],
        'time' => $zeile['uhrzeit'] ?? '',
        'type' => $zeile['typ'] ?? '',
        'desc' => $zeile['beschreibung'] ?? '',
    ];
    if (!empty($zeile['end_datum'])) $ergebnis['endDate'] = $zeile['end_datum'];
    if (!empty($zeile['link'])) $ergebnis['link'] = $zeile['link'];
    return $ergebnis;
}

function galerie_zeile_zu_json($zeile) {
    return [
        'bilderpfad' => $zeile['bilderpfad'],
        'beschreibung' => $zeile['beschreibung'] ?? '',
        'position' => ['x' => (int) $zeile['pos_x'], 'y' => (int) $zeile['pos_y']],
        'breite' => (int) $zeile['breite'],
        'hoehe' => (int) $zeile['hoehe'],
    ];
}

function team_zeile_zu_json($zeile) {
    return [
        'name' => $zeile['name'],
        'dabeiSeit' => $zeile['dabei_seit'] ?? '',
        'ueberMich' => $zeile['ueber_mich'] ?? '',
        'funFact' => $zeile['fun_fact'] ?? '',
        'instagram' => $zeile['instagram'] ?? '',
        'email' => $zeile['email'] ?? '',
        'image' => $zeile['bild'] ?? '',
    ];
}

function faq_zeile_zu_json($zeile) {
    return [
        'frage' => $zeile['frage'],
        'antwort' => $zeile['antwort'] ?? '',
    ];
}
