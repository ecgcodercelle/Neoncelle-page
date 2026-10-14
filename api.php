<?php
// =============================================================
// NEON CELLE — EINE zentrale Schnittstelle (api.php)
// =============================================================
// Die komplette Webseite (HTML/CSS/JS) liegt auf GitHub Pages.
// Diese EINE Datei liegt auf deinem IONOS-Webspace und ist die
// einzige Verbindung zur Datenbank/den Daten-Dateien.
//
// Das JavaScript im Frontend ruft sie immer so auf:
//   GET  api.php?action=NAME            -> Daten lesen
//   POST api.php?action=NAME            -> Daten schreiben (JSON-Body oder FormData)
//
// Alle Fach-Logik (Events, Team, FAQ, Galerie, Umfrage) steckt
// unten als einzelne Funktion — aber nach außen ist es nur diese
// EINE Adresse, die du per FTP auf IONOS hochlädst.
// =============================================================

require __DIR__ . '/api/config.php';
require __DIR__ . '/api/helpers.php';

$action = $_GET['action'] ?? $_POST['action'] ?? null;
if (!$action) {
    json_antwort(['error' => 'Keine action angegeben. Beispiel: api.php?action=events_list'], 400);
}

switch ($action) {

    // ---------- EVENTS (echte MySQL-Tabelle "events") ----------
    case 'events_list':
        init_schema();
        $stmt = get_pdo()->query('SELECT * FROM events ORDER BY reihenfolge ASC, id ASC');
        $events = array_map('events_zeile_zu_json', $stmt->fetchAll());
        json_antwort($events);
        break;

    case 'events_save':
        // Das Frontend schickt immer das KOMPLETTE Array (Ersetzen-Logik),
        // darum: Tabelle leeren und alle Einträge neu/in der gesendeten
        // Reihenfolge einfügen (in einer Transaktion).
        init_schema();
        $body = lese_json_body();
        $pdo = get_pdo();
        try {
            $pdo->beginTransaction();
            $pdo->exec('DELETE FROM events');
            $stmt = $pdo->prepare('INSERT INTO events (titel, datum, end_datum, uhrzeit, typ, beschreibung, link, reihenfolge) VALUES (?,?,?,?,?,?,?,?)');
            foreach (array_values($body) as $i => $ev) {
                if (!is_array($ev)) continue;
                $stmt->execute([
                    $ev['title'] ?? '',
                    $ev['date'] ?? '',
                    $ev['endDate'] ?? null,
                    $ev['time'] ?? null,
                    $ev['type'] ?? null,
                    $ev['desc'] ?? null,
                    $ev['link'] ?? null,
                    $i
                ]);
            }
            $pdo->commit();
            json_antwort(['success' => true]);
        } catch (Exception $e) {
            $pdo->rollBack();
            json_antwort(['success' => false, 'error' => $e->getMessage()], 500);
        }
        break;

    // ---------- GALERIE (echte MySQL-Tabelle "galerie") ----------
    case 'galerie_list':
        init_schema();
        $stmt = get_pdo()->query('SELECT * FROM galerie ORDER BY reihenfolge ASC, id ASC');
        $bilder = array_map('galerie_zeile_zu_json', $stmt->fetchAll());
        json_antwort($bilder);
        break;

    case 'galerie_save':
        // Auch hier schickt das Frontend immer das komplette Array.
        init_schema();
        $body = lese_json_body();
        $pdo = get_pdo();
        try {
            $pdo->beginTransaction();
            $pdo->exec('DELETE FROM galerie');
            $stmt = $pdo->prepare('INSERT INTO galerie (bilderpfad, beschreibung, pos_x, pos_y, breite, hoehe, reihenfolge) VALUES (?,?,?,?,?,?,?)');
            foreach (array_values($body) as $i => $bild) {
                if (!is_array($bild)) continue;
                $stmt->execute([
                    $bild['bilderpfad'] ?? '',
                    $bild['beschreibung'] ?? null,
                    $bild['position']['x'] ?? 50,
                    $bild['position']['y'] ?? 50,
                    $bild['breite'] ?? 300,
                    $bild['hoehe'] ?? 200,
                    $i
                ]);
            }
            $pdo->commit();
            json_antwort(['success' => true]);
        } catch (Exception $e) {
            $pdo->rollBack();
            json_antwort(['success' => false, 'error' => $e->getMessage()], 500);
        }
        break;

    case 'galerie_upload':
        init_schema();
        if (!isset($_FILES['bild']) || $_FILES['bild']['error'] !== UPLOAD_ERR_OK) {
            json_antwort(['error' => 'Keine gültige Datei hochgeladen.'], 400);
        }

        $speicherOrt = __DIR__ . '/bilder/Bilder/';
        if (!is_dir($speicherOrt)) mkdir($speicherOrt, 0755, true);

        $ext = strtoupper(pathinfo($_FILES['bild']['name'], PATHINFO_EXTENSION));
        $dateiname = (string) round(microtime(true) * 1000) . '.' . $ext;
        move_uploaded_file($_FILES['bild']['tmp_name'], $speicherOrt . $dateiname);

        $relativerPfad = 'bilder/Bilder/' . $dateiname;

        $pdo = get_pdo();
        $naechsteReihenfolge = (int) $pdo->query('SELECT COALESCE(MAX(reihenfolge), -1) + 1 AS n FROM galerie')->fetch()['n'];
        $stmt = $pdo->prepare('INSERT INTO galerie (bilderpfad, beschreibung, pos_x, pos_y, breite, hoehe, reihenfolge) VALUES (?,?,50,50,300,200,?)');
        $stmt->execute([$relativerPfad, $_FILES['bild']['name'], $naechsteReihenfolge]);

        // neuerIndex = Position in der Liste, wie sie "galerie_list" gleich zurückgeben wird
        $neuerIndex = (int) $pdo->query('SELECT COUNT(*) AS n FROM galerie')->fetch()['n'] - 1;

        json_antwort(['pfad' => $relativerPfad, 'neuerIndex' => $neuerIndex]);
        break;

    // ---------- TEAM (echte MySQL-Tabelle "team") ----------
    case 'team_list':
        init_schema();
        $stmt = get_pdo()->query('SELECT * FROM team ORDER BY reihenfolge ASC, id ASC');
        $teamList = array_map('team_zeile_zu_json', $stmt->fetchAll());
        json_antwort($teamList);
        break;

    case 'team_save':
        init_schema();
        $pdo = get_pdo();
        $editIndex = isset($_POST['editIndex']) ? intval($_POST['editIndex']) : -1;

        // Die Reihenfolge der zuletzt geladenen Liste entscheidet, welche
        // Zeile zu editIndex gehört (gleiche ORDER BY wie team_list).
        $teamRows = $pdo->query('SELECT * FROM team ORDER BY reihenfolge ASC, id ASC')->fetchAll();
        $bestehenderEintrag = ($editIndex !== -1 && isset($teamRows[$editIndex])) ? $teamRows[$editIndex] : null;

        $imagePath = $bestehenderEintrag['bild'] ?? '';

        if (isset($_FILES['bild']) && $_FILES['bild']['error'] === UPLOAD_ERR_OK) {
            if ($imagePath) {
                $alterPfad = __DIR__ . '/' . $imagePath;
                if (file_exists($alterPfad)) @unlink($alterPfad);
            }
            $speicherOrt = __DIR__ . '/bilder/Bilder/';
            if (!is_dir($speicherOrt)) mkdir($speicherOrt, 0755, true);
            $ext = strtoupper(pathinfo($_FILES['bild']['name'], PATHINFO_EXTENSION));
            $dateiname = (string) round(microtime(true) * 1000) . '.' . $ext;
            move_uploaded_file($_FILES['bild']['tmp_name'], $speicherOrt . $dateiname);
            $imagePath = 'bilder/Bilder/' . $dateiname;
        }

        $name = $_POST['name'] ?? '';
        $dabeiSeit = $_POST['dabeiSeit'] ?? '';
        $ueberMich = $_POST['ueberMich'] ?? '';
        $funFact = $_POST['funFact'] ?? '';
        $instagram = $_POST['instagram'] ?? '';
        $email = $_POST['email'] ?? '';

        if ($bestehenderEintrag) {
            $stmt = $pdo->prepare('UPDATE team SET name=?, dabei_seit=?, ueber_mich=?, fun_fact=?, instagram=?, email=?, bild=? WHERE id=?');
            $stmt->execute([$name, $dabeiSeit, $ueberMich, $funFact, $instagram, $email, $imagePath, $bestehenderEintrag['id']]);
        } else {
            $naechsteReihenfolge = (int) $pdo->query('SELECT COALESCE(MAX(reihenfolge), -1) + 1 AS n FROM team')->fetch()['n'];
            $stmt = $pdo->prepare('INSERT INTO team (name, dabei_seit, ueber_mich, fun_fact, instagram, email, bild, reihenfolge) VALUES (?,?,?,?,?,?,?,?)');
            $stmt->execute([$name, $dabeiSeit, $ueberMich, $funFact, $instagram, $email, $imagePath, $naechsteReihenfolge]);
        }

        $teamList = array_map('team_zeile_zu_json', $pdo->query('SELECT * FROM team ORDER BY reihenfolge ASC, id ASC')->fetchAll());
        json_antwort(['success' => true, 'data' => $teamList]);
        break;

    case 'team_delete':
        init_schema();
        $pdo = get_pdo();
        $body = lese_json_body();
        $index = isset($body['index']) ? intval($body['index']) : -1;

        $teamRows = $pdo->query('SELECT * FROM team ORDER BY reihenfolge ASC, id ASC')->fetchAll();

        if ($index >= 0 && isset($teamRows[$index])) {
            $eintrag = $teamRows[$index];
            if (!empty($eintrag['bild'])) {
                $bildPfad = __DIR__ . '/' . $eintrag['bild'];
                if (file_exists($bildPfad)) @unlink($bildPfad);
            }
            $pdo->prepare('DELETE FROM team WHERE id = ?')->execute([$eintrag['id']]);
            $teamList = array_map('team_zeile_zu_json', $pdo->query('SELECT * FROM team ORDER BY reihenfolge ASC, id ASC')->fetchAll());
            json_antwort(['success' => true, 'data' => $teamList]);
        } else {
            json_antwort(['success' => false, 'error' => 'Eintrag nicht gefunden.'], 400);
        }
        break;

    // ---------- FAQ (echte MySQL-Tabelle "faq") ----------
    case 'faq_list':
        init_schema();
        $stmt = get_pdo()->query('SELECT * FROM faq ORDER BY reihenfolge ASC, id ASC');
        $faqList = array_map('faq_zeile_zu_json', $stmt->fetchAll());
        json_antwort($faqList);
        break;

    case 'faq_save':
        init_schema();
        $pdo = get_pdo();
        $body = lese_json_body();
        $editIndex = isset($body['editIndex']) ? intval($body['editIndex']) : -1;
        $frage = $body['frage'] ?? '';
        $antwort = $body['antwort'] ?? '';

        $faqRows = $pdo->query('SELECT * FROM faq ORDER BY reihenfolge ASC, id ASC')->fetchAll();
        $bestehenderEintrag = ($editIndex !== -1 && isset($faqRows[$editIndex])) ? $faqRows[$editIndex] : null;

        if ($bestehenderEintrag) {
            $pdo->prepare('UPDATE faq SET frage=?, antwort=? WHERE id=?')->execute([$frage, $antwort, $bestehenderEintrag['id']]);
        } else {
            $naechsteReihenfolge = (int) $pdo->query('SELECT COALESCE(MAX(reihenfolge), -1) + 1 AS n FROM faq')->fetch()['n'];
            $pdo->prepare('INSERT INTO faq (frage, antwort, reihenfolge) VALUES (?,?,?)')->execute([$frage, $antwort, $naechsteReihenfolge]);
        }

        $faqList = array_map('faq_zeile_zu_json', $pdo->query('SELECT * FROM faq ORDER BY reihenfolge ASC, id ASC')->fetchAll());
        json_antwort(['success' => true, 'data' => $faqList]);
        break;

    case 'faq_delete':
        init_schema();
        $pdo = get_pdo();
        $body = lese_json_body();
        $index = isset($body['index']) ? intval($body['index']) : -1;

        $faqRows = $pdo->query('SELECT * FROM faq ORDER BY reihenfolge ASC, id ASC')->fetchAll();

        if ($index >= 0 && isset($faqRows[$index])) {
            $pdo->prepare('DELETE FROM faq WHERE id = ?')->execute([$faqRows[$index]['id']]);
            $faqList = array_map('faq_zeile_zu_json', $pdo->query('SELECT * FROM faq ORDER BY reihenfolge ASC, id ASC')->fetchAll());
            json_antwort(['success' => true, 'data' => $faqList]);
        } else {
            json_antwort(['success' => false, 'error' => 'Eintrag nicht gefunden.'], 400);
        }
        break;

    // ---------- UMFRAGE (echte MySQL-Tabellen) ----------
    case 'umfrage_save':
        init_schema();
        $body = lese_json_body();
        $titel = trim($body['titel'] ?? '');
        $beschreibung = $body['beschreibung'] ?? null;
        $custom_link = $body['custom_link'] ?? null;
        $fragen = $body['fragen'] ?? [];

        if ($titel === '') json_antwort(['success' => false, 'error' => 'Titel fehlt.'], 400);

        $pdo = get_pdo();
        try {
            $pdo->beginTransaction();

            $stmt = $pdo->prepare('INSERT INTO umfrage (titel, beschreibung, custom_link, aktiv) VALUES (?, ?, ?, 1)');
            $stmt->execute([$titel, $beschreibung ?: null, $custom_link ?: null]);
            $umfrageId = (int) $pdo->lastInsertId();

            if (is_array($fragen)) {
                foreach (array_values($fragen) as $i => $frage) {
                    $stmt = $pdo->prepare('INSERT INTO umfrage_frage (umfrage_id, frage_text, frage_typ, reihenfolge) VALUES (?, ?, ?, ?)');
                    $stmt->execute([$umfrageId, $frage['frage_text'], $frage['frage_typ'], $i]);
                    $frageId = (int) $pdo->lastInsertId();

                    if ($frage['frage_typ'] !== 'text' && isset($frage['optionen']) && is_array($frage['optionen'])) {
                        foreach (array_values($frage['optionen']) as $j => $optionText) {
                            $stmt = $pdo->prepare('INSERT INTO umfrage_option (frage_id, option_text, reihenfolge) VALUES (?, ?, ?)');
                            $stmt->execute([$frageId, $optionText, $j]);
                        }
                    }
                }
            }

            $pdo->commit();
            json_antwort(['success' => true, 'id' => $umfrageId]);
        } catch (Exception $e) {
            $pdo->rollBack();
            json_antwort(['success' => false, 'error' => $e->getMessage()], 500);
        }
        break;

    case 'umfrage_list':
        init_schema();
        $stmt = get_pdo()->query("
            SELECT u.id, u.titel, u.beschreibung, u.custom_link, u.aktiv, u.erstellt_am,
                   (SELECT COUNT(*) FROM umfrage_antwort a WHERE a.umfrage_id = u.id) AS antworten
            FROM umfrage u
            ORDER BY u.erstellt_am DESC
        ");
        json_antwort($stmt->fetchAll());
        break;

    case 'umfrage_get':
        init_schema();
        $id = intval($_GET['id'] ?? 0);
        $pdo = get_pdo();

        $stmt = $pdo->prepare('SELECT * FROM umfrage WHERE id = ?');
        $stmt->execute([$id]);
        $umfrage = $stmt->fetch();
        if (!$umfrage) json_antwort(['error' => 'Umfrage nicht gefunden.'], 404);

        $stmt = $pdo->prepare('SELECT * FROM umfrage_frage WHERE umfrage_id = ? ORDER BY reihenfolge ASC');
        $stmt->execute([$id]);
        $fragen = $stmt->fetchAll();

        foreach ($fragen as &$frage) {
            $stmt2 = $pdo->prepare('SELECT * FROM umfrage_option WHERE frage_id = ? ORDER BY reihenfolge ASC');
            $stmt2->execute([$frage['id']]);
            $frage['optionen'] = $stmt2->fetchAll();
        }
        unset($frage);

        $umfrage['fragen'] = $fragen;
        json_antwort($umfrage);
        break;

    case 'umfrage_toggle':
        init_schema();
        $id = intval($_GET['id'] ?? $_POST['id'] ?? 0);
        get_pdo()->prepare('UPDATE umfrage SET aktiv = NOT aktiv WHERE id = ?')->execute([$id]);
        json_antwort(['success' => true]);
        break;

    case 'umfrage_delete':
        init_schema();
        $id = intval($_GET['id'] ?? $_POST['id'] ?? 0);
        get_pdo()->prepare('DELETE FROM umfrage WHERE id = ?')->execute([$id]);
        json_antwort(['success' => true]);
        break;

    case 'umfrage_antwort':
        init_schema();
        $umfrageId = intval($_GET['id'] ?? 0);
        $body = lese_json_body();
        $antworten = $body['antworten'] ?? [];

        if (!is_array($antworten) || count($antworten) === 0) {
            json_antwort(['success' => false, 'error' => 'Keine Antworten übermittelt.'], 400);
        }

        $pdo = get_pdo();
        try {
            $pdo->beginTransaction();

            $stmt = $pdo->prepare('INSERT INTO umfrage_antwort (umfrage_id) VALUES (?)');
            $stmt->execute([$umfrageId]);
            $antwortId = (int) $pdo->lastInsertId();

            foreach ($antworten as $eintrag) {
                $stmt = $pdo->prepare('INSERT INTO umfrage_antwort_detail (antwort_id, frage_id, option_id, freitext) VALUES (?, ?, ?, ?)');
                $stmt->execute([
                    $antwortId,
                    $eintrag['frage_id'],
                    $eintrag['option_id'] ?? null,
                    $eintrag['freitext'] ?? null
                ]);
            }

            $pdo->commit();
            json_antwort(['success' => true]);
        } catch (Exception $e) {
            $pdo->rollBack();
            json_antwort(['success' => false, 'error' => $e->getMessage()], 500);
        }
        break;

    case 'umfrage_ergebnis':
        init_schema();
        $id = intval($_GET['id'] ?? 0);
        $pdo = get_pdo();

        $stmt = $pdo->prepare('SELECT * FROM umfrage WHERE id = ?');
        $stmt->execute([$id]);
        $umfrage = $stmt->fetch();
        if (!$umfrage) json_antwort(['error' => 'Umfrage nicht gefunden.'], 404);

        $stmt = $pdo->prepare('SELECT COUNT(*) AS gesamt FROM umfrage_antwort WHERE umfrage_id = ?');
        $stmt->execute([$id]);
        $gesamt = (int) $stmt->fetch()['gesamt'];

        $stmt = $pdo->prepare('SELECT * FROM umfrage_frage WHERE umfrage_id = ? ORDER BY reihenfolge ASC');
        $stmt->execute([$id]);
        $fragen = $stmt->fetchAll();

        foreach ($fragen as &$frage) {
            if ($frage['frage_typ'] === 'text') {
                $stmt2 = $pdo->prepare("SELECT freitext FROM umfrage_antwort_detail
                    WHERE frage_id = ? AND freitext IS NOT NULL AND freitext <> ''");
                $stmt2->execute([$frage['id']]);
                $frage['freitexte'] = array_column($stmt2->fetchAll(), 'freitext');
            } else {
                $stmt2 = $pdo->prepare("SELECT o.id, o.option_text,
                        (SELECT COUNT(*) FROM umfrage_antwort_detail d WHERE d.option_id = o.id) AS anzahl
                    FROM umfrage_option o
                    WHERE o.frage_id = ?
                    ORDER BY o.reihenfolge ASC");
                $stmt2->execute([$frage['id']]);
                $frage['optionen'] = $stmt2->fetchAll();
            }
        }
        unset($frage);

        $umfrage['teilnehmer'] = $gesamt;
        $umfrage['fragen'] = $fragen;
        json_antwort($umfrage);
        break;

    default:
        json_antwort(['error' => 'Unbekannte action: ' . $action], 400);
}
