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
