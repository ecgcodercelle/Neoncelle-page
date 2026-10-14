const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { pool, initSchema } = require('./db');

const app = express();

// Erlaubt das Empfangen von JSON-Daten im Body
app.use(express.json());

// ==========================================
// FIXED: MIME-TYPE-REPARATUR FÜR DEIN DESIGN
// ==========================================
// Das zwingt den Server dazu, deine style.css mit dem richtigen Header (text/css) zu senden,
// sodass dein Browser das Design nicht mehr blockiert!
app.use(express.static(path.join(__dirname), {
    setHeaders: (res, filePath) => {
        if (path.extname(filePath).toLowerCase() === '.css') {
            res.setHeader('Content-Type', 'text/css; charset=UTF-8');
        }
    }
}));

// Konfiguration für deine Ordnerstruktur 'bilder/Bilder/'
const speicherOrt = path.join(__dirname, 'bilder', 'Bilder');
if (!fs.existsSync(speicherOrt)) {
    fs.mkdirSync(speicherOrt, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, speicherOrt),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toUpperCase(); // Endung zwingend groß (.JPG)
        cb(null, Date.now() + ext);
    }
});
const upload = multer({ storage });

// Hilfsfunktion: Liest deine data.json frisch aus
function leseFrischeDaten() {
    try {
        const dateiPfad = path.join(__dirname, 'data.json');
        if (!fs.existsSync(dateiPfad)) return [];
        const dateiInhalt = fs.readFileSync(dateiPfad, 'utf8');
        return JSON.parse(dateiInhalt || '[]');
    } catch (e) {
        console.error("Fehler beim Lesen der data.json:", e);
        return [];
    }
}

// Hilfsfunktion: Liest deine team.json frisch aus
function leseFrischeTeamDaten() {
    try {
        const teamPfad = path.join(__dirname, 'team.json');
        if (!fs.existsSync(teamPfad)) return [];
        const dateiInhalt = fs.readFileSync(teamPfad, 'utf8');
        return JSON.parse(dateiInhalt || '[]');
    } catch (e) {
        console.error("Fehler beim Lesen der team.json:", e);
        return [];
    }
}
// ==========================================
// DEINE BESTEHENDEN APIs (UNVERÄNDERT)
// ==========================================

app.get('/api/daten', (req, res) => {
    res.json(leseFrischeDaten());
});

app.post('/api/save', (req, res) => {
    const dateiPfad = path.join(__dirname, 'data.json');
    fs.writeFile(dateiPfad, JSON.stringify(req.body, null, 4), 'utf8', (err) => {
        if (err) return res.status(500).send('Fehler beim Speichern.');
        res.send('Erfolgreich gespeichert!');
    });
});

app.post('/api/upload', upload.single('bild'), (req, res) => {
    if (!req.file) return res.status(400).send('Keine Datei hochgeladen.');

    const relativerPfad = `bilder/Bilder/${req.file.filename}`;
    const aktuelleDaten = leseFrischeDaten();

    const neuerEintrag = {
        "bilderpfad": relativerPfad,
        "beschreibung": req.file.originalname,
        "position": { "x": 50, "y": 50 },
        "breite": 300,
        "hoehe": 200
    };

    aktuelleDaten.push(neuerEintrag);
    const dateiPfad = path.join(__dirname, 'data.json');
    fs.writeFileSync(dateiPfad, JSON.stringify(aktuelleDaten, null, 4), 'utf8');

    res.json({ 
        pfad: relativerPfad, 
        neuerIndex: aktuelleDaten.length - 1 
    });
});


// ==========================================
// APIs: TEAM VERWALTUNG (team.json)
// ==========================================

app.get('/api/team', (req, res) => {
    res.json(leseFrischeTeamDaten());
});

// FIXED: Erwartet nun 'bild' (upload.single('bild')) exakt synchron zu deiner admin-team.html
app.post('/api/team/save', upload.single('bild'), (req, res) => {
    let teamList = leseFrischeTeamDaten();
    const editIndex = parseInt(req.body.editIndex ?? -1);
    
    let imagePath = '';
    if (editIndex !== -1 && teamList[editIndex]) {
        imagePath = teamList[editIndex].image || ''; 
    }
    
    if (req.file) {
        if (editIndex !== -1 && teamList[editIndex] && teamList[editIndex].image) {
            const alterBildPfad = path.join(__dirname, teamList[editIndex].image);
            if (fs.existsSync(alterBildPfad)) {
                try { fs.unlinkSync(alterBildPfad); } catch(e) { console.error(e); }
            }
        }
        imagePath = `bilder/Bilder/${req.file.filename}`;
    }

    const memberData = {
        name: req.body.name || '',
        dabeiSeit: req.body.dabeiSeit || '',
        ueberMich: req.body.ueberMich || '',
        funFact: req.body.funFact || '',
        instagram: req.body.instagram || '',
        email: req.body.email || '',
        image: imagePath
    };

    if (editIndex === -1) {
        teamList.push(memberData); 
    } else {
        teamList[editIndex] = memberData; 
    }

    const teamPfad = path.join(__dirname, 'team.json');
    fs.writeFileSync(teamPfad, JSON.stringify(teamList, null, 4), 'utf8');
    res.json({ success: true, data: teamList });
});

app.post('/api/team/delete', (req, res) => {
    const index = parseInt(req.body.index);
    let teamList = leseFrischeTeamDaten();
    
    if (index >= 0 && teamList[index]) {
        if (teamList[index].image) {
            const bildPfad = path.join(__dirname, teamList[index].image);
            if (fs.existsSync(bildPfad)) {
                try { fs.unlinkSync(bildPfad); } catch(e) { console.error(e); }
            }
        }
        
        teamList.splice(index, 1);
        const teamPfad = path.join(__dirname, 'team.json');
        fs.writeFileSync(teamPfad, JSON.stringify(teamList, null, 4), 'utf8');
        res.json({ success: true, data: teamList });
    } else {
        res.status(400).json({ success: false, error: 'Eintrag nicht gefunden.' });
    }
});
// ==========================================
// FAQ-DATENBANK STEUERUNG (faq.json)
// ==========================================
const faqFilePath = path.join(__dirname, 'faq.json');

// Hilfsfunktion: Liest die faq.json frisch aus
function leseFrischeFaqDaten() {
    try {
        if (!fs.existsSync(faqFilePath)) return [];
        const dateiInhalt = fs.readFileSync(faqFilePath, 'utf8');
        return JSON.parse(dateiInhalt || '[]');
    } catch (e) {
        console.error("Fehler beim Lesen der faq.json:", e);
        return [];
    }
}

// 1. API: Holt alle FAQs ab
app.get('/api/faq', (req, res) => {
    res.json(leseFrischeFaqDaten());
});

// 2. API: Speichert oder editiert einen FAQ-Eintrag
app.post('/api/faq/save', (req, res) => {
    let faqList = leseFrischeFaqDaten();
    const editIndex = parseInt(req.body.editIndex ?? -1);

    const neueFaq = {
        frage: req.body.frage || '',
        antwort: req.body.antwort || ''
    };

    if (editIndex === -1) {
        faqList.push(neueFaq); // Neu hinzufügen
    } else {
        faqList[editIndex] = neueFaq; // Bestehenden Eintrag überschreiben
    }

    fs.writeFileSync(faqFilePath, JSON.stringify(faqList, null, 4), 'utf8');
    res.json({ success: true, data: faqList });
});

// 3. API: Löscht einen FAQ-Eintrag
app.post('/api/faq/delete', (req, res) => {
    const index = parseInt(req.body.index);
    let faqList = leseFrischeFaqDaten();
    
    if (index >= 0 && faqList[index]) {
        faqList.splice(index, 1);
        fs.writeFileSync(faqFilePath, JSON.stringify(faqList, null, 4), 'utf8');
        res.json({ success: true, data: faqList });
    } else {
        res.status(400).json({ success: false, error: 'Eintrag nicht gefunden.' });
    }
});
// ==========================================
// APIs: UMFRAGE / ABSTIMMUNG (IONOS-MySQL-Datenbank)
// ==========================================

// 1. Admin: neue Umfrage inkl. Fragen & Optionen anlegen
app.post('/api/umfrage/save', async (req, res) => {
    const { titel, beschreibung, custom_link, fragen } = req.body;
    if (!titel) return res.status(400).json({ success: false, error: 'Titel fehlt.' });

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [umfrageResult] = await conn.query(
            'INSERT INTO umfrage (titel, beschreibung, custom_link, aktiv) VALUES (?, ?, ?, 1)',
            [titel, beschreibung || null, custom_link || null]
        );
        const umfrageId = umfrageResult.insertId;

        if (Array.isArray(fragen)) {
            for (let i = 0; i < fragen.length; i++) {
                const frage = fragen[i];
                const [frageResult] = await conn.query(
                    'INSERT INTO umfrage_frage (umfrage_id, frage_text, frage_typ, reihenfolge) VALUES (?, ?, ?, ?)',
                    [umfrageId, frage.frage_text, frage.frage_typ, i]
                );
                const frageId = frageResult.insertId;

                if (frage.frage_typ !== 'text' && Array.isArray(frage.optionen)) {
                    for (let j = 0; j < frage.optionen.length; j++) {
                        await conn.query(
                            'INSERT INTO umfrage_option (frage_id, option_text, reihenfolge) VALUES (?, ?, ?)',
                            [frageId, frage.optionen[j], j]
                        );
                    }
                }
            }
        }

        await conn.commit();
        res.json({ success: true, id: umfrageId });
    } catch (err) {
        await conn.rollback();
        console.error('Fehler beim Speichern der Umfrage:', err);
        res.status(500).json({ success: false, error: err.message });
    } finally {
        conn.release();
    }
});

// 2. Liste aller Umfragen (für Admin-Übersicht)
app.get('/api/umfrage/liste', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT u.id, u.titel, u.beschreibung, u.custom_link, u.aktiv, u.erstellt_am,
                   (SELECT COUNT(*) FROM umfrage_antwort a WHERE a.umfrage_id = u.id) AS antworten
            FROM umfrage u
            ORDER BY u.erstellt_am DESC
        `);
        res.json(rows);
    } catch (err) {
        console.error('Fehler beim Laden der Umfragen:', err);
        res.status(500).json({ error: err.message });
    }
});

// 3. Eine Umfrage mit allen Fragen/Optionen laden (für die Teilnahme-Seite)
app.get('/api/umfrage/:id', async (req, res) => {
    try {
        const umfrageId = req.params.id;
        const [[umfrage]] = await pool.query('SELECT * FROM umfrage WHERE id = ?', [umfrageId]);
        if (!umfrage) return res.status(404).json({ error: 'Umfrage nicht gefunden.' });

        const [fragen] = await pool.query(
            'SELECT * FROM umfrage_frage WHERE umfrage_id = ? ORDER BY reihenfolge ASC',
            [umfrageId]
        );

        for (const frage of fragen) {
            const [optionen] = await pool.query(
                'SELECT * FROM umfrage_option WHERE frage_id = ? ORDER BY reihenfolge ASC',
                [frage.id]
            );
            frage.optionen = optionen;
        }

        res.json({ ...umfrage, fragen });
    } catch (err) {
        console.error('Fehler beim Laden der Umfrage:', err);
        res.status(500).json({ error: err.message });
    }
});

// 4. Aktivieren/Deaktivieren einer Umfrage
app.post('/api/umfrage/:id/toggle', async (req, res) => {
    try {
        await pool.query('UPDATE umfrage SET aktiv = NOT aktiv WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 5. Umfrage löschen (inkl. Fragen/Optionen/Antworten per CASCADE)
app.post('/api/umfrage/:id/delete', async (req, res) => {
    try {
        await pool.query('DELETE FROM umfrage WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 6. Antwort eines Jugendlichen speichern
// Erwartet: { antworten: [{ frage_id, option_id?, freitext? }, ...] }
app.post('/api/umfrage/:id/antwort', async (req, res) => {
    const umfrageId = req.params.id;
    const { antworten } = req.body;
    if (!Array.isArray(antworten) || antworten.length === 0) {
        return res.status(400).json({ success: false, error: 'Keine Antworten übermittelt.' });
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [antwortResult] = await conn.query(
            'INSERT INTO umfrage_antwort (umfrage_id) VALUES (?)',
            [umfrageId]
        );
        const antwortId = antwortResult.insertId;

        for (const eintrag of antworten) {
            await conn.query(
                'INSERT INTO umfrage_antwort_detail (antwort_id, frage_id, option_id, freitext) VALUES (?, ?, ?, ?)',
                [antwortId, eintrag.frage_id, eintrag.option_id || null, eintrag.freitext || null]
            );
        }

        await conn.commit();
        res.json({ success: true });
    } catch (err) {
        await conn.rollback();
        console.error('Fehler beim Speichern der Antwort:', err);
        res.status(500).json({ success: false, error: err.message });
    } finally {
        conn.release();
    }
});

// 7. Ergebnisse einer Umfrage (ausgezählt, für die Admin-Ansicht)
app.get('/api/umfrage/:id/ergebnis', async (req, res) => {
    try {
        const umfrageId = req.params.id;
        const [[umfrage]] = await pool.query('SELECT * FROM umfrage WHERE id = ?', [umfrageId]);
        if (!umfrage) return res.status(404).json({ error: 'Umfrage nicht gefunden.' });

        const [[{ gesamt }]] = await pool.query(
            'SELECT COUNT(*) AS gesamt FROM umfrage_antwort WHERE umfrage_id = ?',
            [umfrageId]
        );

        const [fragen] = await pool.query(
            'SELECT * FROM umfrage_frage WHERE umfrage_id = ? ORDER BY reihenfolge ASC',
            [umfrageId]
        );

        for (const frage of fragen) {
            if (frage.frage_typ === 'text') {
                const [texte] = await pool.query(
                    `SELECT freitext FROM umfrage_antwort_detail
                     WHERE frage_id = ? AND freitext IS NOT NULL AND freitext <> ''`,
                    [frage.id]
                );
                frage.freitexte = texte.map(t => t.freitext);
            } else {
                const [optionen] = await pool.query(
                    `SELECT o.id, o.option_text,
                            (SELECT COUNT(*) FROM umfrage_antwort_detail d WHERE d.option_id = o.id) AS anzahl
                     FROM umfrage_option o
                     WHERE o.frage_id = ?
                     ORDER BY o.reihenfolge ASC`,
                    [frage.id]
                );
                frage.optionen = optionen;
            }
        }

        res.json({ ...umfrage, teilnehmer: gesamt, fragen });
    } catch (err) {
        console.error('Fehler beim Laden der Ergebnisse:', err);
        res.status(500).json({ error: err.message });
    }
});

// HILFSFUNKTION FÜR DEINE EVENTS (KORRIGIERT AUF TERMINE.JSON)
function leseFrischeDaten() {
    try {
        const dateiPfad = path.join(__dirname, 'termine.json'); // Hier lag der Fehler!
        if (!fs.existsSync(dateiPfad)) return [];
        const dateiInhalt = fs.readFileSync(dateiPfad, 'utf8');
        return JSON.parse(dateiInhalt || '[]');
    } catch (e) {
        console.error("Fehler beim Lesen der termine.json:", e);
        return [];
    }
}


// Startet den Server auf Port 8000
initSchema()
    .then(() => {
        app.listen(8000, () => {
            console.log('===================================================');
            console.log('Neon-Server erfolgreich gestartet!');
            console.log('Hauptseite: http://localhost:8000/index.html');
            console.log('Editor:     http://localhost:8000/editor.html');
            console.log('Admin-Team: http://localhost:8000/admin-team.html');
            console.log('Umfrage:    http://localhost:8000/adminumfrag.html');
            console.log('===================================================');
        });
    })
    .catch((err) => {
        console.error('❌ Konnte keine Verbindung zur IONOS-Datenbank herstellen:', err.message);
        console.error('   Prüfe deine Zugangsdaten in der .env-Datei.');
        process.exit(1);
    });
